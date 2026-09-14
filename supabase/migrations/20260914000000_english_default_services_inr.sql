-- English (India) default services with INR pricing for new stores.
--
-- Why: create_store() previously seeded Indonesian names/descriptions
-- (Cuci Setrika Regular, etc.) with IDR-era prices. New stores must start
-- with English names and round INR prices matching DEFAULT_SERVICES in
-- src/hooks/useServices.ts. Existing stores are untouched.

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

  -- Seed default services so the POS is usable immediately.
  -- Keep these in sync with DEFAULT_SERVICES in src/hooks/useServices.ts.
  INSERT INTO public.services
    (store_id, name, description, category, unit_price, kilo_price, supports_unit, supports_kilo, duration_value, duration_unit, is_active)
  VALUES
    (new_store_id, 'Wash & Iron Regular', 'Wash - Dry - Iron - Pack', 'wash', 100, 60, true, true, 2, 'days', true),
    (new_store_id, 'Express Wash', 'Quick wash within 24 hours', 'wash', 150, 90, true, true, 1, 'days', true),
    (new_store_id, 'Ironing Only', 'Ironing and pressing only', 'ironing', 30, 20, true, true, 4, 'hours', true);

  RETURN new_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_store(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Creates a store for a laundry_owner and seeds 3 default services (English, INR) so the POS is usable immediately after signup.';
