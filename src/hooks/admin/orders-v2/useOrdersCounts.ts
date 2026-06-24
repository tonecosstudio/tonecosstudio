import { useQuery } from '@tanstack/react-query';
import { fetchOrdersCounts } from '@/services/admin/orders/orders-counts-service';

export function useOrdersCounts() {
  return useQuery({
    queryKey: ['admin-orders-counts'],
    queryFn: fetchOrdersCounts,
    staleTime: 60000,
    gcTime: 300000,
  });
}
