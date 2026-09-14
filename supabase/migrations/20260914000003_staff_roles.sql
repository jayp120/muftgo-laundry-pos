-- Staff roles: owner (superadmin) + manager / counter / worker.
--
-- Why: the old model only had laundry_owner + staff, so every staff member
-- was either all-powerful or one-size-fits-all. New model:
--   owner   - superadmin, full access, created ONLY via public signup
--   manager - runs the shop (billing, services, expenses, reports)
--   counter - minimal billing (POS, orders+payments, customers)
--   worker  - floor only (order status updates, no payments)
--
-- The role column is free TEXT (no CHECK constraint, create_user takes TEXT),
-- so only data needs renaming. Frontend normalizes legacy values anyway.

UPDATE public.users SET role = 'owner' WHERE role = 'laundry_owner';
UPDATE public.users SET role = 'counter' WHERE role = 'staff';
