/**
 * AttachmentUploadExample - Demonstration of AttachmentUpload component usage
 * 
 * This example shows:
 * - Basic usage in full mode
 * - Compact mode for message input
 * - File management (add/remove)
 * - Integration with upload service
 */

import React, { useState } from 'react';
import { AttachmentUpload } from './AttachmentUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, MessageSquare } from 'lucide-react';

export const AttachmentUploadExample: React.FC = () => {
  const [fullModeFiles, setFullModeFiles] = useState<File[]>([]);
  const [compactModeFiles, setCompactModeFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFullModeFilesSelected = (files: File[]) => {
    setFullModeFiles(files);
    setUploadStatus(`${files.length} arquivo(s) selecionado(s) no modo completo`);
  };

  const handleCompactModeFilesSelected = (files: File[]) => {
    setCompactModeFiles(files);
    setUploadStatus(`${files.length} arquivo(s) selecionado(s) no modo compacto`);
  };

  const handleRemoveFullModeFile = (index: number) => {
    setFullModeFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatus(`Arquivo removido do modo completo`);
  };

  const handleRemoveCompactModeFile = (index: number) => {
    setCompactModeFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatus(`Arquivo removido do modo compacto`);
  };

  const simulateUpload = (files: File[]) => {
    setUploadStatus('Simulando upload...');
    setTimeout(() => {
      setUploadStatus(`✓ ${files.length} arquivo(s) enviado(s) com sucesso!`);
    }, 1500);
  };

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">AttachmentUpload Component</h1>
        <p className="text-muted-foreground">
          Componente para upload de anexos em mensagens de chat com suporte a imagens (JPEG, PNG) e PDFs até 5MB.
        </p>
      </div>

      {/* Status Alert */}
      {uploadStatus && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>{uploadStatus}</AlertDescription>
        </Alert>
      )}

      {/* Full Mode Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Modo Completo
          </CardTitle>
          <CardDescription>
            Interface completa com drag & drop, preview de imagens e lista de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AttachmentUpload
            onFilesSelected={handleFullModeFilesSelected}
            onRemoveFile={handleRemoveFullModeFile}
            selectedFiles={fullModeFiles}
            maxFiles={5}
          />

          {fullModeFiles.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {fullModeFiles.length} arquivo(s) selecionado(s)
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Total: {Math.round(fullModeFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB
                </span>
              </div>
              <Button onClick={() => simulateUpload(fullModeFiles)}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Arquivos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Compact Mode Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Modo Compacto
          </CardTitle>
          <CardDescription>
            Interface compacta para uso em campos de mensagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              Exemplo de uso em um campo de mensagem:
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  className="w-full min-h-[80px] p-3 border rounded-lg resize-none"
                  placeholder="Digite sua mensagem..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <AttachmentUpload
                  onFilesSelected={handleCompactModeFilesSelected}
                  onRemoveFile={handleRemoveCompactModeFile}
                  selectedFiles={compactModeFiles}
                  compact={true}
                  maxFiles={3}
                />
                <Button size="sm">Enviar</Button>
              </div>
            </div>
          </div>

          {compactModeFiles.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {compactModeFiles.length} arquivo(s) selecionado(s)
                </Badge>
              </div>
              <Button onClick={() => simulateUpload(compactModeFiles)} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Uso</CardTitle>
          <CardDescription>
            Como integrar o AttachmentUpload em sua aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Modo Completo</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`<AttachmentUpload
  onFilesSelected={(files) => setSelectedFiles(files)}
  onRemoveFile={(index) => removeFile(index)}
  selectedFiles={selectedFiles}
  maxFiles={5}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Modo Compacto</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`<AttachmentUpload
  onFilesSelected={(files) => setSelectedFiles(files)}
  selectedFiles={selectedFiles}
  compact={true}
  maxFiles={3}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Props</h4>
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">onFilesSelected</code> - Callback quando arquivos são selecionados</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">onRemoveFile</code> - Callback quando arquivo é removido (opcional)</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">selectedFiles</code> - Array de arquivos selecionados</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">maxFiles</code> - Número máximo de arquivos (padrão: 5)</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">disabled</code> - Desabilita o componente</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">compact</code> - Ativa modo compacto</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Validações</h4>
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Tipos aceitos: JPEG, PNG, PDF</li>
              <li>Tamanho máximo: 5MB por arquivo</li>
              <li>Validação antes do upload (client-side)</li>
              <li>Preview automático para imagens</li>
              <li>Ícone PDF para documentos</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Features</h4>
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Drag & drop de arquivos</li>
              <li>Seleção múltipla de arquivos</li>
              <li>Preview de imagens (200x200px)</li>
              <li>Exibição de nome e tamanho para PDFs</li>
              <li>Validação de tipo e tamanho</li>
              <li>Mensagens de erro claras</li>
              <li>Remoção individual de arquivos</li>
              <li>Limite configurável de arquivos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Cobertura de Requisitos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="secondary">4.1</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Suporte a imagens (JPEG, PNG) até 5MB</p>
                <p className="text-xs text-muted-foreground">
                  ✓ Validação de tipo e tamanho implementada
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary">4.2</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Suporte a PDFs até 5MB</p>
                <p className="text-xs text-muted-foreground">
                  ✓ Validação de tipo e tamanho implementada
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary">4.6</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Validar tipo e tamanho antes de upload</p>
                <p className="text-xs text-muted-foreground">
                  ✓ Validação client-side antes de aceitar arquivos
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
