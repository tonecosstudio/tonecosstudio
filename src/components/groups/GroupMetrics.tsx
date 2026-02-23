import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/lib/services/metricsService';
import { Card } from '@/components/ui/card';
import { Users, MessageSquare, Eye } from 'lucide-react';

interface GroupMetricsProps {
  groupId: string;
}

export function GroupMetrics({ groupId }: GroupMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['group-metrics', groupId],
    queryFn: () => metricsService.getGroupMetrics(groupId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Membros</p>
            <p className="text-2xl font-bold">{metrics.total_members}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <MessageSquare className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Mensagens</p>
            <p className="text-2xl font-bold">{metrics.total_messages}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg">
            <Eye className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Visualização</p>
            <p className="text-2xl font-bold">
              {Math.round(metrics.estimated_view_rate * 100)}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
