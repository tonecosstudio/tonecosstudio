import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";

export interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  provider: string;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  created_at: string;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  pending: number;
}

export interface EmailLogFilters {
  searchEmail: string;
  filterType: string;
  filterStatus: string;
  timeRange: string;
}

interface EmailLogsQuery<T> extends PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}> {
  eq(column: "email_type" | "status", value: string): EmailLogsQuery<T>;
  gte(column: "created_at", value: string): EmailLogsQuery<T>;
  ilike(column: "recipient_email", value: string): EmailLogsQuery<T>;
  limit(count: number): EmailLogsQuery<T>;
  order(column: "created_at", options?: { ascending?: boolean }): EmailLogsQuery<T>;
}

interface EmailAnalyticsGateway {
  from(table: "email_delivery_logs"): {
    select(columns: "status"): EmailLogsQuery<Pick<EmailLog, "status">>;
    select(columns: "*"): EmailLogsQuery<EmailLog>;
  };
}

const emailAnalyticsGateway = supabase as unknown as EmailAnalyticsGateway;

function getStartDateIso(timeRange: string): string {
  const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  return startDate.toISOString();
}

export async function fetchEmailStats(timeRange: string): Promise<EmailStats> {
  const { data, error } = await emailAnalyticsGateway
    .from("email_delivery_logs")
    .select("status")
    .gte("created_at", getStartDateIso(timeRange));

  if (error) throw error;

  const logs = data || [];
  return {
    total: logs.length,
    sent: logs.filter((log) => log.status === "sent").length,
    failed: logs.filter((log) => log.status === "failed").length,
    bounced: logs.filter((log) => log.status === "bounced").length,
    opened: logs.filter((log) => log.status === "opened").length,
    clicked: logs.filter((log) => log.status === "clicked").length,
    pending: logs.filter((log) => log.status === "pending").length,
  };
}

export async function fetchEmailLogs(filters: EmailLogFilters): Promise<EmailLog[]> {
  const { searchEmail, filterType, filterStatus, timeRange } = filters;

  let query = emailAnalyticsGateway
    .from("email_delivery_logs")
    .select("*")
    .gte("created_at", getStartDateIso(timeRange))
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchEmail) {
    query = query.ilike("recipient_email", `%${sanitizePostgrestSearchTerm(searchEmail)}%`);
  }

  if (filterType !== "all") {
    query = query.eq("email_type", filterType);
  }

  if (filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
