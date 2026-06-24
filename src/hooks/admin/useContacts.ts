import { useQuery } from "@tanstack/react-query";
import { fetchContacts, type Contact } from "@/services/admin/customers/contacts-service";

export type { Contact } from "@/services/admin/customers/contacts-service";

export function useContacts() {
  const query = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: fetchContacts,
  });

  return {
    contacts: query.data ?? ([] as Contact[]),
    loading: query.isLoading,
    loadContacts: query.refetch,
  };
}
