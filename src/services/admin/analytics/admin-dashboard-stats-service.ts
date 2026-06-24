import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { fetchAdminOrderMetrics } from '@/services/admin/orders/admin-order-metrics-service';

export interface DateRange {
  from: Date;
  to: Date;
}

interface ChartPointRange {
  label: string;
  fromDate: string;
  toDate: string;
}

export function getPreviousPeriod(dateRange: DateRange): DateRange {
  const periodDiff = dateRange.to.getTime() - dateRange.from.getTime();
  const previousTo = new Date(dateRange.from.getTime() - 1);
  return {
    from: new Date(previousTo.getTime() - periodDiff),
    to: previousTo,
  };
}

function normalizeDateRange(dateRange: DateRange): DateRange {
  if (dateRange.from <= dateRange.to) {
    return dateRange;
  }

  return {
    from: dateRange.to,
    to: dateRange.from,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getInclusiveDaySpan(dateRange: DateRange): number {
  const normalized = normalizeDateRange(dateRange);
  const from = startOfDay(normalized.from).getTime();
  const to = endOfDay(normalized.to).getTime();
  return Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)));
}

function buildDailyRanges(dateRange: DateRange): ChartPointRange[] {
  const normalized = normalizeDateRange(dateRange);
  const ranges: ChartPointRange[] = [];
  let cursor = startOfDay(normalized.from);
  const limit = endOfDay(normalized.to);

  while (cursor <= limit) {
    const segmentStart = startOfDay(cursor);
    const segmentEnd = endOfDay(cursor);

    ranges.push({
      label: formatDate(segmentStart, { day: "2-digit", month: "short" }),
      fromDate: segmentStart.toISOString(),
      toDate: segmentEnd.toISOString(),
    });

    cursor = addDays(cursor, 1);
  }

  return ranges;
}

function buildWeeklyRanges(dateRange: DateRange): ChartPointRange[] {
  const normalized = normalizeDateRange(dateRange);
  const ranges: ChartPointRange[] = [];
  let cursor = startOfDay(normalized.from);
  const limit = endOfDay(normalized.to);

  while (cursor <= limit) {
    const segmentStart = startOfDay(cursor);
    const segmentEnd = endOfDay(new Date(Math.min(addDays(cursor, 6).getTime(), limit.getTime())));

    ranges.push({
      label: formatDate(segmentStart, { day: "2-digit", month: "short" }),
      fromDate: segmentStart.toISOString(),
      toDate: segmentEnd.toISOString(),
    });

    cursor = addDays(segmentEnd, 1);
  }

  return ranges;
}

function buildMonthlyRanges(dateRange: DateRange): ChartPointRange[] {
  const normalized = normalizeDateRange(dateRange);
  const ranges: ChartPointRange[] = [];
  let cursor = new Date(normalized.from.getFullYear(), normalized.from.getMonth(), 1);
  const limit = endOfDay(normalized.to);

  while (cursor <= limit) {
    const monthStart = cursor < normalized.from ? startOfDay(normalized.from) : startOfDay(cursor);
    const rawMonthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthEnd = new Date(Math.min(rawMonthEnd.getTime(), limit.getTime()));

    ranges.push({
      label: formatDate(cursor, { month: "short", year: "2-digit" }),
      fromDate: monthStart.toISOString(),
      toDate: monthEnd.toISOString(),
    });

    cursor = addMonths(cursor, 1);
  }

  return ranges;
}

function buildTimelineRanges(dateRange: DateRange): ChartPointRange[] {
  const daySpan = getInclusiveDaySpan(dateRange);

  if (daySpan <= 14) {
    return buildDailyRanges(dateRange);
  }

  if (daySpan <= 90) {
    return buildWeeklyRanges(dateRange);
  }

  return buildMonthlyRanges(dateRange);
}

function buildRevenueRanges(dateRange: DateRange): ChartPointRange[] {
  const daySpan = getInclusiveDaySpan(dateRange);

  if (daySpan <= 45) {
    return buildDailyRanges(dateRange);
  }

  if (daySpan <= 180) {
    return buildWeeklyRanges(dateRange);
  }

  return buildMonthlyRanges(dateRange);
}

export async function fetchAggregatedCounts(fromDate: string, toDate: string) {
  const [
    modelsRes,
    usersRes,
    currentUsersRes,
    queueRes,
    supportRes,
    collectionsRes,
  ] = await Promise.all([
      supabase.from('models').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', fromDate).lte('created_at', toDate),
      supabase.from('images_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('collections').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

  return {
    models: modelsRes.count || 0,
    usersTotal: usersRes.count || 0,
    usersCurrent: currentUsersRes.count || 0,
    queue: queueRes.count || 0,
    support: supportRes.count || 0,
    collections: collectionsRes.count || 0,
  };
}

export async function fetchOrderCounts(fromDate: string, toDate: string) {
  return fetchAdminOrderMetrics({ fromDate, toDate });
}

export async function fetchRevenueChartData(dateRange: DateRange) {
  const ranges = buildRevenueRanges(dateRange);

  return Promise.all(
    ranges.map(async ({ label, fromDate, toDate }) => {
      const metrics = await fetchAdminOrderMetrics({
        fromDate,
        toDate,
      });

      return {
        month: label,
        receita: metrics.revenue,
        orcamentos: metrics.quotes.total,
      };
    })
  );
}

export async function fetchPreviousPeriodCounts(previous: DateRange) {
  const previousUsersRes = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previous.from.toISOString())
    .lte('created_at', previous.to.toISOString());

  return {
    previousUsersCount: previousUsersRes.count || 0,
  };
}

export async function fetchQuotesPerDay(fromDate: string, toDate: string) {
  const dateRange = normalizeDateRange({
    from: new Date(fromDate),
    to: new Date(toDate),
  });
  const [quotesRes, standaloneRes, manualRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('created_at, total_amount')
      .gte('created_at', fromDate)
      .lte('created_at', toDate),
    supabase
      .from('standalone_purchases')
      .select('created_at, amount')
      .gte('created_at', fromDate)
      .lte('created_at', toDate),
    supabase
      .from('manual_payments')
      .select('created_at, amount')
      .gte('created_at', fromDate)
      .lte('created_at', toDate),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (standaloneRes.error) throw standaloneRes.error;
  if (manualRes.error) throw manualRes.error;

  const chartQuotes = quotesRes.data ?? [];
  const chartStandalonePurchases = standaloneRes.data ?? [];
  const chartManualPayments = manualRes.data ?? [];

  const ranges = buildTimelineRanges(dateRange);

  return ranges.map(({ label, fromDate: segmentFrom, toDate: segmentTo }) => {
    const segmentFromTime = new Date(segmentFrom).getTime();
    const segmentToTime = new Date(segmentTo).getTime();
    const isWithinSegment = (createdAt: string | null | undefined) => {
      if (!createdAt) return false;
      const createdAtTime = new Date(createdAt).getTime();
      return Number.isFinite(createdAtTime) && createdAtTime >= segmentFromTime && createdAtTime <= segmentToTime;
    };

    const dayQuotes = chartQuotes.filter((quote) => isWithinSegment(quote.created_at));
    const dayStandalonePurchases = chartStandalonePurchases.filter((purchase) =>
      isWithinSegment(purchase.created_at)
    );
    const dayManualPayments = chartManualPayments.filter((payment) => isWithinSegment(payment.created_at));

    return {
      date: label,
      orcamentos: dayQuotes.length,
      receita:
        dayQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0) +
        dayStandalonePurchases.reduce((acc, purchase) => acc + (purchase.amount || 0), 0) +
        dayManualPayments.reduce((acc, payment) => acc + (payment.amount || 0), 0),
    };
  });
}
