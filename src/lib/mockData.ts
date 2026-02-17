import { STATUS } from './constants';
import { getToday } from './helpers';
import type { Mechanic, Customer, Part, Job, Bike } from '../types';

export const MECHANICS: Mechanic[] = [
  { id: 'mujju', name: 'Mujju', role: 'senior', phone: '+91-9876500001', avatar: 'M',  color: '#16a34a', status: 'on_duty' },
  { id: 'appi',  name: 'Appi',  role: 'senior', phone: '+91-9876500002', avatar: 'A',  color: '#2563eb', status: 'on_duty' },
  { id: 'baba',  name: 'Baba',  role: 'junior', phone: '+91-9876500003', avatar: 'B',  color: '#ea580c', status: 'on_duty' },
  { id: 'mohan', name: 'Mohan', role: 'junior', phone: '+91-9876500004', avatar: 'Mo', color: '#6b7280', status: 'on_duty' },
  { id: 'iqbal', name: 'Iqbal', role: 'junior', phone: '+91-9876500005', avatar: 'I',  color: '#2563eb', status: 'on_duty' },
];

export const CUSTOMERS: Customer[] = [
  { id: 1,  name: 'Rajesh Kumar',  phone: '+91-9876543210', visits: 3 },
  { id: 2,  name: 'Priya Sharma',  phone: '+91-9876543211', visits: 1 },
  { id: 3,  name: 'Ramesh Gupta',  phone: '+91-9876543212', visits: 5 },
  { id: 4,  name: 'Anita Patel',   phone: '+91-9876543213', visits: 2 },
  { id: 5,  name: 'Suresh Reddy',  phone: '+91-9876543214', visits: 1 },
  { id: 6,  name: 'Amit Verma',    phone: '+91-9876543215', visits: 4 },
  { id: 7,  name: 'Vikram Singh',  phone: '+91-9876543216', visits: 2 },
  { id: 8,  name: 'Arun Mehta',    phone: '+91-9876543217', visits: 1 },
  { id: 9,  name: 'Kavitha Nair',  phone: '+91-9876543218', visits: 3 },
  { id: 10, name: 'Deepak Rao',    phone: '+91-9876543219', visits: 1 },
];

export const PARTS: Part[] = [
  { id: 1,  name: 'Break Wire',         stock: 20, price: 150,  reorderAt: 5 },
  { id: 2,  name: 'Gear Wire',          stock: 20, price: 150,  reorderAt: 5 },
  { id: 3,  name: 'Chain SS',           stock: 10, price: 250,  reorderAt: 3 },
  { id: 4,  name: 'Freewheel SS',       stock: 8,  price: 250,  reorderAt: 3 },
  { id: 5,  name: 'Mudguard',           stock: 6,  price: 400,  reorderAt: 2 },
  { id: 6,  name: 'Tyre 26T',           stock: 10, price: 400,  reorderAt: 3 },
  { id: 7,  name: 'Tube 26T',           stock: 15, price: 300,  reorderAt: 5 },
  { id: 8,  name: 'Break Pads',         stock: 12, price: 300,  reorderAt: 4 },
  { id: 9,  name: 'RD',                 stock: 3,  price: 1280, reorderAt: 2 },
  { id: 10, name: 'Shifter (1pc)',      stock: 4,  price: 1300, reorderAt: 2 },
  { id: 11, name: 'Seat',               stock: 5,  price: 450,  reorderAt: 2 },
  { id: 12, name: 'Pedal',              stock: 8,  price: 350,  reorderAt: 3 },
  { id: 13, name: 'Chainwheel',         stock: 3,  price: 1200, reorderAt: 2 },
  { id: 14, name: 'Hub',                stock: 4,  price: 950,  reorderAt: 2 },
  { id: 15, name: 'Suspension',         stock: 2,  price: 2500, reorderAt: 1 },
];

export const MOCK_BIKES: Bike[] = [
  { id: 'bike-1', customerId: '1', bikeModel: 'Hero Splendor Plus 2022', registrationNumber: 'KA-01-AB-1234', notes: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'bike-2', customerId: '2', bikeModel: 'Royal Enfield Classic 350', registrationNumber: 'KA-01-CD-5678', notes: null, createdAt: '2026-01-02T00:00:00Z' },
  { id: 'bike-3', customerId: '3', bikeModel: 'Honda CB Shine 2020', registrationNumber: 'KA-02-EF-9012', notes: null, createdAt: '2026-01-03T00:00:00Z' },
  { id: 'bike-4', customerId: '4', bikeModel: 'Bajaj Pulsar 150', registrationNumber: 'KA-03-GH-3456', notes: null, createdAt: '2026-01-04T00:00:00Z' },
  { id: 'bike-5', customerId: '5', bikeModel: 'TVS Apache RTR 160', registrationNumber: 'KA-04-IJ-7890', notes: null, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'bike-6', customerId: '6', bikeModel: 'Suzuki Gixxer SF', registrationNumber: null, notes: null, createdAt: '2026-01-06T00:00:00Z' },
  { id: 'bike-7', customerId: '7', bikeModel: 'Yamaha FZ S V3', registrationNumber: null, notes: null, createdAt: '2026-01-07T00:00:00Z' },
  { id: 'bike-8', customerId: '8', bikeModel: 'Honda Activa 6G', registrationNumber: 'KA-05-KL-2345', notes: null, createdAt: '2026-01-08T00:00:00Z' },
  { id: 'bike-9', customerId: '9', bikeModel: 'Honda Activa 125', registrationNumber: 'KA-06-MN-6789', notes: null, createdAt: '2026-01-09T00:00:00Z' },
  { id: 'bike-10', customerId: '10', bikeModel: 'Bajaj CT 110', registrationNumber: null, notes: null, createdAt: '2026-01-10T00:00:00Z' },
];

const today = getToday();

export const INITIAL_JOBS: Job[] = [
  {
    id: 1, customerName: 'Rajesh Kumar', customerPhone: '+91-9876543210',
    bike: 'Hero Splendor Plus 2022', serviceType: 'regular',
    issue: 'Chain noise, brake adjustment', mechanicId: 'mujju',
    status: STATUS.COMPLETED, priority: 'standard',
    estimatedMin: 45, actualMin: 38, date: today, timeBlock: 'morning',
    partsUsed: [{ name: 'Chain lube', qty: 1, price: 120 }, { name: 'Brake pads', qty: 1, price: 500 }],
    totalCost: 1120, startedAt: `${today}T09:00:00`, completedAt: `${today}T09:38:00`,
    paymentMethod: 'cash', paidAt: `${today}T10:00:00`, createdAt: `${today}T08:45:00`,
  },
  {
    id: 2, customerName: 'Anita Patel', customerPhone: '+91-9876543213',
    bike: 'Bajaj Pulsar 150', serviceType: 'insurance',
    issue: '6-month service due', mechanicId: 'mujju',
    status: STATUS.COMPLETED, priority: 'standard',
    estimatedMin: 30, actualMin: 25, date: today, timeBlock: 'morning',
    partsUsed: [{ name: 'Oil', qty: 1, price: 250 }, { name: 'Air filter', qty: 1, price: 150 }],
    totalCost: 400, startedAt: `${today}T09:45:00`, completedAt: `${today}T10:10:00`,
    paymentMethod: 'upi', paidAt: `${today}T10:30:00`, createdAt: `${today}T09:30:00`,
  },
  {
    id: 3, customerName: 'Ramesh Gupta', customerPhone: '+91-9876543212',
    bike: 'Honda CB Shine 2020', serviceType: 'repair',
    issue: 'Engine starting problem, electrical check', mechanicId: 'mujju',
    status: STATUS.IN_PROGRESS, priority: 'urgent',
    estimatedMin: 90, actualMin: null, date: today, timeBlock: 'morning',
    partsUsed: [{ name: 'Spark plug', qty: 1, price: 120 }],
    totalCost: null, startedAt: `${today}T10:30:00`, completedAt: null, createdAt: `${today}T10:15:00`,
  },
  {
    id: 4, customerName: 'Priya Sharma', customerPhone: '+91-9876543211',
    bike: 'Royal Enfield Classic 350', serviceType: 'makeover',
    issue: 'Full restoration requested', mechanicId: 'appi',
    status: STATUS.PARTS_PENDING, priority: 'standard',
    estimatedMin: 240, actualMin: null, date: today, timeBlock: 'afternoon',
    partsUsed: [], partsNeeded: [{ name: 'Oil Filter', status: 'pending' }],
    totalCost: null, startedAt: null, completedAt: null, createdAt: `${today}T08:00:00`,
  },
  {
    id: 5, customerName: 'Suresh Reddy', customerPhone: '+91-9876543214',
    bike: 'TVS Apache RTR 160', serviceType: 'regular',
    issue: 'Regular maintenance', mechanicId: 'mujju',
    status: STATUS.ASSIGNED, priority: 'standard',
    estimatedMin: 45, actualMin: null, date: today, timeBlock: 'afternoon',
    partsUsed: [], totalCost: null, startedAt: null, completedAt: null, createdAt: `${today}T11:00:00`,
  },
  {
    id: 6, customerName: 'Amit Verma', customerPhone: '+91-9876543215',
    bike: 'Suzuki Gixxer SF', serviceType: 'repair',
    issue: 'Chain noise + brake check', mechanicId: 'appi',
    status: STATUS.ASSIGNED, priority: 'standard',
    estimatedMin: 90, actualMin: null, date: today, timeBlock: 'afternoon',
    partsUsed: [], totalCost: null, startedAt: null, completedAt: null, createdAt: `${today}T11:30:00`,
  },
  {
    id: 7, customerName: 'Kavitha Nair', customerPhone: '+91-9876543218',
    bike: 'Honda Activa 125', serviceType: 'repair',
    issue: 'Starting problem', mechanicId: 'iqbal',
    status: STATUS.IN_PROGRESS, priority: 'standard',
    estimatedMin: 60, actualMin: null, date: today, timeBlock: 'morning',
    partsUsed: [], totalCost: null, startedAt: `${today}T10:00:00`, completedAt: null, createdAt: `${today}T09:45:00`,
  },
  {
    id: 8, customerName: 'Deepak Rao', customerPhone: '+91-9876543219',
    bike: 'Honda Activa 6G', serviceType: 'regular',
    issue: 'Regular service', mechanicId: 'iqbal',
    status: STATUS.ASSIGNED, priority: 'standard',
    estimatedMin: 30, actualMin: null, date: today, timeBlock: 'afternoon',
    partsUsed: [], totalCost: null, startedAt: null, completedAt: null, createdAt: `${today}T11:15:00`,
  },
  {
    id: 9, customerName: 'Ravi Shankar', customerPhone: '+91-9876543220',
    bike: 'Hero HF Deluxe', serviceType: 'regular',
    issue: 'Clutch wire + brake pad change', mechanicId: 'mohan',
    status: STATUS.IN_PROGRESS, priority: 'standard',
    estimatedMin: 45, actualMin: null, date: today, timeBlock: 'morning',
    partsUsed: [], totalCost: null, startedAt: `${today}T09:30:00`, completedAt: null, createdAt: `${today}T09:15:00`,
  },
  {
    id: 10, customerName: 'Prakash Jain', customerPhone: '+91-9876543221',
    bike: 'Bajaj CT 110', serviceType: 'insurance',
    issue: '3-month checkup', mechanicId: 'baba',
    status: STATUS.QUALITY_CHECK, priority: 'standard',
    estimatedMin: 30, actualMin: 28, date: today, timeBlock: 'morning',
    partsUsed: [{ name: 'Oil', qty: 1, price: 200 }],
    totalCost: 200, startedAt: `${today}T09:00:00`, completedAt: `${today}T09:28:00`, createdAt: `${today}T08:50:00`,
  },
];
