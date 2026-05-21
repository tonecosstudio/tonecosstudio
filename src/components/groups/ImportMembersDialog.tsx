import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useImportGroupMembers } from "@/hooks/groups/useImportGroupMembers";
import { toast } from "sonner";

interface ImportMembersDialogProps {
  groupId: string;
}

export function ImportMembersDialog({ groupId }: ImportMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { importMembers, importing, progress, result, resetImport } = useImportGroupMembers(groupId);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Por favor, selecione um arquivo CSV");
        return;
      }

      setFile(selectedFile);
      resetImport();
    }
  };

  const handleDownloadTemplate = () => {
    const template = "email,nome\nexemplo@email.com,Joao Silva\noutro@email.com,Maria Santos";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-importacao-membros.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Template baixado");
  };

  const handleImport = () => {
    if (!file) return;
    importMembers(file);
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    resetImport();
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
            Faca upload de um arquivo CSV com os emails dos membros para adicionar ao grupo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Baixe o template CSV para garantir o formato correto</span>
              <Button variant="link" size="sm" onClick={handleDownloadTemplate}>
                Baixar Template
              </Button>
            </AlertDescription>
          </Alert>

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

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando membros...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

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
                    <p className="font-medium">Resultado da Importacao</p>
                    <div className="text-sm space-y-1">
                      <p>Total de linhas: {result.total}</p>
                      <p className="text-green-600">Importados: {result.success}</p>
                      <p className="text-red-600">Falhas: {result.failed}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    Erros encontrados:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>- {error}</li>
                    ))}
                    {result.errors.length === 10 && <li className="italic">... e mais erros</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Formato do CSV:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Primeira linha deve conter os cabecalhos: email,nome</li>
              <li>Coluna "email" e obrigatoria</li>
              <li>Coluna "nome" e opcional</li>
              <li>Apenas usuarios ja cadastrados serao adicionados</li>
              <li>Membros duplicados serao ignorados</li>
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
