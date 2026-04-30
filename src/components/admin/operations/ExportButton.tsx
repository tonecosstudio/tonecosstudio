import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ExportFormat = "csv" | "excel" | "json";

interface ExportButtonProps {
  data: any[];
  filename: string;
  onExport?: (format: ExportFormat) => Promise<void>;
  className?: string;
  allowColumnSelection?: boolean;
}

export function ExportButton({
  data,
  filename,
  onExport,
  className,
  allowColumnSelection = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const { toast } = useToast();

  // Inicializar colunas disponíveis
  const initializeColumns = () => {
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      setAvailableColumns(columns);
      setSelectedColumns(columns); // Todas selecionadas por padrão
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(availableColumns);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const filterDataByColumns = (data: any[]) => {
    if (!allowColumnSelection || selectedColumns.length === 0) {
      return data;
    }
    return data.map((row) => {
      const filtered: any = {};
      selectedColumns.forEach((col) => {
        if (col in row) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados disponíveis para exportação.",
        variant: "destructive",
      });
      return;
    }

    // Obter headers
    const headers = Object.keys(data[0]);

    // Criar CSV
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escapar vírgulas e aspas
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados disponíveis para exportação.",
        variant: "destructive",
      });
      return;
    }

    // Obter headers
    const headers = Object.keys(data[0]);

    // Criar HTML table
    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Dados</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #4472C4; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Download
    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    link.click();
  };

  const exportToJSON = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados disponíveis para exportação.",
        variant: "destructive",
      });
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);

    try {
      // Filtrar dados pelas colunas selecionadas
      const dataToExport = filterDataByColumns(data);

      if (onExport) {
        await onExport(format);
      } else {
        // Exportação padrão
        switch (format) {
          case "csv":
            exportToCSV(dataToExport, filename);
            break;
          case "json":
            exportToJSON(dataToExport, filename);
            break;
          case "excel":
            exportToExcel(dataToExport, filename);
            break;
        }
      }

      toast({
        title: "Exportação concluída",
        description: `Dados exportados com sucesso em formato ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setShowColumnDialog(false);
    }
  };

  const handleExportClick = (format: ExportFormat) => {
    if (allowColumnSelection) {
      initializeColumns();
      setSelectedFormat(format);
      setShowColumnDialog(true);
    } else {
      handleExport(format);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExportClick("csv")}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportClick("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportClick("json")}>
            <FileText className="h-4 w-4 mr-2" />
            JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Seleção de Colunas */}
      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Colunas</DialogTitle>
            <DialogDescription>
              Escolha quais colunas deseja incluir na exportação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllColumns}>
                Selecionar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllColumns}>
                Desmarcar Todas
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-4">
              {availableColumns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={column}
                    checked={selectedColumns.includes(column)}
                    onCheckedChange={() => toggleColumn(column)}
                  />
                  <Label htmlFor={column} className="text-sm font-normal cursor-pointer">
                    {column}
                  </Label>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedColumns.length} de {availableColumns.length} colunas selecionadas
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleExport(selectedFormat)}
              disabled={selectedColumns.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
