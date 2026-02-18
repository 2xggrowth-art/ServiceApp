// ============================================================
// BCH Service — Google Sheets Sync Handler
//
// UPSERT: finds existing row by Job ID and updates it,
// or inserts a new row if the job doesn't exist yet.
// Data is organised into monthly tabs (e.g. "Feb 2026").
//
// SETUP:
// 1. Open your Google Spreadsheet
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file, save
// 4. Click Deploy > New Deployment > Web App
// 5. Execute as: "Me", Who has access: "Anyone"
// 6. Copy the web app URL
// 7. Paste into your .env as VITE_GOOGLE_SHEETS_URL=<url>
//
// IMPORTANT: After updating this script, you must create a
// NEW deployment (Deploy > Manage Deployments > New) for
// changes to take effect on the live URL.
// ============================================================

var HEADERS = [
  'Job ID',
  'Date',
  'Customer Name',
  'Customer Phone',
  'Bike',
  'Service Type',
  'Services',
  'Issue',
  'Priority',
  'Status',
  'Mechanic',
  'Est. Min',
  'Actual Min',
  'Parts Used',
  'Parts Needed',
  'Labor (Rs)',
  'Total Cost (Rs)',
  'Payment Method',
  'QC Status',
  'Time Block',
  'Created At',
  'Started At',
  'Completed At',
  'Paid At',
  'Last Updated'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var records = Array.isArray(data) ? data : [data];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var updated = 0;
    var inserted = 0;

    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var sheetName = getMonthTabName(record.date || record.createdAt);
      var sheet = getOrCreateSheet(ss, sheetName);
      ensureHeaders(sheet);
      var result = upsertRow(sheet, record);
      if (result === 'updated') updated++;
      else inserted++;
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, updated: updated, inserted: inserted }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Returns "Feb 2026" from an ISO date string or date like "2026-02-18"
function getMonthTabName(dateStr) {
  var d;
  if (!dateStr) {
    d = new Date();
  } else if (dateStr.length === 10) {
    // "2026-02-18" format — parse as local date
    var parts = dateStr.split('-');
    d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    d = new Date(dateStr);
  }
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headerRow = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRow.setValues([HEADERS]);
    headerRow.setFontWeight('bold');
    headerRow.setBackground('#1f2937');
    headerRow.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 130);
    }
    sheet.setColumnWidth(3, 180);  // Customer Name
    sheet.setColumnWidth(5, 180);  // Bike
    sheet.setColumnWidth(14, 250); // Parts Used
  }
}

// Find existing row by Job ID (column A) and update, or append new row
function upsertRow(sheet, r) {
  var row = buildRow(r);
  var jobId = String(r.id || '');
  var existingRowNum = findRowByJobId(sheet, jobId);

  if (existingRowNum > 0) {
    // Update existing row
    sheet.getRange(existingRowNum, 1, 1, row.length).setValues([row]);
    return 'updated';
  } else {
    // Insert new row
    sheet.appendRow(row);
    // Alternate row shading
    var lastRow = sheet.getLastRow();
    if (lastRow % 2 === 0) {
      sheet.getRange(lastRow, 1, 1, HEADERS.length).setBackground('#f9fafb');
    }
    return 'inserted';
  }
}

// Search column A (Job ID) for a matching ID
function findRowByJobId(sheet, jobId) {
  if (!jobId) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1; // Only header or empty

  var ids = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 1; i < ids.length; i++) { // skip header row
    if (String(ids[i][0]) === jobId) {
      return i + 1; // 1-based row number
    }
  }
  return -1;
}

function buildRow(r) {
  var partsUsed = '';
  if (Array.isArray(r.partsUsed)) {
    partsUsed = r.partsUsed.map(function(p) {
      return p.name + ' x' + (p.qty || 1) + ' @ Rs' + p.price;
    }).join('; ');
  }

  var partsNeeded = '';
  if (Array.isArray(r.partsNeeded)) {
    partsNeeded = r.partsNeeded.map(function(p) { return p.name; }).join('; ');
  }

  var services = Array.isArray(r.services) ? r.services.join(', ') : '';

  return [
    r.id || '',
    r.date || '',
    r.customerName || '',
    r.customerPhone || '',
    r.bike || '',
    r.serviceType || '',
    services,
    r.issue || '',
    r.priority || '',
    r.status || '',
    r.mechanicName || '',
    r.estimatedMin || '',
    r.actualMin || '',
    partsUsed,
    partsNeeded,
    r.laborCharge || '',
    r.totalCost || '',
    r.paymentMethod || '',
    r.qcStatus || '',
    r.timeBlock || '',
    r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
    r.startedAt ? new Date(r.startedAt).toLocaleString('en-IN') : '',
    r.completedAt ? new Date(r.completedAt).toLocaleString('en-IN') : '',
    r.paidAt ? new Date(r.paidAt).toLocaleString('en-IN') : '',
    new Date().toLocaleString('en-IN')  // Last Updated timestamp
  ];
}

// Health check
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'BCH Sheets Sync active (upsert mode)' }))
    .setMimeType(ContentService.MimeType.JSON);
}
