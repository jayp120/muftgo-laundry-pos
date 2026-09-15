import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useToast } from './use-toast';
import { offlineDb } from '@/lib/offlineDb';

// Service data interface matching the database schema
export interface ServiceData {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  category: 'wash' | 'dry' | 'special' | 'ironing' | 'folding' | 'detergent' | 'perfume' | 'softener' | 'other_goods';
  item_type?: 'service' | 'product';
  unit_price?: number;
  kilo_price?: number;
  supports_unit: boolean;
  supports_kilo: boolean;
  duration_value: number;
  duration_unit: 'hours' | 'days';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form data interface for creating/updating services
export interface ServiceFormData {
  name: string;
  description?: string;
  category: 'wash' | 'dry' | 'special' | 'ironing' | 'folding' | 'detergent' | 'perfume' | 'softener' | 'other_goods';
  item_type?: 'service' | 'product';
  unit_price?: number;
  kilo_price?: number;
  supports_unit: boolean;
  supports_kilo: boolean;
  duration_value: number;
  duration_unit: 'hours' | 'days';
  is_active?: boolean;
}

// Default Pune (India) rate card seeded for a new store so the POS is usable
// immediately with real shop pricing in INR. Keep in sync with the
// create_store() SQL function
// (supabase/migrations/20260915000000_pune_default_services.sql).
// Kilo services carry only kilo_price, piece services only unit_price - the
// POS shows a stepper only for the supported type.
export const DEFAULT_SERVICES: ServiceFormData[] = [
  // --- Wash (per kg) ---
  {
    name: 'Wash & Fold',
    description: 'Wash, dry & neatly folded',
    category: 'wash',
    kilo_price: 70,
    supports_unit: false,
    supports_kilo: true,
    duration_value: 2,
    duration_unit: 'days',
  },
  {
    name: 'Wash & Iron',
    description: 'Wash - Dry - Iron - Pack',
    category: 'wash',
    kilo_price: 90,
    supports_unit: false,
    supports_kilo: true,
    duration_value: 2,
    duration_unit: 'days',
  },
  {
    name: 'Express Wash & Iron (24 hr)',
    description: 'Ready in 24 hours',
    category: 'wash',
    kilo_price: 140,
    supports_unit: false,
    supports_kilo: true,
    duration_value: 1,
    duration_unit: 'days',
  },
  // --- Ironing (per piece) ---
  {
    name: 'Shirt Iron',
    description: 'Press only',
    category: 'ironing',
    unit_price: 15,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 1,
    duration_unit: 'days',
  },
  {
    name: 'Pant Iron',
    description: 'Press only',
    category: 'ironing',
    unit_price: 15,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 1,
    duration_unit: 'days',
  },
  {
    name: 'Kurta Iron',
    description: 'Press only',
    category: 'ironing',
    unit_price: 25,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 1,
    duration_unit: 'days',
  },
  {
    name: 'Saree Iron',
    description: 'Iron with starch finish',
    category: 'ironing',
    unit_price: 60,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 1,
    duration_unit: 'days',
  },
  // --- Dry clean (per piece) ---
  {
    name: 'Shirt Dry Clean',
    description: 'Dry clean - Press - Pack',
    category: 'dry',
    unit_price: 99,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
  {
    name: 'Pant Dry Clean',
    description: 'Dry clean - Press - Pack',
    category: 'dry',
    unit_price: 99,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
  {
    name: 'Suit Dry Clean (2 Pc)',
    description: 'Coat + pant dry clean',
    category: 'dry',
    unit_price: 299,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
  {
    name: 'Saree Dry Clean',
    description: 'Silk & fancy sarees',
    category: 'dry',
    unit_price: 249,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 4,
    duration_unit: 'days',
  },
  {
    name: 'Blanket Single',
    description: 'Single bed blanket / razai',
    category: 'dry',
    unit_price: 299,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 4,
    duration_unit: 'days',
  },
  {
    name: 'Blanket Double / Quilt',
    description: 'Double bed blanket / quilt',
    category: 'dry',
    unit_price: 449,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 4,
    duration_unit: 'days',
  },
  {
    name: 'Curtain (Per Panel)',
    description: 'Per curtain panel',
    category: 'dry',
    unit_price: 79,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
  // --- Special care (per piece) ---
  {
    name: 'Shoes Wash',
    description: 'Deep clean & deodorise',
    category: 'special',
    unit_price: 199,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
  {
    name: 'School Bag / Backpack Wash',
    description: 'Wash & dry',
    category: 'special',
    unit_price: 149,
    supports_unit: true,
    supports_kilo: false,
    duration_value: 3,
    duration_unit: 'days',
  },
];

// Hook to fetch services for the current store
export const useServices = (category?: string) => {
  const { currentStore } = useStore();
  
  return useQuery({
    queryKey: ['services', currentStore?.store_id, category],
    queryFn: async (): Promise<ServiceData[]> => {
      const storeId = currentStore?.store_id;
      if (!storeId) {
        throw new Error('No store selected');
      }

      const readCachedServices = async (): Promise<ServiceData[]> => {
        const cached = await offlineDb.cachedServices.get(storeId);
        const services = cached?.services ?? [];
        return category ? services.filter((s) => s.category === category) : services;
      };

      if (!navigator.onLine) {
        return readCachedServices();
      }

      try {
        let query = supabase
          .from('services')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (category) {
          query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching services:', error);
          throw error;
        }

        const services = data || [];
        // Write-through the full-catalog fetch into the offline cache so
        // order creation still has last-known prices when connectivity
        // drops. Skipped for category-scoped queries so the cache always
        // holds the complete catalog, not a partial slice.
        if (!category) {
          offlineDb.cachedServices.put({ storeId, services, cachedAt: Date.now() }).catch(() => {});
        }
        return services;
      } catch (error) {
        console.error('Error in useServices:', error);
        return readCachedServices();
      }
    },
    enabled: !!currentStore?.store_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Reads when the current store's service catalog was last cached for
// offline use, so the UI can show "prices as of [time]" while offline.
export const useCachedServicesMeta = (storeId?: string) => {
  const cached = useLiveQuery(
    () => (storeId ? offlineDb.cachedServices.get(storeId) : undefined),
    [storeId]
  );
  return cached?.cachedAt ?? null;
};

// Hook to fetch services by category
export const useServicesByCategory = (category: string) => {
  const servicesQuery = useServices(category);
  return {
    ...servicesQuery,
    services: servicesQuery.data || [],
  };
};

// Hook to create a new service
export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (serviceData: ServiceFormData): Promise<ServiceData> => {
      if (!currentStore?.store_id) {
        throw new Error('No store selected');
      }

      const { data, error } = await supabase
        .from('services')
        .insert([{
          ...serviceData,
          store_id: currentStore.store_id,
          is_active: serviceData.is_active ?? true,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating service:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast({
        title: "Error",
        description: "Failed to create service",
        variant: "destructive",
      });
    },
  });
};

// Hook to seed the default starter services for the current store in one batch.
// Used by empty-state CTAs (POS notice, Service Management) so a new owner can
// get a working catalog with a single tap. Skips names the store already has,
// so tapping it on an existing store only ADDS the missing Pune rate-card
// items instead of duplicating the catalog.
export const useSeedDefaultServices = () => {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!currentStore?.store_id) {
        throw new Error('No store selected');
      }

      const { data: existing, error: fetchError } = await supabase
        .from('services')
        .select('name')
        .eq('store_id', currentStore.store_id);

      if (fetchError) {
        console.error('Error checking existing services:', fetchError);
        throw fetchError;
      }

      const existingNames = new Set((existing || []).map((s) => s.name));
      const missing = DEFAULT_SERVICES.filter((s) => !existingNames.has(s.name));

      if (missing.length === 0) {
        return;
      }

      const { error } = await supabase
        .from('services')
        .insert(
          missing.map((service) => ({
            ...service,
            store_id: currentStore.store_id,
            is_active: true,
          }))
        );

      if (error) {
        console.error('Error seeding default services:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Success',
        description: 'Pune rate-card services added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load sample services',
        variant: 'destructive',
      });
    },
  });
};

// Hook to update a service
export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceFormData> }): Promise<ServiceData> => {
      const { data: updatedService, error } = await supabase
        .from('services')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating service:', error);
        throw error;
      }

      return updatedService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
    },
  });
};

// Hook to delete a service
export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('services')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error deleting service:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    },
  });
};
