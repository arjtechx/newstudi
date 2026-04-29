"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileWarning, 
  Terminal, 
  Search,
  BookCopy,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function PDFImportPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-headline font-black tracking-tight flex items-center gap-3 text-primary">
            <Terminal className="w-8 h-8" /> IMPORTAÇÃO TÁTICA
          </h1>
          <p className="text-muted-foreground italic">Sistema de carga manual e via JSON (Processamento 100% Determinístico).</p>
        </div>
      </div>

      <Card className="material-card border-dashed border-2 p-12 text-center bg-muted/20">
        <CardContent className="space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
            <FileWarning className="w-8 h-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tighter">Motor de Extração Off-line</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Para garantir a integridade total das questões de bancas oficiais, o processamento automatizado foi substituído pela <strong>Importação em Lote via JSON</strong>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
             <Button asChild className="h-14 px-8 font-black gap-2">
               <Link href="/admin/questions">
                 <BookCopy className="w-5 h-5" /> IR PARA IMPORTADOR JSON
               </Link>
             </Button>
             <Button variant="outline" asChild className="h-14 px-8 font-black gap-2">
               <Link href="/admin/questions">
                 <Plus className="w-5 h-5" /> CADASTRAR MANUALMENTE
               </Link>
             </Button>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 max-w-lg mx-auto text-left">
            <p className="text-[10px] font-black uppercase text-primary mb-2">Protocolo de Operação Interna:</p>
            <ul className="text-xs space-y-1 text-muted-foreground font-medium">
              <li>• Use o botão "Importar JSON" na tela de questões.</li>
              <li>• O sistema validará a estrutura via Script Zod e evitará duplicidade automaticamente.</li>
              <li>• Mantenha o backup do sistema sempre atualizado no Terminal de Dados.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
