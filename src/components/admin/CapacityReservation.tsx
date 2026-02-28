/**
 * Capacity Reservation Component
 * 
 * Allows administrators to reserve capacity for special orders.
 * Reserved capacity is subtracted from available capacity.
 * 
 * Requirements: 16.6
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Unlock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CapacityReservationProps {
  cycleId: string;
  cycleName: string;
  currentReserved: number;
  maxCapacity: number;
  currentUsage: number;
  onReservationChange?: () => void;
}

export function CapacityReservation({
  cycleId,
  cycleName,
  currentReserved,
  maxCapacity,
  currentUsage,
  onReservationChange,
}: CapacityReservationProps) {
  const { toast } = useToast();
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState<string>("");
  const [reserveReason, setReserveReason] = useState<string>("");
  const [releaseQuantity, setReleaseQuantity] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const availableCapacity = maxCapacity - currentUsage - currentReserved;

  const handleReserveCapacity = async () => {
    const quantity = parseInt(reserveQuantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Por favor, insira uma quantidade válida maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!reserveReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, forneça um motivo para a reserva.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > availableCapacity) {
      toast({
        title: "Capacidade insuficiente",
        description: `Apenas ${availableCapacity} peças disponíveis para reserva.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase.rpc('reserve_special_capacity' as any, {
        p_cycle_id: cycleId,
        p_quantity: quantity,
        p_reason: reserveReason,
      });

      if (error) throw error;

      toast({
        title: "Capacidade reservada",
        description: `${quantity} peças foram reservadas com sucesso.`,
      });

      setReserveDialogOpen(false);
      setReserveQuantity("");
      setReserveReason("");
      
      if (onReservationChange) {
        onReservationChange();
      }
    } catch (error: any) {
      console.error("Error reserving capacity:", error);
      toast({
        title: "Erro ao reservar capacidade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseCapacity = async () => {
    const quantity = parseInt(releaseQuantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Por favor, insira uma quantidade válida maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > currentReserved) {
      toast({
        title: "Quantidade excede reserva",
        description: `Apenas ${currentReserved} peças estão reservadas.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase.rpc('release_special_capacity' as any, {
        p_cycle_id: cycleId,
        p_quantity: quantity,
      });

      if (error) throw error;

      toast({
        title: "Capacidade liberada",
        description: `${quantity} peças foram liberadas da reserva.`,
      });

      setReleaseDialogOpen(false);
      setReleaseQuantity("");
      
      if (onReservationChange) {
        onReservationChange();
      }
    } catch (error: any) {
      console.error("Error releasing capacity:", error);
      toast({
        title: "Erro ao liberar capacidade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Reserva de Capacidade
        </CardTitle>
        <CardDescription>
          Reserve capacidade para pedidos especiais - {cycleName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Reservation Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Capacidade Reservada</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currentReserved} peças
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Uso Regular</p>
            <p className="text-2xl font-bold">
              {currentUsage} peças
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponível</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {availableCapacity} peças
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Como funciona a reserva</AlertTitle>
          <AlertDescription>
            A capacidade reservada é subtraída da capacidade disponível para pedidos regulares.
            Use para garantir capacidade para pedidos especiais ou eventos específicos.
            <br />
            <strong>Fórmula:</strong> Disponível = Máximo - Uso Regular - Reservado
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Reserve Capacity Dialog */}
          <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" disabled={availableCapacity === 0}>
                <Lock className="mr-2 h-4 w-4" />
                Reservar Capacidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reservar Capacidade</DialogTitle>
                <DialogDescription>
                  Reserve capacidade para pedidos especiais. A capacidade reservada não estará
                  disponível para pedidos regulares.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reserve-quantity">
                    Quantidade (máximo: {availableCapacity})
                  </Label>
                  <Input
                    id="reserve-quantity"
                    type="number"
                    min="1"
                    max={availableCapacity}
                    value={reserveQuantity}
                    onChange={(e) => setReserveQuantity(e.target.value)}
                    placeholder="Número de peças"
                    disabled={processing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserve-reason">Motivo da Reserva</Label>
                  <Textarea
                    id="reserve-reason"
                    value={reserveReason}
                    onChange={(e) => setReserveReason(e.target.value)}
                    placeholder="Ex: Pedido especial para evento corporativo"
                    rows={3}
                    disabled={processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Descreva o motivo para referência futura
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setReserveDialogOpen(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button onClick={handleReserveCapacity} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reservando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Confirmar Reserva
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Release Capacity Dialog */}
          <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={currentReserved === 0}>
                <Unlock className="mr-2 h-4 w-4" />
                Liberar Reserva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Liberar Capacidade Reservada</DialogTitle>
                <DialogDescription>
                  Libere capacidade previamente reservada para torná-la disponível para
                  pedidos regulares.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="release-quantity">
                    Quantidade (máximo: {currentReserved})
                  </Label>
                  <Input
                    id="release-quantity"
                    type="number"
                    min="1"
                    max={currentReserved}
                    value={releaseQuantity}
                    onChange={(e) => setReleaseQuantity(e.target.value)}
                    placeholder="Número de peças"
                    disabled={processing}
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A capacidade liberada ficará imediatamente disponível para novos pedidos.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setReleaseDialogOpen(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button onClick={handleReleaseCapacity} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Confirmar Liberação
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Capacity Breakdown */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Detalhamento da Capacidade</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacidade Máxima:</span>
              <span className="font-medium">{maxCapacity} peças</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uso Regular (Pedidos):</span>
              <span className="font-medium">- {currentUsage} peças</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacidade Reservada:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                - {currentReserved} peças
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Disponível para Novos Pedidos:</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {availableCapacity} peças
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
