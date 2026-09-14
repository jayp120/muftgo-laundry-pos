-- Rename Indonesian default services to English for EXISTING stores.
--
-- Why: stores created before 20260914000000_english_default_services_inr.sql
-- were seeded with Indonesian names ("Cuci Setrika Regular", "Setrika Saja").
-- The app displays service names straight from the database, so those shops
-- still see Indonesian in the POS even though all code is English-only now.
--
-- Safety: only rows matching the EXACT original seed names/descriptions are
-- touched, so owner-customized services are never renamed. Prices are left
-- untouched on purpose - only the owner should change selling prices.

UPDATE public.services
SET name = 'Wash & Iron Regular',
    description = 'Wash - Dry - Iron - Pack'
WHERE name = 'Cuci Setrika Regular';

UPDATE public.services
SET description = 'Quick wash within 24 hours'
WHERE name = 'Express Wash'
  AND description = 'Pencucian cepat dalam 24 jam';

UPDATE public.services
SET name = 'Ironing Only',
    description = 'Ironing and pressing only'
WHERE name = 'Setrika Saja';
