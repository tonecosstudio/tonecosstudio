import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import businessDayService, { type HolidayInput } from "@/lib/services/businessDayService";

export const ADMIN_HOLIDAYS_QUERY_KEY = ["admin-holidays"] as const;
export type AdminHolidayInput = HolidayInput;

export function useAdminHolidays(year: number) {
  return useQuery({
    queryKey: [...ADMIN_HOLIDAYS_QUERY_KEY, year],
    queryFn: () => businessDayService.getHolidays(year),
  });
}

export function useCreateAdminHoliday(year: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holiday: AdminHolidayInput) => businessDayService.addHoliday(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_HOLIDAYS_QUERY_KEY, year] });
    },
  });
}

export function useDeleteAdminHoliday(year: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holidayId: string) => businessDayService.deleteHoliday(holidayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_HOLIDAYS_QUERY_KEY, year] });
    },
  });
}
