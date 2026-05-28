type HolidaySource = {
  from(table: "holidays"): {
    select(columns: "holiday_date"): {
      gte(column: "holiday_date", value: string): {
        lte(column: "holiday_date", value: string): Promise<{
          data: Array<{ holiday_date: string }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

function toDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isBusinessDay(date: Date, holidayDates: Set<string>): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !holidayDates.has(toDateOnly(date));
}

export async function getHolidayDatesForMonth(
  supabase: HolidaySource,
  year: number,
  month: number,
): Promise<Set<string>> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  const { data, error } = await supabase
    .from("holidays")
    .select("holiday_date")
    .gte("holiday_date", toDateOnly(start))
    .lte("holiday_date", toDateOnly(end));

  if (error) {
    throw new Error(`Failed to fetch holidays: ${error.message}`);
  }

  return new Set((data || []).map((holiday) => holiday.holiday_date));
}

export function calculateNthBusinessDayOfMonth(
  year: number,
  month: number,
  nthBusinessDay: number,
  holidayDates: Set<string> = new Set(),
): Date {
  if (!Number.isInteger(nthBusinessDay) || nthBusinessDay < 1) {
    throw new Error("nthBusinessDay must be a positive integer");
  }

  const current = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let businessDaysSeen = 0;

  for (let day = 1; day <= lastDay; day++) {
    current.setUTCDate(day);
    if (!isBusinessDay(current, holidayDates)) continue;

    businessDaysSeen++;
    if (businessDaysSeen === nthBusinessDay) {
      return new Date(current);
    }
  }

  throw new Error(`Month ${month}/${year} has fewer than ${nthBusinessDay} business days`);
}
