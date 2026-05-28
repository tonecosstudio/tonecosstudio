/**
 * AdminHolidayManager - Gerenciamento de Feriados
 *
 * Gerencia feriados e dias não úteis para cálculo de prazos de entrega.
 */

import { FormEvent, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  type AdminHolidayInput,
  useAdminHolidays,
  useCreateAdminHoliday,
  useDeleteAdminHoliday,
} from "@/hooks/admin/useAdminHolidays";
import SEOHead from "@/components/SEOHead";
import { Calendar, Plus, Trash2 } from "lucide-react";

type HolidayType = "national" | "state";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR + index - 1);

export default function AdminHolidayManager() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [holidayDate, setHolidayDate] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<HolidayType>("national");
  const [stateCode, setStateCode] = useState("BA");
  const [isRecurring, setIsRecurring] = useState(true);

  const { data: holidays = [], isLoading, isError, error } = useAdminHolidays(selectedYear);
  const createHoliday = useCreateAdminHoliday(selectedYear);
  const deleteHoliday = useDeleteAdminHoliday(selectedYear);

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)),
    [holidays],
  );

  const resetForm = () => {
    setHolidayDate("");
    setName("");
    setDescription("");
    setType("national");
    setStateCode("BA");
    setIsRecurring(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!holidayDate || !name.trim()) {
      toast({
        title: "Dados obrigatorios",
        description: "Informe data e nome do feriado.",
        variant: "destructive",
      });
      return;
    }

    const holiday: AdminHolidayInput = {
      holiday_date: holidayDate,
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      state_code: type === "state" ? stateCode.trim().toUpperCase() : undefined,
      is_recurring: isRecurring,
    };

    try {
      await createHoliday.mutateAsync(holiday);
      toast({
        title: "Feriado criado",
        description: `${holiday.name} foi adicionado ao calendario.`,
      });
      resetForm();
    } catch (submitError) {
      toast({
        title: "Erro ao criar feriado",
        description:
          submitError instanceof Error ? submitError.message : "Nao foi possivel salvar o feriado.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (holidayId: string, holidayName: string) => {
    if (!window.confirm(`Excluir o feriado "${holidayName}"?`)) {
      return;
    }

    try {
      await deleteHoliday.mutateAsync(holidayId);
      toast({
        title: "Feriado excluido",
        description: `${holidayName} foi removido do calendario.`,
      });
    } catch (deleteError) {
      toast({
        title: "Erro ao excluir feriado",
        description:
          deleteError instanceof Error ? deleteError.message : "Nao foi possivel excluir o feriado.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <SEOHead
        title="Gerenciar Feriados - Admin"
        description="Gerencie feriados e dias não úteis para cálculo de prazos"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Feriados</h1>
          <p className="text-muted-foreground mt-2">
            Configure feriados e dias não úteis para cálculo automático de prazos de entrega
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Feriado
            </CardTitle>
            <CardDescription>
              Registre feriados nacionais ou estaduais usados no cálculo de dias úteis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="grid gap-2 lg:col-span-1">
                <Label htmlFor="holiday-date">Data</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                />
              </div>

              <div className="grid gap-2 md:col-span-2 lg:col-span-2">
                <Label htmlFor="holiday-name">Nome</Label>
                <Input
                  id="holiday-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(value: HolidayType) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">Nacional</SelectItem>
                    <SelectItem value="state">Estadual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state-code">UF</Label>
                <Input
                  id="state-code"
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value.toUpperCase())}
                  maxLength={2}
                  disabled={type === "national"}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button type="submit" disabled={createHoliday.isPending} className="w-full">
                  {createHoliday.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>

              <div className="grid gap-2 md:col-span-2 lg:col-span-5">
                <Label htmlFor="holiday-description">Descrição</Label>
                <Input
                  id="holiday-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={240}
                />
              </div>

              <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-1">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(event) => setIsRecurring(event.target.checked)}
                  className="h-4 w-4"
                />
                Recorrente
              </label>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendário de Feriados
                </CardTitle>
                <CardDescription>Feriados cadastrados para o ano selecionado</CardDescription>
              </div>

              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {isError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error instanceof Error ? error.message : "Erro ao carregar feriados."}
              </div>
            )}

            {!isLoading && !isError && sortedHolidays.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                Nenhum feriado cadastrado para {selectedYear}
              </div>
            )}

            {!isLoading && !isError && sortedHolidays.length > 0 && (
              <div className="divide-y rounded-md border">
                {sortedHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{holiday.name}</span>
                        <Badge variant={holiday.type === "national" ? "default" : "secondary"}>
                          {holiday.type === "national" ? "Nacional" : holiday.state_code}
                        </Badge>
                        {holiday.is_recurring && <Badge variant="outline">Recorrente</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(`${holiday.holiday_date}T00:00:00`).toLocaleDateString("pt-BR")}
                        {holiday.description ? ` - ${holiday.description}` : ""}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(holiday.id, holiday.name)}
                      disabled={deleteHoliday.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
