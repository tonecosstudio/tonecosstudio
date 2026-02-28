/**
 * Capacity Alert Configuration Component
 * 
 * Allows administrators to configure capacity alert thresholds
 * and notification channels (email, SMS) for cycles.
 * 
 * Requirements: 16.5
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  configureAlert,
  getAlertConfig,
  getAlertStatus,
  resetAlert,
  type AlertConfig,
  type AlertStatus
} from "@/services/capacity-alert-service";

interface CapacityAlertConfigProps {
  cycleId: string;
  cycleName: string;
  currentPercentage: number;
}

export function CapacityAlertConfig({ cycleId, cycleName, currentPercentage }: CapacityAlertConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const [config, setConfig] = useState<AlertConfig>({
    threshold: 80,
    email: null,
    sms: null
  });
  
  const [status, setStatus] = useState<AlertStatus | null>(null);
  
  const [formData, setFormData] = useState({
    threshold: "80",
    email: "",
    sms: ""
  });

  useEffect(() => {
    loadAlertConfig();
  }, [cycleId]);

  const loadAlertConfig = async () => {
    try {
      setLoading(true);
      
      const [configData, statusData] = await Promise.all([
        getAlertConfig(cycleId),
        getAlertStatus(cycleId)
      ]);
      
      setConfig(configData);
      setStatus(statusData);
      
      setFormData({
        threshold: configData.threshold.toString(),
        email: configData.email || "",
        sms: configData.sms || ""
      });
    } catch (error: any) {
      console.error("Error loading alert config:", error);
      toast({
        title: "Erro ao carregar configuração",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const threshold = parseInt(formData.threshold);
      
      if (isNaN(threshold) || threshold < 1 || threshold > 100) {
        toast({
          title: "Valor inválido",
          description: "O limite deve estar entre 1 e 100%",
          variant: "destructive"
        });
        return;
      }
      
      await configureAlert(cycleId, {
        threshold,
        email: formData.email.trim() || null,
        sms: formData.sms.trim() || null
      });
      
      toast({
        title: "Configuração salva",
        description: "As configurações de alerta foram atualizadas com sucesso."
      });
      
      await loadAlertConfig();
    } catch (error: any) {
      console.error("Error saving alert config:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      
      await resetAlert(cycleId);
      
      toast({
        title: "Alerta resetado",
        description: "O alerta foi resetado e poderá ser disparado novamente."
      });
      
      await loadAlertConfig();
    } catch (error: any) {
      console.error("Error resetting alert:", error);
      toast({
        title: "Erro ao resetar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configuração de Alertas - {cycleName}
        </CardTitle>
        <CardDescription>
          Configure alertas automáticos quando a capacidade atingir um limite específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Status */}
        {status && (
          <div>
            {status.triggered ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Alerta Disparado</AlertTitle>
                <AlertDescription>
                  O alerta foi disparado em {status.triggeredAt?.toLocaleString('pt-BR')} quando a capacidade atingiu {status.threshold}%.
                  Capacidade atual: {status.currentPercentage}%
                </AlertDescription>
              </Alert>
            ) : currentPercentage >= config.threshold ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Limite Atingido</AlertTitle>
                <AlertDescription>
                  A capacidade atual ({currentPercentage}%) atingiu ou ultrapassou o limite configurado ({config.threshold}%).
                  O alerta será disparado automaticamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Alerta Ativo</AlertTitle>
                <AlertDescription>
                  Capacidade atual: {status.currentPercentage}% / Limite: {status.threshold}%
                  {status.currentPercentage < status.threshold && (
                    <> - Faltam {status.threshold - status.currentPercentage}% para disparar o alerta</>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Threshold Configuration */}
        <div className="space-y-2">
          <Label htmlFor="threshold">
            Limite de Alerta (%)
          </Label>
          <Input
            id="threshold"
            type="number"
            min="1"
            max="100"
            value={formData.threshold}
            onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            O alerta será disparado quando a capacidade atingir este percentual (padrão: 80%)
          </p>
        </div>

        {/* Email Configuration */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email para Alertas
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@ordax.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            Email que receberá notificações quando o limite for atingido (opcional)
          </p>
        </div>

        {/* SMS Configuration */}
        <div className="space-y-2">
          <Label htmlFor="sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Telefone para SMS
          </Label>
          <Input
            id="sms"
            type="tel"
            placeholder="+5571999999999"
            value={formData.sms}
            onChange={(e) => setFormData({ ...formData, sms: e.target.value })}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            Número de telefone que receberá SMS quando o limite for atingido (opcional, formato: +5571999999999)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || resetting}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configuração"
            )}
          </Button>
          
          {status?.triggered && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving || resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                "Resetar Alerta"
              )}
            </Button>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Como funcionam os alertas:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O alerta é verificado automaticamente quando a capacidade aumenta</li>
            <li>Quando o limite é atingido, notificações são enviadas para os canais configurados</li>
            <li>O alerta é disparado apenas uma vez por ciclo</li>
            <li>Use o botão "Resetar Alerta" para permitir novo disparo (útil para testes)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
