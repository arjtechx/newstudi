
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Terminal as TerminalIcon, 
  ShieldAlert, 
  Database, 
  Activity,
  CheckCircle2,
  Trash2,
  Rocket,
  HardDrive,
  RefreshCcw,
  Zap,
  History,
  FileCode,
  AlertTriangle,
  Loader2,
  Copy,
  ChevronRight
} from 'lucide-react';
import { runFullDataAudit, purgeOrphanAttempts, migrateToGCMMarica, runLoadSimulator, toggleMaintenanceMode } from '@/lib/maintenance-actions';
import { getSystemLogs } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MaintenancePage() {
  const firestore = useFirestore();
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `> [${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchHistoryLogs = async () => {
    const data = await getSystemLogs(firestore);
    setSystemLogs(data);
  };

  useEffect(() => { fetchHistoryLogs(); }, [firestore]);

  const runAudit = async () => {
    setIsProcessing(true);
    setProgress(10);
    setLogs(["> [INIT] DEEP SCAN ATIVADO..."]);
    try {
      await runFullDataAudit(addLog);
      setProgress(100);
      toast({ title: "Deep Scan Concluído" });
    } catch (e) { 
      addLog(`! ERRO CRÍTICO: ${e instanceof Error ? e.message : 'Falha desconhecida'}`);
      setProgress(0); 
    }
    finally { setIsProcessing(false); }
  };

  const handleMigrateGCM = async () => {
    setIsProcessing(true);
    setProgress(5);
    setLogs(["> [PROTOCOL] INICIANDO MIGRAÇÃO GCM MARICÁ..."]);
    try {
      await migrateToGCMMarica(addLog);
      setProgress(100);
      toast({ title: "Migração Finalizada" });
    } catch (e: any) {
      addLog(`! ERRO NA MIGRAÇÃO: ${e.message}`);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const runSimulator = async () => {
    setIsProcessing(true);
    addLog("Iniciando Simulador de Stress...");
    await runLoadSimulator(addLog);
    setIsProcessing(false);
    toast({ title: "Carga Sintética Gerada" });
  };

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Linha de log salva na área de transferência.", duration: 2000 });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-primary">
            <TerminalIcon className="w-8 h-8" /> Kernel Operacional
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest italic">Ferramentas Admin de Nível Industrial</p>
        </div>
      </div>

      <Tabs defaultValue="terminal" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 bg-muted/50 border-2 rounded-xl mb-6">
          <TabsTrigger value="terminal" className="font-black uppercase text-xs gap-2">Terminal</TabsTrigger>
          <TabsTrigger value="history" className="font-black uppercase text-xs gap-2">Logs de Versão</TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Progress value={progress} className="h-2 bg-slate-200" />
            <Card className="material-card border-2 bg-slate-950 text-emerald-500 overflow-hidden shadow-2xl font-mono text-xs relative">
               <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/5 flex flex-row items-center justify-between space-y-0 py-3 px-6">
                  <CardTitle className="text-sm font-black flex items-center gap-2 italic">
                      <Activity className="w-4 h-4" /> ENGINE_v3.2_ROOT
                  </CardTitle>
                  <span className="text-[9px] uppercase font-bold opacity-50">Clique nas linhas para copiar</span>
               </CardHeader>
               <CardContent className="p-0">
                  <div ref={scrollRef} className="h-[450px] p-6 overflow-y-auto custom-scrollbar">
                     {logs.map((log, i) => (
                        <p 
                          key={i} 
                          className={cn(
                            "flex gap-2 mb-1 group cursor-pointer hover:bg-emerald-500/10 transition-colors rounded px-1", 
                            log.includes("!") ? "text-amber-400" : ""
                          )}
                          onClick={() => handleCopyLog(log)}
                        >
                          <span className="opacity-30 shrink-0">admin@base:~$</span> 
                          <span className="flex-1">{log}</span>
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-40 ml-2" />
                        </p>
                     ))}
                     {isProcessing && <div className="w-2 h-4 bg-emerald-500 animate-pulse ml-2 inline-block align-middle" />}
                  </div>
               </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="material-card border-2 border-primary/20 bg-white">
              <CardHeader><CardTitle className="text-lg font-black uppercase italic">Protocolos Root</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full h-16 font-black justify-start gap-4 shadow-[0_4px_0_0_#1e40af] text-sm" onClick={runAudit} disabled={isProcessing}>
                  <Database className="w-6 h-6" /> DEEP SCAN (INTEGRIDADE)
                </Button>
                
                <Button className="w-full h-16 font-black justify-start gap-4 border-2 border-primary text-primary shadow-[0_4px_0_0_#2563eb] text-sm group" onClick={handleMigrateGCM} disabled={isProcessing}>
                  <Rocket className="w-6 h-6 group-hover:animate-bounce" /> MIGRAÇÃO: GCM MARICÁ
                </Button>

                <Button variant="outline" className="w-full h-14 font-black justify-start gap-4 border-2 border-primary text-primary" onClick={runSimulator} disabled={isProcessing}>
                  <Zap className="w-5 h-5" /> SIMULADOR DE STRESS
                </Button>
                
                <Button variant="outline" className="w-full h-14 font-black justify-start gap-4 border-2 border-amber-500 text-amber-600" onClick={() => toggleMaintenanceMode(true, ['questions'])} disabled={isProcessing}>
                  <ShieldAlert className="w-5 h-5" /> MODO MANUTENÇÃO
                </Button>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4">
                 <p className="text-[9px] font-black text-amber-800 uppercase italic leading-tight">
                   AVISO: Ações de Root são permanentes e afetam todos os usuários simultaneamente.
                 </p>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="material-card border-2 overflow-hidden shadow-xl">
             <div className="divide-y">
                {systemLogs.length > 0 ? systemLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleCopyLog(`${log.userName} executou ${log.action} em ${log.entityType} ID: ${log.entityId}`)}>
                     <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg text-white", log.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500')}>
                           {log.action === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                        </div>
                        <div>
                           <p className="text-sm font-black uppercase tracking-tight">{log.userName} executou {log.action}</p>
                           <p className="text-[10px] text-muted-foreground font-bold">{log.entityType} ID: {log.entityId}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <Badge variant="outline" className="font-mono text-[9px]">{log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd/MM HH:mm") : '-'}</Badge>
                        <Copy className="w-3 h-3 opacity-20" />
                     </div>
                  </div>
                )) : <div className="p-20 text-center text-muted-foreground font-black uppercase text-xs italic">Nenhum log de versão localizado.</div>}
             </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
