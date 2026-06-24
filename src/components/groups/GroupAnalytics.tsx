import { useQuery } from "@tanstack/react-query";
import { groupAnalyticsService } from "@/services/groups/group-analytics-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, MessageSquare, Clock, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GroupAnalyticsProps {
  groupId: string;
}

/**
 * GroupAnalytics - Dashboard de analytics para grupos
 *
 * Exibe métricas avançadas de engajamento:
 * - Taxa de abertura com tendência
 * - Horários de pico de atividade
 * - Membros mais ativos
 * - Crescimento de membros ao longo do tempo
 */
export function GroupAnalytics({ groupId }: GroupAnalyticsProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["group-analytics", groupId],
    queryFn: () => groupAnalyticsService.getGroupAnalytics(groupId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Erro ao carregar analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Open Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Abertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{analytics.openRate}%</div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  analytics.openRateTrend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {analytics.openRateTrend >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(analytics.openRateTrend)}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs. período anterior</p>
          </CardContent>
        </Card>

        {/* Total Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">{analytics.totalMembers}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">membros ativos</p>
          </CardContent>
        </Card>

        {/* Total Messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div className="text-3xl font-bold">{analytics.totalMessages}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">mensagens totais</p>
          </CardContent>
        </Card>

        {/* Avg per Member */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média por Membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="text-3xl font-bold">
                {analytics.totalMembers > 0
                  ? Math.round(analytics.totalMessages / analytics.totalMembers)
                  : 0}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">mensagens/membro</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Peak Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Pico
            </CardTitle>
            <CardDescription>Quando os membros estão mais ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}h`} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(value) => [`${value} visualizações`, "Atividade"]}
                  labelFormatter={(hour) => `${hour}:00`}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Baseado nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        {/* Member Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crescimento de Membros
            </CardTitle>
            <CardDescription>Evolução nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    const [year, month] = date.split("-");
                    return `${month}/${year.slice(2)}`;
                  }}
                  fontSize={11}
                />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(value) => [`${value} membros`, "Total"]}
                  labelFormatter={(date) => {
                    const [year, month] = date.split("-");
                    const monthNames = [
                      "Jan",
                      "Fev",
                      "Mar",
                      "Abr",
                      "Mai",
                      "Jun",
                      "Jul",
                      "Ago",
                      "Set",
                      "Out",
                      "Nov",
                      "Dez",
                    ];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">Crescimento acumulado</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros Mais Ativos
          </CardTitle>
          <CardDescription>Top 10 membros por engajamento</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado de atividade disponível
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topMembers.map((member, index) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{member.viewCount} visualizações</p>
                    {member.lastViewedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(member.lastViewedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
