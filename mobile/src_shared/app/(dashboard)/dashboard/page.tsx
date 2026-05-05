
"use client"

import React, { useState, useEffect } from 'react';
import { getScientificDashboardData, getNotifications } from '@/lib/store';
import { ScientificDashboard, SystemSettings, UserProfile, AppNotification } from '@/lib/types';
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
  GraduationCap,
  Megaphone,
  Bell,
  Info,
  Sword,
  Network,
  Map as MapIcon
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useFirebase } from '@/firebase';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const { settings } = useFirebase();
  const firestore = useFirestore();
  const [stats, setStats] = useState<ScientificDashboard | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ✅ Hooks todos declarados antes de qualquer early return
  const mobileAutoplay = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })
  );
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!user?.id || !firestore) return;
    getScientificDashboardData(firestore, user.id).then(setStats);
    getNotifications(firestore, true).then(setNotifications);
  }, [user, firestore]);

  // Atualiza o índice central ao navegar no carrossel
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  if (isUserLoading || !user || !stats || !settings) {
    return (
       <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
    );
  }

  const activeWidgets = settings.dashboard.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-[calc(100dvh-110px)] md:h-auto overflow-hidden md:overflow-visible animate-in fade-in duration-500">
      
      {/* 📢 1. ÁREA DE NOTIFICAÇÕES GLOBAIS */}
      {notifications.length > 0 && activeWidgets.find(w => w.id === 'broadcast_alerts') && (
        <div className="space-y-2 mb-6">
          {notifications.map((notif) => (
            <div key={notif.id} className={cn(
              "p-4 md:p-6 rounded-[1.5rem] border-2 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2 duration-500",
              notif.type === 'danger' ? "bg-red-50 border-red-200 text-red-900" :
              notif.type === 'warning' ? "bg-amber-50 border-amber-200 text-amber-900" :
              notif.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
              "bg-blue-50 border-blue-200 text-blue-900"
            )}>
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                notif.type === 'danger' ? "bg-red-200" : notif.type === 'warning' ? "bg-amber-200" : notif.type === 'success' ? "bg-emerald-200" : "bg-blue-200"
              )}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm md:text-base uppercase italic leading-none mb-1">{notif.title}</h4>
                <p className="text-xs md:text-sm font-bold opacity-80">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔝 2. ÁREA DE COMANDO FIXA */}
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
                <Link href={stats.proximaMissao.link || "/questions"}>
                  <Zap className="w-3 h-3 md:w-8 md:h-8 fill-current" /> EXECUTAR AGORA
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* 🖥️ DASHBOARD PANORÂMICO */}
      <div className="space-y-6 md:space-y-10">
        <div className="grid grid-cols-1 gap-6 md:gap-10">
          {activeWidgets.find(w => w.id === 'kpis') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <KPIBlock label="Taxa de Acerto" value={`${stats.taxaAcerto}%`} color={stats.taxaAcerto < 50 ? 'text-red-600' : 'text-emerald-600'} />
              <KPIBlock label="Risco Tático" value={stats.risco} color={stats.risco === 'ALTO' ? 'text-red-600' : 'text-primary'} />
              <KPIBlock label="Progresso" value={`${stats.coursesProgress[0]?.percentage || 0}%`} color="text-slate-900" />
              <KPIBlock label="Streak" value={`${user.studyStreak || 0}d`} color="text-orange-500" icon={<Flame className="w-4 h-4 fill-current" />} />
            </div>
          )}

          {/* MOBILE: Centered Peek Carousel com Autoplay */}
          <div className="block md:hidden -mx-4">
            <Carousel
              setApi={setCarouselApi}
              plugins={[mobileAutoplay.current]}
              opts={{
                loop: true,
                align: 'center',
                containScroll: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {[
                  ...activeWidgets
                    .filter(w => !['kpis', 'simulado', 'broadcast_alerts'].includes(w.id))
                    .map((widget, i) => ({ id: widget.id, index: i })),
                  ...(activeWidgets.find(w => w.id === 'simulado') ? [{ id: 'simulado', index: activeWidgets.filter(w => !['kpis', 'broadcast_alerts'].includes(w.id)).length - 1 }] : [])
                ].map((item, i) => {
                  const isActive = i === selectedIndex;
                  return (
                    <CarouselItem
                      key={item.id + i}
                      className="pl-2 basis-[82%] transition-all duration-500"
                    >
                      <div className={cn(
                        "transition-all duration-500 rounded-2xl",
                        isActive
                          ? "scale-100 opacity-100 shadow-2xl shadow-slate-300/60 ring-2 ring-primary/20"
                          : "scale-95 opacity-50"
                      )}>
                        <CardModule stats={stats} type={item.id as any} />
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>

          {/* DESKTOP: Grid Normal */}
          <div className="hidden md:grid grid-cols-2 gap-8">
            {activeWidgets
              .filter(w => !['kpis', 'simulado', 'broadcast_alerts'].includes(w.id))
              .map(widget => (
                <CardModule key={widget.id} stats={stats} type={widget.id as any} />
              ))
            }
          </div>

          {activeWidgets.find(w => w.id === 'simulado') && (
            <CardModule stats={stats} type="simulado" />
          )}
        </div>
      </div>
      
      {/* 🏆 RODAPÉ DE STATUS */}
      <div className="shrink-0 bg-slate-900 rounded-xl md:rounded-[2.5rem] p-4 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-4 md:gap-10 shadow-2xl border-t-2 border-primary/20 mt-6 md:mt-auto mb-20 md:mb-0">
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

function CardModule({ stats, type, className }: { stats: ScientificDashboard, type: any, className?: string }) {
  if (type === 'active_courses') {
    return (
      <Card className={cn("material-card border-2", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 text-slate-800"><MapIcon className="text-primary w-5 h-5"/> Mapa do Edital</CardTitle>
          <CardDescription className="text-xs font-bold text-slate-500">Progresso nas frentes de batalha</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.coursesProgress && stats.coursesProgress.length > 0 ? (
             <div className="space-y-0 mt-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {stats.coursesProgress.slice(0, 3).map((c, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                     <div className="flex items-center justify-center w-4 h-4 rounded-full border-4 border-white bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                     <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border-2 border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-black text-[10px] uppercase text-slate-700 truncate mr-2">{c.title}</span>
                           <span className="font-bold text-[9px] text-primary bg-primary/10 px-1 rounded">{c.percentage}%</span>
                        </div>
                        <Progress value={c.percentage} className="h-1.5" />
                     </div>
                  </div>
                ))}
             </div>
          ) : (
             <div className="text-center p-4 border-2 border-dashed rounded-xl mt-2 bg-slate-50">
               <span className="text-xs font-bold text-slate-400 uppercase">Nenhum território explorado</span>
             </div>
          )}
          <Button className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic text-xs h-10 shadow-[0_4px_0_0_#334155] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/courses"><MapIcon className="w-4 h-4"/> Continuar Jornada</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'errors') {
    return (
      <Card className={cn("material-card border-2 border-red-100", className)}>
        <CardHeader className="pb-2 bg-red-50/50 rounded-t-xl">
          <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5"/> Supressão de Erros</CardTitle>
          <CardDescription className="text-xs font-bold text-red-900/60">Tópicos que precisam da sua atenção</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topErros && stats.topErros.length > 0 ? (
             <div className="space-y-2 mt-4">
               {stats.topErros.slice(0, 3).map((e: any, i: number) => (
                 <Dialog key={i}>
                   <DialogTrigger asChild>
                     <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm text-red-900 text-xs font-bold uppercase cursor-pointer transition-all active:scale-95 group">
                        <span className="truncate mr-2 flex items-center gap-1">
                           <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"/> 
                           {e.topic}
                        </span>
                        <Badge variant="destructive" className="text-[9px] group-hover:animate-pulse">{e.errorCount} Erros</Badge>
                     </div>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-lg border-2 border-red-200">
                     <DialogHeader>
                       <DialogTitle className="flex items-center gap-2 text-red-600 font-black uppercase italic text-xl">
                         <AlertTriangle className="w-6 h-6"/> Última Falha Tática
                       </DialogTitle>
                       <DialogDescription className="font-bold text-xs uppercase tracking-widest text-slate-500">
                         Tópico: {e.topic}
                       </DialogDescription>
                     </DialogHeader>
                     <div className="space-y-4 py-2">
                       {e.enunciado ? (
                         <>
                           <div className="bg-slate-50 p-4 rounded-xl text-sm font-bold leading-relaxed border-l-4 border-red-500 shadow-inner">
                             {e.enunciado}
                           </div>
                           <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl shadow-sm">
                             <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1 flex items-center gap-1">
                               <CheckCircle2 className="w-4 h-4" /> Gabarito Oficial
                             </div>
                             <p className="text-emerald-900 text-sm font-bold leading-snug">{e.correta}</p>
                           </div>
                           {e.explicacao && (
                             <div className="text-xs font-bold text-slate-600 bg-muted/30 p-4 rounded-xl border border-slate-200">
                               <span className="text-[10px] uppercase font-black tracking-widest block mb-1 text-slate-400">Debriefing</span>
                               {e.explicacao}
                             </div>
                           )}
                         </>
                       ) : (
                         <div className="text-center p-6 border-2 border-dashed rounded-xl">
                           <span className="text-xs font-bold text-slate-400 uppercase">Detalhes da questão expurgados do sistema.</span>
                         </div>
                       )}
                     </div>
                   </DialogContent>
                 </Dialog>
               ))}
             </div>
          ) : (
             <div className="text-center p-4 border-2 border-dashed border-red-100 rounded-xl mt-4 bg-red-50">
               <span className="text-xs font-bold text-red-400 uppercase">Nenhum ponto de atenção</span>
             </div>
          )}
          <Button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase italic text-xs h-10 shadow-[0_4px_0_0_#7f1d1d] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/questions?mode=revenge">
               <Sword className="w-4 h-4" /> Modo Revanche
             </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'revision') {
    return (
      <Card className={cn("material-card border-2 border-blue-100", className)}>
        <CardHeader className="pb-2 bg-blue-50/50 rounded-t-xl">
          <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 text-blue-700"><RefreshCcw className="w-5 h-5"/> Repetição Espaçada</CardTitle>
          <CardDescription className="text-xs font-bold text-blue-900/60">Módulos para revisar hoje</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 border-2 border-dashed border-blue-100 rounded-xl mt-4 bg-blue-50">
               <span className="text-xs font-bold text-blue-400 uppercase">Baralho pronto para treino</span>
          </div>
          <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-xs h-10 shadow-[0_4px_0_0_#1e3a8a] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/flashcards">
               <Layers className="w-4 h-4" /> Jogar Flashcards
             </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'session') {
    return (
      <Card className={cn("material-card border-2 border-amber-100", className)}>
        <CardHeader className="pb-2 bg-amber-50/50 rounded-t-xl">
          <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 text-amber-700"><Target className="w-5 h-5"/> Sessão Tática</CardTitle>
          <CardDescription className="text-xs font-bold text-amber-900/60">Sugestão de estudos diários</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pt-6">
           <Flame className="w-12 h-12 text-orange-500 animate-pulse mb-2" />
           <p className="text-[10px] text-center font-bold text-amber-900/60 mb-4 leading-tight">Treine sua resistência sob pressão extrema com vidas limitadas.</p>
           <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black uppercase italic text-xs h-10 shadow-[0_4px_0_0_#b45309] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/questions?mode=survival">
               <Flame className="w-4 h-4" /> Sobrevivência
             </Link>
           </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'performance') {
    return (
      <Card className={cn("material-card border-2", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 text-slate-800"><Network className="w-5 h-5 text-primary"/> Progresso Mental</CardTitle>
          <CardDescription className="text-xs font-bold text-slate-500">Mapeamento sináptico de conhecimento</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.subjectStats && stats.subjectStats.length > 2 ? (
            <div className="h-[200px] w-full mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.subjectStats}>
                  <PolarGrid stroke="#e2e8f0" />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Precisão" dataKey="accuracy" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '2px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    itemStyle={{ fontWeight: 'black', color: '#1e293b' }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center p-4 border-2 border-dashed rounded-xl mt-4 bg-slate-50">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Responda + áreas p/ gerar o mapa</span>
            </div>
          )}
          <Button className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase italic text-xs h-10 shadow-[0_4px_0_0_#1e293b] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/questions?mode=adaptive">
               <Target className="w-4 h-4" /> Treinar Fraquezas
             </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'simulado') {
    return (
      <Card className={cn("material-card border-4 border-primary/20", className)}>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-black uppercase italic flex items-center justify-center gap-2 text-primary"><Skull className="w-6 h-6"/> Projeção de Simulado</CardTitle>
          <CardDescription className="text-sm font-bold text-slate-500">Sua nota projetada para a prova oficial</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
           <div className="relative">
             <div className="text-6xl font-black italic tracking-tighter text-slate-900">{stats.simulado.notaAtual.toFixed(1)}</div>
             <div className="absolute -top-4 -right-8 text-xs font-bold text-primary border-2 border-primary rounded-full px-2 py-0.5">/ 10</div>
           </div>
           <div className="mt-4 flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
             <span>Corte: {stats.simulado.notaCorte.toFixed(1)}</span>
             <span className={stats.simulado.notaAtual >= stats.simulado.notaCorte ? 'text-emerald-500' : 'text-red-500'}>
               {stats.simulado.notaAtual >= stats.simulado.notaCorte ? 'APROVADO' : 'RISCO'}
             </span>
           </div>
           <Button className="mt-6 w-full max-w-sm h-14 bg-slate-900 hover:bg-black text-white text-lg font-black uppercase italic shadow-[0_6px_0_0_#333] active:translate-y-1 active:shadow-none gap-2" asChild>
             <Link href="/questions?mode=boss">
               <Skull className="w-5 h-5" /> Enfrentar Boss (Simulado)
             </Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
