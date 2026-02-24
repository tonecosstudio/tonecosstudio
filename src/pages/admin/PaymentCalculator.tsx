import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, TrendingDown, TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PaymentCalculator() {
  const [valor, setValor] = useState<string>("500");

  // Taxas fixas Mercado Pago
  const TAXA_PIX = 0.01; // 1%
  const TAXA_VENDA_PARCELADO = 0.0498; // 4,98%
  const TAXA_PARCELAMENTO_6X = 0.0996; // 9,96%
  const TAXA_PARCELAMENTO_10X_LOJA = 0.1493; // 14,93% (loja paga)
  const TAXA_PARCELAMENTO_10X_CLIENTE = 0.2065; // 20,65% (cliente paga)
  const DESCONTO_PIX = 0.05; // 5% (OFICIAL)

  // Presets de valores
  const PRESETS = [
    { label: "Avulso", valor: 500 },
    { label: "Trimestral", valor: 1350 },
    { label: "Semestral", valor: 2700 },
  ];

  // Calcular valores
  const valorNumerico = parseFloat(valor) || 0;

  // PIX (com 5% desconto)
  const valorPix = valorNumerico * (1 - DESCONTO_PIX);
  const taxaPix = valorPix * TAXA_PIX;
  const recebePix = valorPix - taxaPix;

  // Parcelado 6x (sem juros para cliente)
  // Taxa venda + Taxa parcelamento sobre valor BASE
  const taxaVenda6x = valorNumerico * TAXA_VENDA_PARCELADO;
  const taxaParcelamento6x = valorNumerico * TAXA_PARCELAMENTO_6X;
  const totalTaxas6x = taxaVenda6x + taxaParcelamento6x;
  const recebeParcelado6x = valorNumerico - totalTaxas6x;
  const percentualLiquido6x = (recebeParcelado6x / valorNumerico) * 100;
  const valorParcela6x = valorNumerico / 6;

  // Parcelado 10x (loja paga juros - SEM JUROS para cliente)
  // Taxa venda + Taxa parcelamento sobre valor BASE
  const taxaVenda10xLoja = valorNumerico * TAXA_VENDA_PARCELADO;
  const taxaParcelamento10xLoja = valorNumerico * TAXA_PARCELAMENTO_10X_LOJA;
  const totalTaxas10xLoja = taxaVenda10xLoja + taxaParcelamento10xLoja;
  const recebeParcelado10xLoja = valorNumerico - totalTaxas10xLoja;
  const percentualLiquido10xLoja = (recebeParcelado10xLoja / valorNumerico) * 100;
  const valorParcela10xLoja = valorNumerico / 10;

  // Parcelado 10x (cliente paga juros - COM JUROS)
  // Cliente paga acréscimo de 20,65% sobre o valor BASE
  // Mercado Pago cobra:
  // - Taxa venda (4,98%) sobre o valor BASE (não sobre o total!)
  // - Taxa parcelamento (20,65%) sobre o valor BASE
  // - Cliente paga o acréscimo de 20,65%
  const acrescimoCliente = valorNumerico * TAXA_PARCELAMENTO_10X_CLIENTE;
  const valorComJuros10x = valorNumerico + acrescimoCliente;
  const taxaVenda10xCliente = valorNumerico * TAXA_VENDA_PARCELADO; // Taxa sobre BASE
  const taxaParcelamento10xCliente = valorNumerico * TAXA_PARCELAMENTO_10X_CLIENTE;
  const recebeParcelado10xCliente =
    valorComJuros10x - taxaVenda10xCliente - taxaParcelamento10xCliente;
  const valorParcela10xCliente = valorComJuros10x / 10;

  // Diferença entre PIX e Parcelado
  const diferencaValor6x = recebePix - recebeParcelado6x;
  const diferencaPercentual6x = (diferencaValor6x / recebeParcelado6x) * 100;

  const diferencaValor10xLoja = recebePix - recebeParcelado10xLoja;
  const diferencaPercentual10xLoja = (diferencaValor10xLoja / recebeParcelado10xLoja) * 100;

  const diferencaValor10xCliente = recebePix - recebeParcelado10xCliente;
  const diferencaPercentual10xCliente =
    (diferencaValor10xCliente / recebeParcelado10xCliente) * 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Calculator className="h-10 w-10" />
            Calculadora Mercado Pago
          </h1>
          <p className="text-muted-foreground">
            Simule quanto você vai receber com as taxas do Mercado Pago
          </p>
        </div>

        {/* Input de Valor */}
        <Card>
          <CardHeader>
            <CardTitle>Valor da Venda</CardTitle>
            <CardDescription>Digite o valor ou escolha um preset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Presets */}
              <div className="flex gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant={parseFloat(valor) === preset.valor ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValor(String(preset.valor))}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {preset.label}
                    <span className="ml-2 text-xs opacity-70">R$ {preset.valor}</span>
                  </Button>
                ))}
              </div>

              {/* Input manual */}
              <div className="space-y-2">
                <Label htmlFor="valor">Valor Personalizado (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="text-2xl font-bold h-14"
                  placeholder="500.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* PIX */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  PIX (5% OFF)
                </span>
                <Badge variant="default" className="bg-green-600 text-xs">
                  Melhor
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">Recebimento imediato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cliente paga:</span>
                  <span className="font-medium">R$ {valorPix.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa (1%):</span>
                  <span className="text-red-600">- R$ {taxaPix.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Você recebe:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {recebePix.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {((recebePix / valorPix) * 100).toFixed(1)}% líquido
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parcelado 6x */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                6x sem juros
              </CardTitle>
              <CardDescription className="text-xs">Cliente não paga juros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cliente paga:</span>
                  <span className="font-medium">R$ {valorNumerico.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>6x de:</span>
                  <span>R$ {valorParcela6x.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxas (14,94%):</span>
                  <span className="text-red-600">- R$ {totalTaxas6x.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Você recebe:</span>
                  <span className="text-xl font-bold text-blue-600">
                    R$ {recebeParcelado6x.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {percentualLiquido6x.toFixed(1)}% líquido
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parcelado 10x (loja paga) */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                10x sem juros
              </CardTitle>
              <CardDescription className="text-xs">Loja paga juros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cliente paga:</span>
                  <span className="font-medium">R$ {valorNumerico.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10x de:</span>
                  <span>R$ {valorParcela10xLoja.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxas (19,91%):</span>
                  <span className="text-red-600">- R$ {totalTaxas10xLoja.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Você recebe:</span>
                  <span className="text-xl font-bold text-purple-600">
                    R$ {recebeParcelado10xLoja.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {percentualLiquido10xLoja.toFixed(1)}% líquido
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parcelado 10x (cliente paga) */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  10x com juros
                </span>
                <Badge variant="secondary" className="text-xs">
                  Novo
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">Cliente paga juros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cliente paga:</span>
                  <span className="font-medium text-orange-600">
                    R$ {valorComJuros10x.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-orange-600">
                  <span>10x de:</span>
                  <span>R$ {valorParcela10xCliente.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Acréscimo (20,65%):</span>
                  <span className="text-orange-600">+ R$ {acrescimoCliente.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa venda (4,98%):</span>
                  <span className="text-red-600">- R$ {taxaVenda10xCliente.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa parcelamento (20,65%):</span>
                  <span className="text-red-600">- R$ {taxaParcelamento10xCliente.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Você recebe:</span>
                  <span className="text-xl font-bold text-orange-600">
                    R$ {recebeParcelado10xCliente.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {((recebeParcelado10xCliente / valorNumerico) * 100).toFixed(1)}% do valor base
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Comparação entre Formas de Pagamento
            </CardTitle>
            <CardDescription>Análise das diferenças</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* PIX vs 6x */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">PIX vs 6x</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Diferença em R$</p>
                    <p className="text-xl font-bold text-orange-600">
                      R$ {Math.abs(diferencaValor6x).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PIX recebe {diferencaValor6x > 0 ? "mais" : "menos"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Diferença em %</p>
                    <p className="text-xl font-bold text-orange-600">
                      {Math.abs(diferencaPercentual6x).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diferencaPercentual6x > 0 ? "A mais no PIX" : "A menos no PIX"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Economia Cliente</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {(valorNumerico - valorPix).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">5% desconto PIX</p>
                  </div>
                </div>
              </div>

              {/* PIX vs 10x com juros */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">PIX vs 10x com juros (cliente paga)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Diferença em R$</p>
                    <p className="text-xl font-bold text-orange-600">
                      R$ {Math.abs(diferencaValor10xCliente).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      10x juros recebe {diferencaValor10xCliente < 0 ? "mais" : "menos"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Diferença em %</p>
                    <p className="text-xl font-bold text-orange-600">
                      {Math.abs(diferencaPercentual10xCliente).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diferencaPercentual10xCliente < 0 ? "10x juros melhor" : "PIX melhor"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Cliente paga a mais</p>
                    <p className="text-xl font-bold text-orange-600">
                      R$ {acrescimoCliente.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">20,65% de acréscimo</p>
                  </div>
                </div>
              </div>

              {/* 6x vs 10x loja */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">6x vs 10x sem juros (loja paga)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                    <p className="text-xl font-bold text-purple-600">
                      R$ {Math.abs(recebeParcelado6x - recebeParcelado10xLoja).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">6x recebe mais</p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">10x juros vs 10x loja</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {Math.abs(recebeParcelado10xCliente - recebeParcelado10xLoja).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">10x juros recebe mais</p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Melhor opção</p>
                    <p className="text-xl font-bold text-green-600">
                      {recebeParcelado10xCliente > recebePix ? "10x juros" : "PIX"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Maior valor líquido</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Exemplos */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplos Rápidos</CardTitle>
            <CardDescription>Valores comuns e quanto você recebe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Valor</th>
                    <th className="text-right p-2 font-semibold">PIX</th>
                    <th className="text-right p-2 font-semibold">Recebe PIX</th>
                    <th className="text-right p-2 font-semibold">Recebe 6x</th>
                    <th className="text-right p-2 font-semibold">Recebe 10x juros</th>
                    <th className="text-right p-2 font-semibold">Melhor</th>
                  </tr>
                </thead>
                <tbody>
                  {[500, 1350, 2700].map((val) => {
                    const vPix = val * (1 - DESCONTO_PIX);
                    const tPix = vPix * TAXA_PIX;
                    const rPix = vPix - tPix;

                    const tVenda6x = val * TAXA_VENDA_PARCELADO;
                    const tParc6x = val * TAXA_PARCELAMENTO_6X;
                    const rParc6x = val - tVenda6x - tParc6x;

                    const acrescimo = val * TAXA_PARCELAMENTO_10X_CLIENTE;
                    const vComJuros10x = val + acrescimo;
                    const tVenda10xCliente = val * TAXA_VENDA_PARCELADO; // Taxa sobre BASE
                    const tParc10xCliente = val * TAXA_PARCELAMENTO_10X_CLIENTE;
                    const rParc10xCliente = vComJuros10x - tVenda10xCliente - tParc10xCliente;

                    const melhor =
                      rParc10xCliente > rPix && rParc10xCliente > rParc6x
                        ? "10x juros"
                        : rPix > rParc6x
                          ? "PIX"
                          : "6x";

                    return (
                      <tr key={val} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">R$ {val.toFixed(2)}</td>
                        <td className="text-right p-2 text-green-600">R$ {vPix.toFixed(2)}</td>
                        <td className="text-right p-2 font-semibold text-green-600">
                          R$ {rPix.toFixed(2)}
                        </td>
                        <td className="text-right p-2 font-semibold text-blue-600">
                          R$ {rParc6x.toFixed(2)}
                        </td>
                        <td className="text-right p-2 font-semibold text-orange-600">
                          R$ {rParc10xCliente.toFixed(2)}
                        </td>
                        <td className="text-right p-2 font-bold text-primary">{melhor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>ℹ️ Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              • <strong>Taxa PIX (1%):</strong> Aplicada em pagamentos PIX
            </p>
            <p>
              • <strong>Desconto PIX (5%):</strong> Cliente paga 5% menos no PIX
            </p>
            <p>
              • <strong>Taxa venda parcelada (4,98%):</strong> Aplicada em vendas parceladas
            </p>
            <p>
              • <strong>Taxa parcelamento 6x (9,96%):</strong> Total 14,94% (4,98% + 9,96%)
            </p>
            <p>
              • <strong>Taxa parcelamento 10x loja (14,93%):</strong> Total 19,91% - loja paga juros
            </p>
            <p>
              • <strong>Taxa parcelamento 10x cliente (20,65%):</strong> Cobrada sobre o valor BASE
            </p>
            <p>
              • <strong>Acréscimo 10x cliente (20,65%):</strong> Cliente paga 20,65% a mais sobre o
              valor BASE
            </p>
            <p className="text-green-600 font-medium">
              ✅ PIX: Apenas 1% de taxa + 5% desconto = MELHOR para você!
            </p>
            <p className="text-orange-600 font-medium">
              ⚠️ 10x com juros: Cliente paga mais, você recebe quase igual ao valor base
            </p>
            <p>
              • <strong>Recebimento:</strong> Imediato (Na Hora) em todos os casos
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
