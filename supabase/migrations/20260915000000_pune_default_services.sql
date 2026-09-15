-- Pune (India) default rate card for new stores.
--
-- Why: create_store() previously seeded 3 generic services
-- (Wash & Iron Regular, Express Wash, Ironing Only). Real Pune shops bill
-- per-piece (shirt iron, dry clean, blankets) and per-kg (wash & fold),
-- so new stores now start with a 16-item INR rate card matching
-- DEFAULT_SERVICES in src/hooks/useServices.ts. Existing stores are
-- untouched - owners add the card with one tap via Service Management
-- ("seed" skips names the store already has, so nothing duplicates).

CREATE OR REPLACE FUNCTION public.create_store(
  user_id UUID,
  store_name TEXT,
  store_description TEXT DEFAULT NULL,
  store_address TEXT DEFAULT NULL,
  store_phone TEXT DEFAULT NULL,
  store_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_store_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if user has permission to create stores
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = user_id;

  IF current_user_role != 'laundry_owner' THEN
    RAISE EXCEPTION 'Only laundry owners can create stores';
  END IF;

  INSERT INTO public.stores (name, description, address, phone, email, owner_id)
  VALUES (
    store_name,
    store_description,
    store_address,
    store_phone,
    store_email,
    user_id
  )
  RETURNING id INTO new_store_id;

  -- Seed Pune rate card so the POS is usable immediately.
  -- Keep these in sync with DEFAULT_SERVICES in src/hooks/useServices.ts.
  INSERT INTO public.services
    (store_id, name, description, category, unit_price, kilo_price, supports_unit, supports_kilo, duration_value, duration_unit, is_active)
  VALUES
    (new_store_id, 'Wash & Fold', 'Wash, dry & neatly folded', 'wash', NULL, 70, false, true, 2, 'days', true),
    (new_store_id, 'Wash & Iron', 'Wash - Dry - Iron - Pack', 'wash', NULL, 90, false, true, 2, 'days', true),
    (new_store_id, 'Express Wash & Iron (24 hr)', 'Ready in 24 hours', 'wash', NULL, 140, false, true, 1, 'days', true),
    (new_store_id, 'Shirt Iron', 'Press only', 'ironing', 15, NULL, true, false, 1, 'days', true),
    (new_store_id, 'Pant Iron', 'Press only', 'ironing', 15, NULL, true, false, 1, 'days', true),
    (new_store_id, 'Kurta Iron', 'Press only', 'ironing', 25, NULL, true, false, 1, 'days', true),
    (new_store_id, 'Saree Iron', 'Iron with starch finish', 'ironing', 60, NULL, true, false, 1, 'days', true),
    (new_store_id, 'Shirt Dry Clean', 'Dry clean - Press - Pack', 'dry', 99, NULL, true, false, 3, 'days', true),
    (new_store_id, 'Pant Dry Clean', 'Dry clean - Press - Pack', 'dry', 99, NULL, true, false, 3, 'days', true),
    (new_store_id, 'Suit Dry Clean (2 Pc)', 'Coat + pant dry clean', 'dry', 299, NULL, true, false, 3, 'days', true),
    (new_store_id, 'Saree Dry Clean', 'Silk & fancy sarees', 'dry', 249, NULL, true, false, 4, 'days', true),
    (new_store_id, 'Blanket Single', 'Single bed blanket / razai', 'dry', 299, NULL, true, false, 4, 'days', true),
    (new_store_id, 'Blanket Double / Quilt', 'Double bed blanket / quilt', 'dry', 449, NULL, true, false, 4, 'days', true),
    (new_store_id, 'Curtain (Per Panel)', 'Per curtain panel', 'dry', 79, NULL, true, false, 3, 'days', true),
    (new_store_id, 'Shoes Wash', 'Deep clean & deodorise', 'special', 199, NULL, true, false, 3, 'days', true),
    (new_store_id, 'School Bag / Backpack Wash', 'Wash & dry', 'special', 149, NULL, true, false, 3, 'days', true);

  RETURN new_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_store(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Creates a store for a laundry_owner and seeds the 16-item Pune rate card (INR) so the POS is usable immediately after signup.';
