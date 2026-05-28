/**
 * ResponsiveFormExample Component
 *
 * Example showing how forms should stack vertically on mobile devices.
 * This demonstrates best practices for mobile-friendly form layouts.
 *
 * Requirements: 17.1-17.15
 * Task: 24.1 Implementar layouts responsivos
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Monitor, CheckCircle } from "lucide-react";

export function ResponsiveFormExample() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Formulários Responsivos - Exemplo
        </CardTitle>
        <CardDescription>
          Demonstração de como os formulários devem se comportar em diferentes tamanhos de tela
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Example 1: Basic Form Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Exemplo 1: Campos Básicos</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="example-name">Nome</Label>
              <Input id="example-name" placeholder="Seu nome completo" className="w-full" />
              <p className="text-xs text-muted-foreground">
                Em mobile: campo ocupa 100% da largura
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="example-email">Email</Label>
              <Input
                id="example-email"
                type="email"
                placeholder="seu@email.com"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Em desktop: 2 campos lado a lado</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Example 2: Textarea */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Exemplo 2: Área de Texto</h3>

          <div className="space-y-2">
            <Label htmlFor="example-message">Mensagem</Label>
            <Textarea
              id="example-message"
              placeholder="Digite sua mensagem aqui..."
              rows={3}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Áreas de texto sempre ocupam 100% da largura em todos os dispositivos
            </p>
          </div>
        </div>

        <Separator />

        {/* Example 3: Select Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Exemplo 3: Seleção</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="example-country">País</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="br">Brasil</SelectItem>
                  <SelectItem value="us">Estados Unidos</SelectItem>
                  <SelectItem value="pt">Portugal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="example-state">Estado</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sp">São Paulo</SelectItem>
                  <SelectItem value="rj">Rio de Janeiro</SelectItem>
                  <SelectItem value="mg">Minas Gerais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Best Practices */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Melhores Práticas para Mobile</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">Recomendado</h4>
                </div>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Campos empilhados verticalmente</li>
                  <li>• Botões com tamanho mínimo 44x44px</li>
                  <li>• Inputs com 100% de largura</li>
                  <li>• Espaçamento adequado entre campos</li>
                  <li>• Labels claros e visíveis</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">Evitar</h4>
                </div>
                <ul className="space-y-1 text-sm text-red-700">
                  <li>• Múltiplas colunas em mobile</li>
                  <li>• Botões muito pequenos</li>
                  <li>• Campos muito próximos</li>
                  <li>• Labels muito pequenos</li>
                  <li>• Formulários horizontais</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button className="w-full sm:w-auto" size="lg">
            Enviar Formulário
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" size="lg">
            Cancelar
          </Button>
        </div>

        {/* Responsive Tips */}
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Dicas de Responsividade</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • Use <code className="bg-blue-100 px-1 rounded">grid-cols-1 sm:grid-cols-2</code>{" "}
              para 2 colunas apenas em telas maiores
            </li>
            <li>
              • Sempre use <code className="bg-blue-100 px-1 rounded">w-full</code> em inputs para
              mobile
            </li>
            <li>• Teste em diferentes tamanhos de tela (320px, 768px, 1024px)</li>
            <li>• Garanta que botões sejam fáceis de tocar (mínimo 44x44px)</li>
            <li>• Use espaçamento vertical adequado entre campos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
