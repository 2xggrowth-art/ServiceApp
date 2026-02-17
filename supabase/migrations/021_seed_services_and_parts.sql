-- ============================================================
-- BCH Service Management - Seed Services & Parts from notebook
-- ============================================================
-- Deactivate any existing entries first, then insert fresh data
-- ============================================================

-- Soft-delete existing service options to start clean
UPDATE public.service_options SET is_active = false WHERE is_active = true;

-- ============================================================
-- SERVICES (4 types)
-- ============================================================
INSERT INTO public.service_options (type, name, price, sort_order) VALUES
  ('service', 'General Service',    250,  1),
  ('service', 'Major Service',     1100,  2),
  ('service', 'Strip Down Service', 2400, 3),
  ('service', 'Overhaul Service',   650,  4);

-- ============================================================
-- PARTS (60 items from notebook)
-- ============================================================
INSERT INTO public.service_options (type, name, price, sort_order) VALUES
  ('part', 'Break Wire',            150,  1),
  ('part', 'Gear Wire',             150,  2),
  ('part', 'Chain SS',              250,  3),
  ('part', 'Freewheel SS',          250,  4),
  ('part', 'Mudguard',              400,  5),
  ('part', 'Mudguard Clamp',         80,  6),
  ('part', 'Tyre 26T',              400,  7),
  ('part', 'Tube 26T',              300,  8),
  ('part', 'L Bow',                 100,  9),
  ('part', 'Break Pads',            300, 10),
  ('part', 'Break Shoes',           150, 11),
  ('part', 'Bearing Headset',       250, 12),
  ('part', 'Spokes (1pc)',           15, 13),
  ('part', 'RD',                   1280, 14),
  ('part', 'Shifter (1pc)',        1300, 15),
  ('part', 'Calliper',              700, 16),
  ('part', 'Break Lever Pair',      300, 17),
  ('part', 'Seat',                   450, 18),
  ('part', 'Crank',                 450, 19),
  ('part', 'Stand',                 450, 20),
  ('part', 'Bottom Set',            980, 21),
  ('part', 'Handle Bar MTB',        750, 22),
  ('part', 'Grippers',              200, 23),
  ('part', 'Rotor',                 550, 24),
  ('part', 'Rim Double Wall',      1100, 25),
  ('part', 'Chain Ring 7 Speed',    825, 26),
  ('part', 'Chain 8 Speed',         935, 27),
  ('part', 'Chain SS Premium',      350, 28),
  ('part', 'Bell',                  150, 29),
  ('part', 'Lock',                  250, 30),
  ('part', 'Bottle Holder',         200, 31),
  ('part', 'Pedal',                 350, 32),
  ('part', 'Pump',                  250, 33),
  ('part', 'Freewheel MS',          930, 34),
  ('part', 'Coset',                1300, 35),
  ('part', 'Freewheel Plate',       150, 36),
  ('part', 'Seat Quick Release',    350, 37),
  ('part', 'Seat Post',             350, 38),
  ('part', 'Chainwheel Cover',      250, 39),
  ('part', 'Chainwheel',           1200, 40),
  ('part', 'Seat Cover',            400, 41),
  ('part', 'Light with Horn',       450, 42),
  ('part', 'Back & Front Light',    450, 43),
  ('part', 'Handle Stem',           750, 44),
  ('part', 'Chainwheel SS',         500, 45),
  ('part', 'Carriers',             1100, 46),
  ('part', 'Side Wheel',            350, 47),
  ('part', 'Hub',                   950, 48),
  ('part', 'Headset',               780, 49),
  ('part', 'Helmet',                650, 50),
  ('part', 'Knee Pads',             300, 51),
  ('part', 'FD',                    750, 52),
  ('part', 'Suspension',           2500, 53),
  ('part', 'Tools',                 500, 54),
  ('part', 'Bar Tape',              850, 55),
  ('part', 'Tyre Linear',          1500, 56),
  ('part', 'Mobile Holder',         600, 57),
  ('part', 'Mirror',                 80, 58),
  ('part', 'Balls',                 250, 59),
  ('part', 'Gloves',                870, 60);
