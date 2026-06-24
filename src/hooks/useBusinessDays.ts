import { useQueries, useQuery } from "@tanstack/react-query";
import { listHolidays, type Holiday } from "@/services/calendar/business-days-service";

export type { Holiday } from "@/services/calendar/business-days-service";

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ["holidays", year],
    queryFn: () => listHolidays(year),
    staleTime: 1000 * 60 * 60,
  });
}

export function useIsBusinessDay(date: Date) {
  const year = date.getFullYear();
  const { data: holidays, isLoading } = useHolidays(year);

  const isBusinessDay = () => {
    if (isLoading || !holidays) return null;

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    const dateStr = date.toISOString().split("T")[0];
    const isHoliday = holidays.some((holiday) => holiday.holiday_date === dateStr);

    return !isHoliday;
  };

  return {
    isBusinessDay: isBusinessDay(),
    isLoading,
  };
}

export function useBusinessDaysInRange(startDate: Date, endDate: Date) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index,
  );

  const holidayQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ["holidays", year],
      queryFn: () => listHolidays(year),
      staleTime: 1000 * 60 * 60,
    })),
  });

  const isLoading = holidayQueries.some((query) => query.isLoading);
  const allHolidays: Holiday[] = holidayQueries.flatMap((query) => query.data || []);

  const countBusinessDays = () => {
    if (isLoading) return null;

    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        const dateStr = current.toISOString().split("T")[0];
        const isHoliday = allHolidays.some((holiday) => holiday.holiday_date === dateStr);

        if (!isHoliday) {
          count++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  return {
    businessDaysCount: countBusinessDays(),
    isLoading,
  };
}
