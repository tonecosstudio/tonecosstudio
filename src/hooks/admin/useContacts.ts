import { useCallback, useEffect, useState } from "react";
import { fetchContacts, type Contact } from "@/services/admin/contacts-service";
export type { Contact } from "@/services/admin/contacts-service";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const data = await fetchContacts();
    setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  return { contacts, loading, loadContacts };
}
