# APP FLOW: A Day in the Life of Bharath Cycle Hub

This document outlines the exact workflow of the application as it is currently built. It follows a "Story Mode" format to demonstrate how different users interact with the system.

## The Story of a Service Job
**Scenario:**
- **Customer:** Rahul (Bike: Hero Splendor)
- **Service:** Regular Service + Oil Change
- **Staff:** Suresh (Front Desk)
- **Mechanic:** Mujju (Workshop)
- **Owner:** You (Manager)

---

### Step 1: The Arrival (Role: Support Staff)
**Goal:** Register the customer and bike.

1.  **Login:** Suresh opens the app. It defaults to the **"Support Staff"** role (simulated).
2.  **Screen:** He sees the **"Check In"** tab.
3.  **Action:**
    *   Enters Customer Name: **"Rahul"**.
    *   Enters Bike Model: **"Hero Splendor"**.
    *   Selects Service Type: **"Regular"** (Standard Price: ₹500).
    *   (Optional) Taps "Take Photo" to capture the bike's condition (simulated).
    *   Taps the big **"CHECK IN BIKE"** button.
4.  **System Logic:**
    *   The app instantly calculates which mechanic is free.
    *   It sees Mujju has the least workload.
    *   **Result:** Job created with status `ASSIGNED` to Mujju.

### Step 2: The Job (Role: Mechanic)
**Goal:** Execute the service and track time/parts.

1.  **View:** Mujju is at his bay. He switches the app to **"Mechanic"** role.
2.  **Screen:** He checks the **"Today"** tab.
3.  **Action:**
    *   He sees "Rahul - Hero Splendor" in his list.
    *   He taps the **"START"** button.
    *   **Result:** Timer starts ticking. Status updates to `IN_PROGRESS`.
4.  **Scenario - Need Parts:**
    *   Mujju realizes he needs a new **Oil Filter**.
    *   He taps **"Need Parts"** on the active screen.
    *   **Result:** Timer pauses. Status updates to `PARTS_PENDING`. A request is sent to the queue.

### Step 3: Parts Fulfillment (Role: Staff)
**Goal:** approve parts so work can continue.

1.  **View:** Suresh (Staff) sees a red badge on the **"Parts"** tab.
2.  **Action:**
    *   He opens the Parts tab and sees "Mujju needs parts for Rahul".
    *   He hands the Oil Filter to Mujju.
    *   He taps **"Parts Received"**.
3.  **System Logic:**
    *   Inventory count for "Oil Filter" decreases by 1.
    *   Job status reverts to `IN_PROGRESS`.
    *   Mujju gets a notification to resume work.

### Step 4: Completion (Role: Mechanic)
**Goal:** Finish the work.

1.  **View:** Mujju resumes the timer.
2.  **Action:**
    *   He finishes the service.
    *   He taps **"Add Part"** and selects "Oil Filter" to ensure it's billed.
    *   He taps **"COMPLETE JOB"**.
3.  **Result:**
    *   Timer stops.
    *   Because "Regular Service" requires verification, status moves to `QUALITY_CHECK`.

### Step 5: Quality Control (Role: Owner)
**Goal:** Ensure quality before delivery.

1.  **View:** You (Owner) open the app to the **"Dashboard"**.
2.  **Action:**
    *   You see a notification: "1 Job needs QC".
    *   You go to the **"Queue"** tab (or filter by QC).
    *   You inspect Rahul's bike physically.
    *   You tap **"QC Check"** -> **"Pass"**.
3.  **Result:**
    *   Status updates to `READY`.
    *   (Optional) A "WhatsApp" button appears to notify Rahul.

### Step 6: Pickup & Payment (Role: Staff)
**Goal:** Handover and collect payment.

1.  **Arrival:** Rahul comes to pick up his bike.
2.  **View:** Suresh opens the **"Pickup"** tab.
3.  **Action:**
    *   He sees Rahul's bike listed as "Ready".
    *   He taps the card to see the bill.
    *   **Bill Calculation:** ₹500 (Labor) + ₹X (Oil Filter Price) = **Total**.
    *   Rahul pays via UPI.
    *   Suresh selects **"UPI"** and taps **"PAYMENT RECEIVED"**.
4.  **Result:**
    *   Job is archived as `COMPLETED`.
    *   Revenue is added to the Owner's Daily Dashboard.

---

## Behind the Scenes: Data Logic

### 1. Auto-Assignment Engine
When a job is created, the app runs a scoring algorithm:
*   **Load Score:** -20 points for every job a mechanic already has.
*   **Time Score:** -10 points for every estimated hour of work queued.
*   **Role Score:** +15 points if the job type matches the mechanic's specialty (e.g., Senior Mech for Complex Repairs).
*   **Winner:** The mechanic with the highest score gets the job instantly.

### 2. Status Lifecycle
The job moves through these exact states in the database (`db.js`):
1.  `RECEIVED` (Initial)
2.  `ASSIGNED` (Allocated to Mech)
3.  `IN_PROGRESS` (Timer Running)
4.  `PARTS_PENDING` (Waiting for inventory)
5.  `QUALITY_CHECK` (Work done, waiting for approval)
6.  `READY` (Passed QC, waiting for customer)
7.  `COMPLETED` (Paid and delivered)

### 3. Incentive Calculation
For the mechanic's "My Stats" screen:
*   **On-Time Rate:** (Jobs finished within Estimated Time / Total Jobs) * 100.
*   **Incentive:** If On-Time Rate > 80%, calculate massive bonus (simulated logic: ₹1500).

---

This flow is currently active and testable in your browser.
