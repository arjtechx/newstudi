"use client"

import React from 'react';
import { ScientificDashboard, SystemSettings, UserProfile } from '@/lib/types';
import { 
  CheckCircle2, 
  Target, 
  Flame, 
  Award, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  Clock,
  RefreshCcw,
  Layers,
  Skull,
  Activity,
  Loader2,
  Copy
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface StudentDashboardViewProps {
  user: UserProfile;
  stats: ScientificDashboard;
  settings: SystemSettings;
  isPreview?: boolean;
}

export function StudentDashboardView({ user, stats, settings, isPreview }: StudentDashboardViewProps) {
  const { toast } = useToast();
  
  // Filtra e ordena os widgets conforme configuração do admin
  const activeWidgets = settings.dashboard.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  const handleCopyAlert = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Mensagem Copiada", duration: 2000 });
  };

  return (
    <div className={cn(
      "flex flex-col animate-in fade-in duration-500",
      isPreview ? "h-full" : "h-[calc(100dvh-110px)] md:h-auto overflow-hidden md:overflow-visible"
    )}>
      
      {/* 🔝 1. ÁREA DE COMANDO FIXA */}
      <div className="flex flex-col gap-2 shrink-0 mb-2 md:mb-8">
        <Card className="border-2 md:border-4 border-primary/20 shadow-lg bg-white overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardHeader className="p-3 md:p-10 bg-slate-50/50 space-y-1 md:space-y-4 text-center">
            <div className="flex justify-center">
              <Badge className="bg-primary text-white font-black px-3 md:px-6 py-0.5 md:py-2 text-[8px] md:text-sm uppercase italic tracking-widest">
                🚀 PRÓXIMA MISSÃO
              </Badge>
            </div>
            <CardTitle className="text-sm md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {stats.proximaMissao.titulo}
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xl font-bold text-slate-600 line-clamp-1">
              {stats.proximaMissao.descricao}
            </CardDescription>
            <div className="flex justify-center pt-1 md:pt-4">
              <Button size="lg" className="h-9 md:h-20 w-full md:w-auto px-6 md:px-16 text-[10px] md:text-2xl font-black uppercase italic shadow-[0_3px_0_0_#1e40af] md:shadow-[0_10px_0_0_#1e40af] active:translate-y-1 transition-all gap-2" asChild>
                <Link href={isPreview ? "#" : "/questions"}>
                  <Zap className="w-3 h-3 md:w-8 md:h-8 fill-current" /> EXECUTAR AGORA
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {stats.alertasCognitivos.length > 0 && (
          <div className="flex flex-col gap-1">
            {stats.alertasCognitivos.slice(0, 1).map((alerta, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-2 md:p-5 rounded-lg flex items-center gap-3 border shadow-sm cursor-pointer group hover:opacity-80 transition-all",
                  alerta.type === 'DANGER' ? "bg-red-50 border-red-200 text-red-900" :
                  alerta.type === 'WARNING' ? "bg-amber-50 border-amber-200 text-amber-900" :
                  "bg-emerald-50 border-emerald-200 text-emerald-900"
                )}
                onClick={() => handleCopyAlert(alerta.msg)}
                title="Clique para copiar alerta"
              >
                <AlertTriangle className={cn("w-4 h-4 md:w-6 md:h-6 shrink-0", 
                  alerta.type === 'DANGER' ? "text-red-600" : 
                  alerta.type === 'WARNING' ? "text-amber-600" : "text-emerald-600")} 
                />
                <p className="text-[9px] md:text-sm font-black uppercase italic truncate flex-1">{alerta.msg}</p>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-40" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📱 LAUNCHER TÁTICO MOBILE (Exibido apenas em telas pequenas) */}
      <div className="md:hidden flex-1 relative min-h-0 flex flex-col mb-4">
        <Carousel opts={{ loop: true, align: "start" }} className="w-full h-full flex flex-col">
          <CarouselContent className="flex-1">
            {activeWidgets.map((widget) => (
              <CarouselItem key={widget.id} className="h-full flex flex-col p-1">
                {widget.id === 'kpis' && (
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <KPIBlock label="Taxa" value={`${stats.taxaAcerto}%`} color={stats.taxaAcerto < 50 ? 'text-red-600' : 'text-emerald-600'} />
                    <KPIBlock label="Risco" value={stats.risco} color={stats.risco === 'ALTO' ? 'text-red-600' : 'text-primary'} />
                    <KPIBlock label="Progresso" value={`${Math.round((stats.totalQuestoes / 1000) * 100)}%`} color="text-slate-900" />
                    <KPIBlock label="Streak" value={`${user.studyStreak || 0}d`} color="text-orange-500" icon={<Flame className="w-3 h-3 fill-current" />} />
                  </div>
                )}
                {widget.id !== 'kpis' && (
                  <CardModule stats={stats} type={widget.id as any} className="h-full" isPreview={isPreview} onCopy={handleCopyAlert} />
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
          
          <div className="flex justify-center items-center h-4 mt-2">
             <div className="flex gap-2">
                {activeWidgets.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                ))}
             </div>
          </div>
        </Carousel>
      </div>

      {/* 🖥️ DASHBOARD PANORÂMICO PC */}
      <div className="hidden md:block space-y-10">
        <div className="grid grid-cols-1 gap-10">
          {/* Seção de KPIs (se ativa) */}
          {activeWidgets.find(w => w.id === 'kpis') && (
            <div className="grid grid-cols-4 gap-6">
              <KPIBlock label="Taxa de Acerto" value={`${stats.taxaAcerto}%`} color={stats.taxaAcerto < 50 ? 'text-red-600' : 'text-emerald-600'} />
              <KPIBlock label="Risco Tático" value={stats.risco} color={stats.risco === 'ALTO' ? 'text-red-600' : 'text-primary'} />
              <KPIBlock label="Progresso" value={`${Math.round((stats.totalQuestoes / 1000) * 100)}%`} color="text-slate-900" />
              <KPIBlock label="Streak" value={`${user.studyStreak || 0}d`} color="text-orange-500" icon={<Flame className="w-4 h-4 fill-current" />} />
            </div>
          )}

          {/* Grid de módulos */}
          <div className="grid grid-cols-2 gap-8">
            {activeWidgets
              .filter(w => w.id !== 'kpis' && w.id !== 'simulado')
              .map(widget => (
                <CardModule key={widget.id} stats={stats} type={widget.id as any} isPreview={isPreview} onCopy={handleCopyAlert} />
              ))
            }
          </div>

          {/* Simulado no final (se ativo) */}
          {activeWidgets.find(w => w.id === 'simulado') && (
            <CardModule stats={stats} type="simulado" isPreview={isPreview} onCopy={handleCopyAlert} />
          )}
        </div>
      </div>

      {/* 🏆 RODAPÉ DE STATUS */}
      <div className="shrink-0 bg-slate-900 rounded-xl md:rounded-[2.5rem] p-3 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-2 md:gap-10 shadow-2xl border-t-2 border-primary/20 mt-auto">
         <div className="flex items-center gap-3 text-center md:text-left">
            <div className="bg-primary/20 p-2 rounded-full border border-primary/40 hidden sm:block">
               <Award className="w-4 h-4 text-primary" />
            </div>
            <div>
               <h4 className="text-xs md:text-4xl font-black italic tracking-tighter uppercase leading-none">Nível {user.level || 1}</h4>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[7px] md:text-sm mt-0.5">{stats.totalQuestoes} Questões no Banco</p>
            </div>
         </div>
         <div className="w-full md:w-96 space-y-1">
            <div className="flex justify-between text-[7px] md:text-xs font-black uppercase mb-1 px-1">
               <span className="text-primary">{user.xp || 0} XP</span>
               <span className="text-slate-500">{1000 - ((user.xp || 0) % 1000)} XP PARA SUBIR</span>
            </div>
            <Progress value={((user.xp || 0) % 1000) / 10} className="h-1.5 md:h-4 bg-white/10" />
         </div>
      </div>
    </div>
  );
}

function KPIBlock({ label, value, color, icon }: { label: string, value: string, color: string, icon?: React.ReactNode }) {
  return (
    <Card className="material-card p-3 md:p-6 border-2 shadow-sm flex flex-col justify-center h-full bg-white transition-transform active:scale-95">
      <CardContent className="p-0 space-y-1">
        <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
           {icon} {label}
        </span>
        <div className={cn("text-base md:text-3xl font-black italic tracking-tighter uppercase truncate", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CardModule({ stats, type, className, isPreview, onCopy }: { stats: ScientificDashboard, type: 'errors' | 'revision' | 'session' | 'performance' | 'simulado', className?: string, isPreview?: boolean, onCopy?: (t: string) => void }) {
  const linkHref = (path: string) => isPreview ? "#" : path;

  switch(type) {
    case 'errors':
      return (
        <Card className={cn("material-card border-red-200 bg-white flex flex-col overflow-hidden", className)}>
          <CardHeader className="bg-red-50/50 border-b border-red-100 p-3 md:p-4">
            <CardTitle className="flex items-center gap-2 text-red-600 uppercase font-black italic text-xs md:text-xl leading-none">
              <Skull className="w-4 h-4 md:w-6 md:h-6" /> Top Erros (ZPD)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
             {stats.topErros.length > 0 ? stats.topErros.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-red-50 transition-colors" onClick={() => onCopy?.(`${e.subject}: ${e.topic}`)}>
                   <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[7px] font-black uppercase text-slate-500 truncate">{e.subject}</span>
                      <span className="font-bold text-slate-900 text-[10px] md:text-base truncate">{e.topic}</span>
                   </div>
                   <Badge variant="destructive" className="font-black text-[8px] md:text-[10px] h-5 md:h-auto shrink-0">{e.count}x</Badge>
                </div>
             )) : <p className="text-center py-6 italic font-bold text-slate-400 text-xs">Sem erros registrados.</p>}
          </CardContent>
          <CardFooter className="p-3 md:p-4 pt-0 mt-auto">
             <Button className="w-full h-10 md:h-12 bg-red-600 font-black text-[9px] md:text-xs uppercase shadow-[0_3px_0_0_#991b1b]" asChild>
                <Link href={linkHref("/questions")}>REPARAR ERROS</Link>
             </Button>
          </CardFooter>
        </Card>
      );
    case 'revision':
      return (
        <Card className={cn("material-card border-orange-200 bg-white flex flex-col overflow-hidden", className)}>
          <CardHeader className="bg-orange-50/50 border-b border-orange-100 p-3 md:p-4">
            <CardTitle className="flex items-center gap-2 text-orange-600 uppercase font-black italic text-xs md:text-xl leading-none">
              <RefreshCcw className="w-4 h-4 md:w-6 md:h-6" /> Repetição Espaçada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
             {stats.revisaoDoDia.length > 0 ? stats.revisaoDoDia.slice(0, 4).map((r, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => onCopy?.(`${r.subject}: ${r.topic}`)}>
                   <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[7px] font-black uppercase text-slate-500 truncate">{r.subject}</span>
                      <span className="font-bold text-slate-900 text-[10px] md:text-base truncate">{r.topic}</span>
                   </div>
                   <Badge className="bg-orange-500 font-black text-[8px] md:text-[10px] h-5 md:h-auto shrink-0">{r.daysSince}d</Badge>
                </div>
             )) : <p className="text-center py-6 italic font-bold text-slate-400 text-xs">Ciclo de memória em dia.</p>}
          </CardContent>
          <CardFooter className="p-3 md:p-4 pt-0 mt-auto">
             <Button className="w-full h-10 md:h-12 bg-orange-500 font-black text-[9px] md:text-xs uppercase shadow-[0_3px_0_0_#9a3412]" asChild>
                <Link href={linkHref("/checklist")}>REVISAR AGORA</Link>
             </Button>
          </CardFooter>
        </Card>
      );
    case 'session':
      return (
        <Card className={cn("material-card border-indigo-200 bg-white flex flex-col overflow-hidden", className)}>
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 p-3 md:p-4">
            <CardTitle className="flex items-center gap-2 text-indigo-600 uppercase font-black italic text-xs md:text-xl leading-none">
              <Layers className="w-4 h-4 md:w-6 md:h-6" /> Intercalação Tática
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-2 flex-1">
             {stats.sessaoSugerida.materias.map((m, i) => (
                <div key={i} className="p-2 bg-indigo-50/30 rounded-lg border border-indigo-100 flex justify-between items-center">
                   <span className="font-black uppercase text-[8px] md:text-xs text-indigo-900 truncate pr-2">{m.name}</span>
                   <span className="font-bold text-indigo-600 text-[8px] md:text-xs shrink-0">{m.qCount} ALVOS</span>
                </div>
             ))}
             <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 mt-2 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => onCopy?.("DICA: Alterne as matérias a cada bloco para maximizar a retenção cognitiva.")}>
                <p className="text-[7px] font-bold text-amber-700 leading-tight">DICA: Alterne as matérias a cada bloco para maximizar a retenção cognitiva.</p>
             </div>
          </CardContent>
          <CardFooter className="p-3 md:p-4 pt-0 mt-auto">
             <Button className="w-full h-10 md:h-12 bg-indigo-600 font-black text-[9px] md:text-xs uppercase shadow-[0_3px_0_0_#3730a3]" asChild>
                <Link href={linkHref("/questions")}>ABRIR SESSÃO</Link>
             </Button>
          </CardFooter>
        </Card>
      );
    case 'performance':
      return (
        <Card className={cn("material-card border-slate-200 bg-white flex flex-col overflow-hidden", className)}>
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-3 md:p-4">
            <CardTitle className="flex items-center gap-2 text-slate-900 uppercase font-black italic text-xs md:text-xl leading-none">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6" /> Performance por Área
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1 custom-scrollbar">
             {stats.subjectStats.slice(0, 5).map((s, i) => (
                <div key={i} className="space-y-1.5 cursor-pointer group" onClick={() => onCopy?.(`${s.name}: ${s.accuracy}% acerto`)}>
                   <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase">
                      <span className="truncate max-w-[150px] md:max-w-none group-hover:text-primary transition-colors">{s.name}</span>
                      <span className={cn(s.accuracy < 50 ? 'text-red-600' : 'text-primary')}>{s.accuracy}%</span>
                   </div>
                   <Progress value={s.accuracy} className="h-1 md:h-2" />
                </div>
             ))}
          </CardContent>
        </Card>
      );
    case 'simulado':
      return (
        <Card className={cn("material-card border-emerald-200 bg-emerald-50/30 flex flex-col h-full", className)}>
          <CardContent className="p-4 md:p-10 flex flex-col items-center justify-center gap-4 md:gap-8 text-center h-full cursor-pointer group" onClick={() => onCopy?.(`Projeção de Nota: ${stats.simulado.notaAtual} / Alvo de Corte: ${stats.simulado.notaCorte}`)}>
             <div className="bg-emerald-500 p-3 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-lg animate-pulse group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 md:w-12 md:h-12" />
             </div>
             <div>
                <h3 className="text-lg md:text-4xl font-black uppercase italic tracking-tighter">Projeção de Nota</h3>
                <p className="text-[8px] md:text-sm font-bold text-slate-500 uppercase tracking-widest">Baseado na sua acurácia real</p>
             </div>
             <div className="flex gap-6 md:gap-16 items-center">
                <div className="text-center">
                   <span className="text-[8px] md:text-xs font-black uppercase text-slate-500">Sua Nota</span>
                   <div className="text-3xl md:text-7xl font-black italic text-emerald-600">{stats.simulado.notaAtual}</div>
                </div>
                <div className="h-10 md:h-24 w-1 bg-emerald-200 rounded-full" />
                <div className="text-center">
                   <span className="text-[8px] md:text-xs font-black uppercase text-slate-500">Alvo (Corte)</span>
                   <div className="text-3xl md:text-7xl font-black italic text-slate-400">{stats.simulado.notaCorte}</div>
                </div>
             </div>
             <Badge variant="outline" className="mt-4 border-emerald-500 text-emerald-700 font-black uppercase text-[8px] md:text-xs px-4">
                STATUS: {stats.taxaAcerto >= 70 ? 'EM ZONA DE APROVAÇÃO' : 'ABAIXO DA MÉDIA TÁTICA'}
             </Badge>
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
}
