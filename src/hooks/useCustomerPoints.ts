import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

export interface CustomerPoints {
  pointst_id: number;
  customer_phone: string;
  accumulated_points: number;
  current_points: number;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  transaction_id: number;
  pointst_id: number;
  pointsts_changed: number;
  transaction_type: 'earning' | 'redemption';
  transaction_date: string;
  notes: string | null;
  order_id: string | null;
}

/**
 * Hook to fetch customer pointsts by phone number
 */
export const useCustomerPoints = (customerPhone: string | undefined) => {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['customer-points', customerPhone, currentStore?.store_id],
    queryFn: async () => {
      if (!customerPhone || !currentStore?.store_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('points')
        .select('*')
        .eq('customer_phone', customerPhone)
        .eq('store_id', currentStore.store_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer pointsts:', error);
        throw error;
      }

      return data as CustomerPoints | null;
    },
    enabled: !!customerPhone && !!currentStore?.store_id,
  });
};

/**
 * Hook to fetch customer pointst transactions
 */
export const useCustomerPointTransactions = (customerPhone: string | undefined, limit: number = 10) => {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['customer-point-transactions', customerPhone, currentStore?.store_id, limit],
    queryFn: async () => {
      if (!customerPhone || !currentStore?.store_id) {
        return [];
      }

      // First get the pointst_id
      const { data: pointstsData } = await supabase
        .from('points')
        .select('point_id')
        .eq('customer_phone', customerPhone)
        .eq('store_id', currentStore.store_id)
        .maybeSingle();

      if (!pointsData) {
        return [];
      }

      // Then fetch transactions
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('point_id', pointstsData.point_id)
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching pointst transactions:', error);
        throw error;
      }

      return data as PointTransaction[];
    },
    enabled: !!customerPhone && !!currentStore?.store_id,
  });
};

/**
 * Hook to fetch pointsts statistics for the current store
 */
export const useStorePointsStats = () => {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['store-points-stats', currentStore?.store_id],
    queryFn: async () => {
      if (!currentStore?.store_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('points')
        .select('accumulated_points, current_points')
        .eq('store_id', currentStore.store_id);

      if (error) {
        console.error('Error fetching store pointsts stats:', error);
        throw error;
      }

      const stats = {
        totalCustomers: data?.length || 0,
        totalPointsIssued: data?.reduce((sum, p) => sum + (p.accumulated_points || 0), 0) || 0,
        totalPointsAvailable: data?.reduce((sum, p) => sum + (p.current_points || 0), 0) || 0,
        totalPointsRedeemed: 0,
      };

      stats.totalPointsRedeemed = stats.totalPointsIssued - stats.totalPointsAvailable;

      return stats;
    },
    enabled: !!currentStore?.store_id,
  });
};
