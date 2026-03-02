/**
 * Página Consolidada: Modelos & Franquias
 * 
 * Integra as funcionalidades de AdminModels e AdminFranchises
 * em uma única página com navegação por abas.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminModels from "./AdminModels";
import AdminFranchises from "./AdminFranchises";

export default function AdminModelsAndFranchises() {
  const [activeTab, setActiveTab] = useState<string>("models");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modelos & Franquias</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie modelos de produtos e franquias do catálogo
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="franchises">Franquias</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-6">
          <AdminModels />
        </TabsContent>

        <TabsContent value="franchises" className="mt-6">
          <AdminFranchises />
        </TabsContent>
      </Tabs>
    </div>
  );
}
