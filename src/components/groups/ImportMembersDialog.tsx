import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ImportMembersDialogProps {
  groupId: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function ImportMembersDialog({ groupId }: ImportMembersDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Por favor, selecione um arquivo CSV");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = "email,nome\nexemplo@email.com,João Silva\noutro@email.com,Maria Santos";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-importacao-membros.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template baixado");
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Ler arquivo
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error("Arquivo vazio ou inválido");
        setImporting(false);
        return;
      }

      // Validar header
      const header = lines[0].toLowerCase().split(",");
      const emailIndex = header.findIndex((h) => h.trim() === "email");
      const nameIndex = header.findIndex((h) => h.trim() === "nome");

      if (emailIndex === -1) {
        toast.error("Coluna 'email' não encontrada no CSV");
        setImporting(false);
        return;
      }

      // Processar linhas
      const members: Array<{ email: string; name?: string }> = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const columns = line.split(",").map((col) => col.trim());

        const email = columns[emailIndex];
        const name = nameIndex !== -1 ? columns[nameIndex] : undefined;

        // Validar email
        if (!email || !email.includes("@")) {
          errors.push(`Linha ${i + 1}: Email inválido "${email}"`);
          continue;
        }

        members.push({ email, name });
      }

      // Importar em lotes de 50
      const BATCH_SIZE = 50;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE);

        // Buscar usuários por email
        const { data: users, error: usersError } = await supabase
          .from("profiles")
          .select("id, email")
          .in(
            "email",
            batch.map((m) => m.email)
          );

        if (usersError) {
          errors.push(`Erro ao buscar usuários: ${usersError.message}`);
          failedCount += batch.length;
          continue;
        }

        // Criar mapeamento email -> user_id
        const emailToUserId = new Map(users?.map((u) => [u.email, u.id]) || []);

        // Adicionar membros ao grupo
        const membersToAdd = batch
          .filter((m) => emailToUserId.has(m.email))
          .map((m) => ({
            group_id: groupId,
            user_id: emailToUserId.get(m.email)!,
            added_by: user.id,
          }));

        if (membersToAdd.length > 0) {
          const { error: insertError } = await supabase
            .from("chat_group_members")
            .insert(membersToAdd)
            .select();

          if (insertError) {
            // Ignorar erros de duplicata
            if (!insertError.message.includes("duplicate")) {
              errors.push(`Erro ao adicionar membros: ${insertError.message}`);
              failedCount += membersToAdd.length;
            } else {
              successCount += membersToAdd.length;
            }
          } else {
            successCount += membersToAdd.length;
          }
        }

        // Registrar emails não encontrados
        batch.forEach((m) => {
          if (!emailToUserId.has(m.email)) {
            errors.push(`Email não encontrado no sistema: ${m.email}`);
            failedCount++;
          }
        });

        // Atualizar progresso
        setProgress(Math.round(((i + batch.length) / members.length) * 100));
      }

      // Resultado final
      setResult({
        total: members.length,
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Mostrar apenas os primeiros 10 erros
      });

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-metrics", groupId] });

      if (successCount > 0) {
        toast.success(`${successCount} membros importados com sucesso`);
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} membros não puderam ser importados`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar membros");
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar Membros</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com os emails dos membros para adicionar ao grupo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Baixe o template CSV para garantir o formato correto</span>
              <Button variant="link" size="sm" onClick={handleDownloadTemplate}>
                Baixar Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* File Input */}
          <div>
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="mt-1"
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando membros...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <Alert className={result.success > 0 ? "border-green-500" : "border-red-500"}>
                {result.success > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Resultado da Importação</p>
                    <div className="text-sm space-y-1">
                      <p>Total de linhas: {result.total}</p>
                      <p className="text-green-600">✓ Importados: {result.success}</p>
                      <p className="text-red-600">✗ Falhas: {result.failed}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    Erros encontrados:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {result.errors.length === 10 && <li className="italic">... e mais erros</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Formato do CSV:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Primeira linha deve conter os cabeçalhos: email,nome</li>
              <li>Coluna "email" é obrigatória</li>
              <li>Coluna "nome" é opcional</li>
              <li>Apenas usuários já cadastrados serão adicionados</li>
              <li>Membros duplicados serão ignorados</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? "Importando..." : "Importar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
