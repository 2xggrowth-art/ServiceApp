-- ============================================================
-- BCH Service Management - Seed Data
-- Run AFTER 001_initial_schema.sql and 001b_rls_policies.sql
-- ============================================================

-- ============================================================
-- MECHANICS (5 team members with 4-digit PINs)
-- ============================================================
INSERT INTO public.users (name, phone, role, mechanic_level, avatar, color, status, pin_hash) VALUES
  ('Mujju', '+91-9876500001', 'mechanic', 'senior', 'M',  '#16a34a', 'on_duty', crypt('1234', gen_salt('bf'))),
  ('Appi',  '+91-9876500002', 'mechanic', 'senior', 'A',  '#2563eb', 'on_duty', crypt('2345', gen_salt('bf'))),
  ('Baba',  '+91-9876500003', 'mechanic', 'junior', 'B',  '#ea580c', 'on_duty', crypt('3456', gen_salt('bf'))),
  ('Mohan', '+91-9876500004', 'mechanic', 'junior', 'Mo', '#6b7280', 'on_duty', crypt('4567', gen_salt('bf'))),
  ('Iqbal', '+91-9876500005', 'mechanic', 'junior', 'I',  '#2563eb', 'on_duty', crypt('5678', gen_salt('bf')));

-- ============================================================
-- OWNER + ADMIN (will link to Supabase Auth accounts)
-- Run 013_link_auth_users.sql AFTER creating auth users
-- ============================================================
INSERT INTO public.users (name, email, role, avatar, color, status) VALUES
  ('BCH Owner', 'bch@gmail.com', 'owner', 'B', '#2563eb', 'on_duty'),
  ('Admin',     'admin@gmail.com', 'admin', 'A', '#16a34a', 'on_duty');

-- ============================================================
-- SUPPORT STAFF
-- ============================================================
INSERT INTO public.users (name, phone, role, avatar, color, status, pin_hash) VALUES
  ('Staff', '+91-9876500010', 'staff', 'S', '#6b7280', 'on_duty', crypt('0000', gen_salt('bf')));

-- ============================================================
-- SAMPLE CUSTOMERS
-- ============================================================
INSERT INTO public.customers (name, phone, visits) VALUES
  ('Rajesh Kumar',  '+91-9876543210', 3),
  ('Priya Sharma',  '+91-9876543211', 1),
  ('Ramesh Gupta',  '+91-9876543212', 5),
  ('Anita Patel',   '+91-9876543213', 2),
  ('Suresh Reddy',  '+91-9876543214', 1),
  ('Amit Verma',    '+91-9876543215', 4),
  ('Vikram Singh',  '+91-9876543216', 2),
  ('Arun Mehta',    '+91-9876543217', 1),
  ('Kavitha Nair',  '+91-9876543218', 3),
  ('Deepak Rao',    '+91-9876543219', 1);

-- ============================================================
-- PARTS INVENTORY
-- ============================================================
INSERT INTO public.parts (name, stock, price, reorder_at) VALUES
  ('Engine Oil (1L)',   15, 250, 5),
  ('Brake Pads (pair)', 8,  500, 3),
  ('Chain Lube',        12, 120, 4),
  ('Spark Plug',        20, 120, 5),
  ('Air Filter',        6,  150, 3),
  ('Oil Filter',        2,  180, 3),
  ('Clutch Cable',      3,  350, 2),
  ('Battery (12V)',     4,  850, 2),
  ('Brake Cable',       5,  280, 2),
  ('Tyre Tube',         10, 200, 4);
