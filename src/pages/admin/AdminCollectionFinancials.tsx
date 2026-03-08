// AdminCollectionFinancials - v3.0
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

export default function AdminCollectionFinancials() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Buscar todas as coleções com resumo financeiro
  const { data: collections } = useQuery({
    queryKey: ["collections-financial-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections_financial_summary")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Buscar análise detalhada da coleção selecionada
  const { data: analysis } = useQuery({
    queryKey: ["collection-financial-analysis", selectedCollection],
    queryFn: async () => {
      if (!selectedCollection) return null;

      const { data, error } = await supabase.rpc("get_collection_financial_analysis", {
        p_collection_id: selectedCollection,
      });

      if (error) throw error;
      return data?.[0];
    },
    enabled: !!selectedCollection,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          Análise Financeira das Coleções
        </h2>
        <p className="text-muted-foreground">Custos, lucros, margens e ROI por coleção</p>
      </div>

        {/* Resumo Geral */}
        {collections && collections.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Coleções
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{collections.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {collections.filter((c) => c.is_active).length} ativas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lucro Médio (PIX)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  R${" "}
                  {(
                    collections.reduce((sum, c) => sum + (c.profit_pix_gross || 0), 0) /
                    collections.length
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Por peça vendida</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Margem Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {(
                    collections.reduce((sum, c) => sum + (c.margin_pix_gross || 0), 0) /
                    collections.length
                  ).toFixed(1)}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">Margem bruta PIX</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Melhor Margem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {Math.max(...collections.map((c) => c.margin_pix_gross || 0)).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {
                    collections.find(
                      (c) =>
                        c.margin_pix_gross ===
                        Math.max(...collections.map((c) => c.margin_pix_gross || 0))
                    )?.name
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Coleções */}
        <Card>
          <CardHeader>
            <CardTitle>Coleções</CardTitle>
            <CardDescription>Clique em uma coleção para ver análise detalhada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections?.map((collection) => (
                <Card
                  key={collection.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedCollection === collection.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{collection.name}</CardTitle>
                      {collection.is_active ? (
                        <Badge variant="default" className="text-xs">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço PIX:</span>
                        <p className="font-semibold">R$ {collection.price_pix?.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Custo:</span>
                        <p className="font-semibold">R$ {collection.cost_total?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Lucro Bruto:</span>
                        <span
                          className={`font-bold ${collection.profit_pix_gross > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          R$ {collection.profit_pix_gross?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Margem:</span>
                        <span
                          className={`font-bold ${
                            collection.margin_pix_gross > 50
                              ? "text-green-600"
                              : collection.margin_pix_gross > 30
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {collection.margin_pix_gross?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Análise Detalhada */}
        {selectedCollection && analysis && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Análise Financeira Detalhada</CardTitle>
                  <CardDescription>Métricas completas da coleção</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCollection(null)}>
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Preço PIX</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {analysis.price_pix?.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Custo Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      R$ {analysis.cost_total?.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Lucro Líquido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {analysis.net_profit_pix?.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Margem Líquida</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {analysis.net_margin_pix?.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {analysis.roi_pix?.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Breakeven</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.breakeven_units || 0}</div>
                    <p className="text-xs text-muted-foreground">unidades</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
