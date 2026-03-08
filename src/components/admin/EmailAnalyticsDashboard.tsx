import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, CheckCircle, XCircle, Clock, Eye, MousePointer, AlertCircle } from 'lucide-react';

interface EmailLog {
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

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  pending: number;
}

export function EmailAnalyticsDashboard() {
  const [searchEmail, setSearchEmail] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');

  // Fetch email statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['email-stats', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select('status')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats: EmailStats = {
        total: data.length,
        sent: data.filter(log => log.status === 'sent').length,
        failed: data.filter(log => log.status === 'failed').length,
        bounced: data.filter(log => log.status === 'bounced').length,
        opened: data.filter(log => log.status === 'opened').length,
        clicked: data.filter(log => log.status === 'clicked').length,
        pending: data.filter(log => log.status === 'pending').length,
      };

      return stats;
    },
  });

  // Fetch email logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs', searchEmail, filterType, filterStatus, timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let query = supabase
        .from('email_delivery_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchEmail) {
        query = query.ilike('recipient_email', `%${searchEmail}%`);
      }

      if (filterType !== 'all') {
        query = query.eq('email_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      sent: { variant: 'default', icon: <CheckCircle className="w-3 h-3" />, label: 'Enviado' },
      failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Falhou' },
      bounced: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" />, label: 'Rejeitado' },
      opened: { variant: 'default', icon: <Eye className="w-3 h-3" />, label: 'Aberto' },
      clicked: { variant: 'default', icon: <MousePointer className="w-3 h-3" />, label: 'Clicado' },
      pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, label: 'Pendente' },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      welcome: 'Boas-vindas',
      choice_reminder: 'Lembrete de Escolha',
      character_revelation: 'Revelação de Personagem',
      production_started: 'Produção Iniciada',
      shipping_notification: 'Notificação de Envio',
      balance_reminder: 'Lembrete de Saldo',
      cancellation_notice: 'Aviso de Cancelamento',
      payment_confirmation: 'Confirmação de Pagamento',
      other: 'Outro',
    };

    return labels[type] || type;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0%';
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Email Analytics</h2>
          <p className="text-muted-foreground">
            Monitore o desempenho e status de entrega de emails
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Últimas 24 horas</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.sent || 0} entregues ({calculateRate(stats?.sent || 0, stats?.total || 0)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateRate(stats?.opened || 0, stats?.sent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.opened || 0} de {stats?.sent || 0} emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateRate(stats?.clicked || 0, stats?.sent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.clicked || 0} de {stats?.sent || 0} emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.failed || 0) + (stats?.bounced || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.failed || 0} falhas, {stats?.bounced || 0} rejeitados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Emails</CardTitle>
          <CardDescription>
            Visualize todos os emails enviados e seus status de entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Buscar por email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="welcome">Boas-vindas</SelectItem>
                <SelectItem value="choice_reminder">Lembrete de Escolha</SelectItem>
                <SelectItem value="character_revelation">Revelação</SelectItem>
                <SelectItem value="production_started">Produção</SelectItem>
                <SelectItem value="shipping_notification">Envio</SelectItem>
                <SelectItem value="balance_reminder">Saldo</SelectItem>
                <SelectItem value="cancellation_notice">Cancelamento</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="opened">Aberto</SelectItem>
                <SelectItem value="clicked">Clicado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="bounced">Rejeitado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Enviado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.recipient_email}</TableCell>
                      <TableCell>{getEmailTypeLabel(log.email_type)}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.retry_count}</TableCell>
                      <TableCell>
                        {log.sent_at
                          ? new Date(log.sent_at).toLocaleString('pt-BR')
                          : new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhum email encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
