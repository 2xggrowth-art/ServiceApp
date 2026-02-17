import type { Mechanic, Customer, Part, Job, Bike } from '../types';

export const MECHANICS: Mechanic[] = [
  { id: 'mujju', name: 'Mujju', role: 'senior', phone: '+91-9876500001', avatar: 'M',  color: '#16a34a', status: 'on_duty' },
  { id: 'appi',  name: 'Appi',  role: 'senior', phone: '+91-9876500002', avatar: 'A',  color: '#2563eb', status: 'on_duty' },
  { id: 'baba',  name: 'Baba',  role: 'junior', phone: '+91-9876500003', avatar: 'B',  color: '#ea580c', status: 'on_duty' },
  { id: 'mohan', name: 'Mohan', role: 'junior', phone: '+91-9876500004', avatar: 'Mo', color: '#6b7280', status: 'on_duty' },
  { id: 'iqbal', name: 'Iqbal', role: 'junior', phone: '+91-9876500005', avatar: 'I',  color: '#2563eb', status: 'on_duty' },
];

export const CUSTOMERS: Customer[] = [];

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

export const MOCK_BIKES: Bike[] = [];

export const INITIAL_JOBS: Job[] = [];
