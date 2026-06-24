/**
 * Hook para gerenciar pedidos do usuário com filtros
 * Segue padrão AAA: Arrange, Act, Assert
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrdersByUserId } from "@/services/admin/orders/orders-service";

interface UseUserOrdersProps {
  userId: string | undefined;
}

export function useUserOrders({ userId }: UseUserOrdersProps) {
  // Arrange: Estados para filtros
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Arrange: Query para pedidos
  const ordersQuery = useQuery({
    queryKey: ["admin-user-orders", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      return await fetchOrdersByUserId(userId);
    },
  });

  const orders = useMemo(() => ordersQuery.data || [], [ordersQuery.data]);

  // Act: Filtrar pedidos
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((order) => order.type === typeFilter);
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          (order.trackingCode && order.trackingCode.toLowerCase().includes(query)) ||
          (order.collection && order.collection.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [orders, typeFilter, statusFilter, searchQuery]);

  // Act: Calcular estatísticas
  const stats = useMemo(() => {
    const totalSpent = filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const pendingOrders = filteredOrders.filter((order) =>
      ["pending", "under_review", "requires_info", "reviewing"].includes(order.status)
    );

    return {
      totalOrders: orders.length,
      filteredCount: filteredOrders.length,
      totalSpent,
      pendingCount: pendingOrders.length,
    };
  }, [orders, filteredOrders]);

  // Assert: Retornar dados, filtros e ações
  return {
    orders,
    filteredOrders,
    stats,
    filters: {
      type: typeFilter,
      status: statusFilter,
      search: searchQuery,
    },
    setFilters: {
      setType: setTypeFilter,
      setStatus: setStatusFilter,
      setSearch: setSearchQuery,
    },
    isLoading: ordersQuery.isLoading,
  };
}
