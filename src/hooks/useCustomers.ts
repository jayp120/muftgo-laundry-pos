import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineDb } from '@/lib/offlineDb';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  store_id?: string;
  created_at: string;
  updated_at: string;
}

const filterCachedCustomers = (customers: Customer[], query: string): Customer[] => {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];
  return customers.filter(
    (c) => (c?.name || '').toLowerCase().includes(q) || (c?.phone || '').toLowerCase().includes(q)
  );
};

const sanitizeLikeQuery = (s: string): string => {
  // Prevent PostgREST 400 from %, (, ), comma, quotes which blanked the list
  return (s || '').replace(/[%(),"]/g, '').replace(/\./g, '').trim().slice(0, 50);
};

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentStore } = useStore();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  // Background write-through: whenever a store is selected and we're
  // online, refresh the full customer-list cache for that store so
  // searchCustomers has something to fall back on once offline. Also
  // re-runs when connectivity itself returns (not just on store change) -
  // otherwise a store that loaded while already offline, or a session
  // that regains connectivity without switching stores, would never get a
  // fresh cache.
  useEffect(() => {
    const storeId = currentStore?.store_id;
    if (!storeId || !isOnline) return;

    (async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        await offlineDb.cachedCustomers.put({ storeId, customers: data, cachedAt: Date.now() });
      }
    })();
  }, [currentStore?.store_id, isOnline]);

  const searchCustomers = async (query: string) => {
    const clean = sanitizeLikeQuery(query);
    if (!clean || clean.length < 2) {
      setCustomers([]);
      return [];
    }
    if (!currentStore) {
      toast({
        title: "Error",
        description: "No store selected",
        variant: "destructive",
      });
      return [];
    }

    setLoading(true);
    try {
      if (!navigator.onLine) {
        const cached = await offlineDb.cachedCustomers.get(currentStore.store_id);
        const fb = filterCachedCustomers(cached?.customers ?? [], clean);
        setCustomers(fb);
        return fb;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', currentStore.store_id)
        .or(`name.ilike.%${clean}%,phone.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCustomers(data || []);
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      let cacheFallbackSucceeded = false;
      let fb: Customer[] = [];
      try {
        const cached = await offlineDb.cachedCustomers.get(currentStore.store_id);
        fb = filterCachedCustomers(cached?.customers ?? [], clean);
        setCustomers(fb);
        cacheFallbackSucceeded = fb.length > 0;
      } catch {
        // no cache available either - fall through to the error toast below
      }
      // Don't show a destructive "failed" toast when the cache fallback
      // just displayed valid (if possibly stale) results - showing both
      // at once told the user their search worked and failed simultaneously.
      if (!cacheFallbackSucceeded) {
        toast({
          title: "Error",
          description: "Failed to search customers",
          variant: "destructive",
        });
      }
      return fb;
    } finally {
      setLoading(false);
    }
  };

  const normalizePhone = (phone: string) => (phone || '').replace(/\D/g, '').slice(-10);

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentStore) {
      toast({
        title: "Error",
        description: "No store selected",
        variant: "destructive",
      });
      return;
    }

    // Identity rule: one record per mobile per store. Normalize first so
    // "09876543210" and "919876543210" don't double up, then reuse the
    // existing record instead of erroring on duplicates.
    const phone = normalizePhone(customerData.phone || '');
    if (phone.length !== 10) {
      toast({
        title: "Invalid mobile number",
        description: "Enter a valid 10-digit Indian mobile number",
        variant: "destructive",
      });
      throw new Error('Invalid mobile number');
    }

    const existing = await getCustomerByPhone(phone).catch(() => null);
    if (existing) {
      toast({
        title: "Customer already exists",
        description: `${existing.name} (${existing.phone}) - using existing record`,
      });
      return existing;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          phone,
          store_id: currentStore.store_id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer added successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error adding customer:', error);
      // Race: someone added the same number concurrently (or a format
      // variant slipped through) - fetch and reuse instead of failing.
      if (error?.code === '23505') {
        const dup = await getCustomerByPhone(phone).catch(() => null);
        if (dup) {
          toast({
            title: "Customer already exists",
            description: `${dup.name} (${dup.phone}) - using existing record`,
          });
          return dup;
        }
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getCustomerByPhone = async (phone: string) => {
    if (!currentStore) return null;

    try {
      // Try exact match plus normalized Indian variants so pre-normalization
      // rows ("919876543210", "09876543210") still resolve to one record.
      const digits = (phone || '').replace(/\D/g, '');
      const candidates = [...new Set([
        phone,
        digits,
        digits.slice(-10),
        digits.slice(-10) ? `91${digits.slice(-10)}` : '',
        digits.slice(-10) ? `0${digits.slice(-10)}` : '',
      ].filter(Boolean))];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('phone', candidates)
        .eq('store_id', currentStore.store_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting customer by phone:', error);
      return null;
    }
  };

  const getAllCustomers = async () => {
    if (!currentStore) {
      toast({
        title: "Error",
        description: "No store selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', currentStore.store_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    customers,
    loading,
    searchCustomers,
    addCustomer,
    getCustomerByPhone,
    getAllCustomers,
  };
};