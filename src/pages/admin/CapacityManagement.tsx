import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCapacityUsage } from "@/services/capacity-service";
import { Loader2, AlertCircle, TrendingUp, Calendar, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CapacityAllocationBreakdown } from "@/components/admin/CapacityAllocationBreakdown";
import { CapacityAlertConfig } from "@/components/admin/CapacityAlertConfig";
import { CapacityForecast } from "@/components/admin/CapacityForecast";
import { CapacityReservation } from "@/components/admin/CapacityReservation";

interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  capacity_max: number;
  capacity_current: number;
  status: string;
}

interface CapacityUsage {
  max: number;
  current: number;
  available: number;
  percentage: number;
}

interface MonthCapacityConfig {
  month: number;
  year: number;
  cycle1Limit: number;
  cycle2Limit: number;
  cycle1Id?: string;
  cycle2Id?: string;
}

export default function CapacityManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [cycle1, setCycle1] = useState<Cycle | null>(null);
  const [cycle2, setCycle2] = useState<Cycle | null>(null);
  const [cycle1Usage, setCycle1Usage] = useState<CapacityUsage | null>(null);
  const [cycle2Usage, setCycle2Usage] = useState<CapacityUsage | null>(null);
  const [newCapacityLimit, setNewCapacityLimit] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [futureMonths, setFutureMonths] = useState<MonthCapacityConfig[]>([]);
  const [savingFutureCapacity, setSavingFutureCapacity] = useState(false);

  // Load current month cycles
  useEffect(() => {
    loadCycles();
    loadFutureMonthsCapacity();
  }, [currentMonth, currentYear]);

  const loadCycles = async () => {
    try {
      setLoading(true);

      // Fetch both cycles for current month
      const { data: cycles, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .order("cycle_number");

      if (error) throw error;

      // Separate cycle 1 and cycle 2
      const c1 = cycles?.find((c) => c.cycle_number === 1) as Cycle | null;
      const c2 = cycles?.find((c) => c.cycle_number === 2) as Cycle | null;

      setCycle1(c1);
      setCycle2(c2);

      // Load capacity usage for each cycle
      if (c1) {
        const usage1 = await getCapacityUsage(c1.id);
        setCycle1Usage(usage1);
      } else {
        setCycle1Usage(null);
      }

      if (c2) {
        const usage2 = await getCapacityUsage(c2.id);
        setCycle2Usage(usage2);
      } else {
        setCycle2Usage(null);
      }
    } catch (error: any) {
      console.error("Error loading cycles:", error);
      toast({
        title: "Erro ao carregar ciclos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFutureMonthsCapacity = async () => {
    try {
      // Generate next 6 months
      const months: MonthCapacityConfig[] = [];
      const today = new Date();
      
      for (let i = 1; i <= 6; i++) {
        const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const month = futureDate.getMonth() + 1;
        const year = futureDate.getFullYear();
        
        // Fetch existing cycles for this month
        const { data: cycles } = await supabase
          .from("cycles")
          .select("*")
          .eq("month", month)
          .eq("year", year)
          .order("cycle_number");
        
        const c1 = cycles?.find((c) => c.cycle_number === 1);
        const c2 = cycles?.find((c) => c.cycle_number === 2);
        
        months.push({
          month,
          year,
          cycle1Limit: c1?.capacity_max || 100,
          cycle2Limit: c2?.capacity_max || 100,
          cycle1Id: c1?.id,
          cycle2Id: c2?.id,
        });
      }
      
      setFutureMonths(months);
    } catch (error: any) {
      console.error("Error loading future months:", error);
    }
  };

  const updateFutureMonthCapacity = (index: number, field: 'cycle1Limit' | 'cycle2Limit', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) return;
    
    setFutureMonths(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: numValue };
      return updated;
    });
  };

  const saveFutureMonthsCapacity = async () => {
    try {
      setSavingFutureCapacity(true);
      
      for (const monthConfig of futureMonths) {
        // Update or create cycle 1
        if (monthConfig.cycle1Id) {
          await supabase
            .from("cycles")
            .update({ capacity_max: monthConfig.cycle1Limit })
            .eq("id", monthConfig.cycle1Id);
        }
        
        // Update or create cycle 2
        if (monthConfig.cycle2Id) {
          await supabase
            .from("cycles")
            .update({ capacity_max: monthConfig.cycle2Limit })
            .eq("id", monthConfig.cycle2Id);
        }
      }
      
      toast({
        title: "Limites salvos",
        description: "Os limites de capacidade futuros foram atualizados com sucesso.",
      });
      
      await loadFutureMonthsCapacity();
    } catch (error: any) {
      console.error("Error saving future capacity:", error);
      toast({
        title: "Erro ao salvar limites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingFutureCapacity(false);
    }
  };

  const updateCapacityLimit = async (cycleId: string, newLimit: number) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from("cycles")
        .update({ capacity_max: newLimit })
        .eq("id", cycleId);

      if (error) throw error;

      toast({
        title: "Limite atualizado",
        description: "O limite de capacidade foi atualizado com sucesso.",
      });

      // Reload cycles
      await loadCycles();
      setNewCapacityLimit("");
    } catch (error: any) {
      console.error("Error updating capacity:", error);
      toast({
        title: "Erro ao atualizar limite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 dark:text-red-400";
    if (percentage >= 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-600";
    if (percentage >= 80) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getAlertVariant = (percentage: number): "default" | "destructive" => {
    if (percentage >= 80) return "destructive";
    return "default";
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1];
  };

  const renderCycleCard = (
    cycle: Cycle | null,
    usage: CapacityUsage | null,
    cycleNumber: 1 | 2
  ) => {
    if (!cycle || !usage) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Ciclo {cycleNumber}</CardTitle>
            <CardDescription>
              {cycleNumber === 1 ? "Dias 1-15" : "Dias 16-fim do mês"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ciclo ainda não criado para este mês.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ciclo {cycleNumber}</span>
            <span className={`text-2xl font-bold ${getStatusColor(usage.percentage)}`}>
              {usage.percentage}%
            </span>
          </CardTitle>
          <CardDescription>
            {cycleNumber === 1 ? "Dias 1-15" : "Dias 16-fim do mês"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uso atual</span>
              <span className="font-medium">
                {usage.current} / {usage.max} peças
              </span>
            </div>
            <Progress 
              value={usage.percentage} 
              className="h-3"
              indicatorClassName={getProgressColor(usage.percentage)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usage.available} peças disponíveis</span>
              {usage.reserved && usage.reserved > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  {usage.reserved} reservadas
                </span>
              )}
            </div>
          </div>

          {/* Alert if capacity is high */}
          {usage.percentage >= 80 && (
            <Alert variant={getAlertVariant(usage.percentage)}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {usage.percentage >= 90 ? "Capacidade Crítica" : "Atenção"}
              </AlertTitle>
              <AlertDescription>
                {usage.percentage >= 90
                  ? "A capacidade está quase esgotada. Considere aumentar o limite."
                  : "A capacidade está acima de 80%. Monitore de perto."}
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">{cycle.status}</span>
          </div>

          {/* Capacity Configuration */}
          <div className="pt-4 border-t space-y-3">
            <Label htmlFor={`capacity-${cycleNumber}`}>
              Configurar Limite de Capacidade
            </Label>
            <div className="flex gap-2">
              <Input
                id={`capacity-${cycleNumber}`}
                type="number"
                min="1"
                placeholder={`Atual: ${usage.max}`}
                value={newCapacityLimit}
                onChange={(e) => setNewCapacityLimit(e.target.value)}
                disabled={updating}
              />
              <Button
                onClick={() => {
                  const limit = parseInt(newCapacityLimit);
                  if (limit > 0) {
                    updateCapacityLimit(cycle.id, limit);
                  } else {
                    toast({
                      title: "Valor inválido",
                      description: "O limite deve ser maior que zero.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={updating || !newCapacityLimit}
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Capacidade</h1>
          <p className="text-muted-foreground">
            Monitore e configure a capacidade de produção dos ciclos
          </p>
        </div>

        {/* Month/Year Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Período</CardTitle>
            <CardDescription>
              Selecione o mês e ano para visualizar a capacidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="month">Mês</Label>
                <Input
                  id="month"
                  type="number"
                  min="1"
                  max="12"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  min="2026"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadCycles}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cycle Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {renderCycleCard(cycle1, cycle1Usage, 1)}
          {renderCycleCard(cycle2, cycle2Usage, 2)}
        </div>

        {/* Summary Card */}
        {cycle1Usage && cycle2Usage && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Mês</CardTitle>
              <CardDescription>
                Capacidade total para {currentMonth}/{currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Capacidade Total</p>
                  <p className="text-2xl font-bold">
                    {cycle1Usage.max + cycle2Usage.max} peças
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Uso Atual</p>
                  <p className="text-2xl font-bold">
                    {cycle1Usage.current + cycle2Usage.current} peças
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disponível</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {cycle1Usage.available + cycle2Usage.available} peças
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Future Months Capacity Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Configuração de Capacidade Futura
                </CardTitle>
                <CardDescription>
                  Configure os limites de capacidade para os próximos meses
                </CardDescription>
              </div>
              <Button 
                onClick={saveFutureMonthsCapacity}
                disabled={savingFutureCapacity}
              >
                {savingFutureCapacity ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead>Ciclo 1 (Dias 1-15)</TableHead>
                  <TableHead>Ciclo 2 (Dias 16-fim)</TableHead>
                  <TableHead>Total Mensal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureMonths.map((monthConfig, index) => (
                  <TableRow key={`${monthConfig.year}-${monthConfig.month}`}>
                    <TableCell className="font-medium">
                      {getMonthName(monthConfig.month)} {monthConfig.year}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={monthConfig.cycle1Limit}
                        onChange={(e) => updateFutureMonthCapacity(index, 'cycle1Limit', e.target.value)}
                        className="w-24"
                        disabled={savingFutureCapacity}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={monthConfig.cycle2Limit}
                        onChange={(e) => updateFutureMonthCapacity(index, 'cycle2Limit', e.target.value)}
                        className="w-24"
                        disabled={savingFutureCapacity}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {monthConfig.cycle1Limit + monthConfig.cycle2Limit} peças
                    </TableCell>
                    <TableCell>
                      {monthConfig.cycle1Id || monthConfig.cycle2Id ? (
                        <span className="text-xs text-muted-foreground">Ciclos criados</span>
                      ) : (
                        <span className="text-xs text-yellow-600">Ciclos pendentes</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Os limites configurados aqui serão aplicados quando os ciclos forem criados. 
                Se os ciclos já existem, os limites serão atualizados imediatamente ao salvar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Capacity Allocation Breakdown */}
        {(cycle1 || cycle2) && (
          <div className="space-y-6">
            {/* Capacity Reservation Management */}
            {cycle1 && cycle1Usage && (
              <CapacityReservation
                cycleId={cycle1.id}
                cycleName={`Ciclo 1 - ${getMonthName(currentMonth)} ${currentYear}`}
                currentReserved={(cycle1Usage as any).reserved || 0}
                maxCapacity={cycle1Usage.max}
                currentUsage={cycle1Usage.current}
                onReservationChange={loadCycles}
              />
            )}
            {cycle2 && cycle2Usage && (
              <CapacityReservation
                cycleId={cycle2.id}
                cycleName={`Ciclo 2 - ${getMonthName(currentMonth)} ${currentYear}`}
                currentReserved={(cycle2Usage as any).reserved || 0}
                maxCapacity={cycle2Usage.max}
                currentUsage={cycle2Usage.current}
                onReservationChange={loadCycles}
              />
            )}
            
            {/* Capacity Forecast */}
            <CapacityForecast />
            
            {/* Alert Configuration */}
            {cycle1 && cycle1Usage && (
              <CapacityAlertConfig
                cycleId={cycle1.id}
                cycleName={`Ciclo 1 - ${getMonthName(currentMonth)} ${currentYear}`}
                currentPercentage={cycle1Usage.percentage}
              />
            )}
            {cycle2 && cycle2Usage && (
              <CapacityAlertConfig
                cycleId={cycle2.id}
                cycleName={`Ciclo 2 - ${getMonthName(currentMonth)} ${currentYear}`}
                currentPercentage={cycle2Usage.percentage}
              />
            )}
            
            {/* Capacity Breakdown */}
            {cycle1 && (
              <CapacityAllocationBreakdown
                cycleId={cycle1.id}
                cycleName={`Ciclo 1 - ${getMonthName(currentMonth)} ${currentYear}`}
              />
            )}
            {cycle2 && (
              <CapacityAllocationBreakdown
                cycleId={cycle2.id}
                cycleName={`Ciclo 2 - ${getMonthName(currentMonth)} ${currentYear}`}
              />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
