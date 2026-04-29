
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { getQuestions, updatePerformance, getHistory } from '@/lib/store';
import { Question, Difficulty } from '@/lib/types';
import { audioManager } from '@/lib/audio-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  ChevronRight, 
  Trophy, 
  Sparkles,
  Play,
  Target,
  Zap,
  Sword,
  Shield,
  Crosshair,
  Timer,
  Settings2,
  Cpu,
  User,
  Skull,
  AlertCircle,
  EyeOff,
  Loader2,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { Input } from '@/components/ui/input';

type ViewState = 'SETUP' | 'PRAC' | 'RESULT';
type DifficultyMode = 'AUTO' | 'MANUAL';

export default function QuestionsPage() {
  const { user, firestore, settings } = useFirebase();
  const [view, setView] = useState<ViewState>('SETUP');
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('AUTO');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Médio');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: number, total: number, xpEarned: number }>({ correct: 0, total: 0, xpEarned: 0 });
  const [numQuestions, setNumQuestions] = useState(10);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedMateria, setSelectedMateria] = useState<string>('all');
  const [selectedAssunto, setSelectedAssunto] = useState<string>('all');

  const { toast } = useToast();

  useEffect(() => {
    if (firestore) {
      setIsLoading(true);
      getQuestions(firestore)
        .then(setAllQuestions)
        .finally(() => setIsLoading(false));
    }
  }, [firestore]);

  useEffect(() => {
    if (view === 'PRAC' && !isAnswered && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 10 && next > 0) {
            audioManager.playTick();
          }
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeOut();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, isAnswered, timeLeft]);

  const uniqueMaterias = Array.from(new Set(allQuestions.map(q => q.materia)));
  const uniqueAssuntos = Array.from(new Set(
    allQuestions
      .filter(q => selectedMateria === 'all' || q.materia === selectedMateria)
      .map(q => q.assunto)
  ));

  const startSession = async () => {
    let subset = allQuestions.filter(q => {
      const matchMateria = selectedMateria === 'all' || q.materia === selectedMateria;
      const matchAssunto = selectedAssunto === 'all' || q.assunto === selectedAssunto;
      return matchMateria && matchAssunto;
    });

    if (difficultyMode === 'MANUAL') {
      if (selectedDifficulty === 'Hardcore') {
        subset = subset.filter(q => q.nivelDificuldade === 'Difícil' || q.nivelDificuldade === 'Médio');
      } else {
        subset = subset.filter(q => q.nivelDificuldade === selectedDifficulty);
      }
    } else {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Usuário não encontrado",
          description: "Você precisa estar logado para usar o modo adaptativo.",
        });
        return;
      }
      const history = await getHistory(firestore, user.id);
      const totalQuestions = history.length;
      const correctAnswers = history.filter(h => h.isCorrect).length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) : 0.5;
      
      if (accuracy > 0.8) {
        subset = subset.filter(q => q.nivelDificuldade === 'Difícil');
      } else if (accuracy < 0.4) {
        subset = subset.filter(q => q.nivelDificuldade === 'Fácil');
      } else {
        subset = subset.filter(q => q.nivelDificuldade === 'Médio');
      }
    }

    if (subset.length === 0) {
      toast({
        variant: "destructive",
        title: "SISTEMA: Erro de Dados",
        description: "Nenhuma questão encontrada com este filtro de dificuldade.",
      });
      return;
    }

    subset = subset.sort(() => Math.random() - 0.5).slice(0, numQuestions);
    
    setFilteredQuestions(subset);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setSessionResults({ correct: 0, total: 0, xpEarned: 0 });
    setTimeLeft(getDifficultyTime(subset[0].nivelDificuldade, selectedDifficulty));
    setView('PRAC');

    if (selectedDifficulty === 'Hardcore') {
      toast({
        variant: "destructive",
        title: "ALERTA DE ELITE",
        description: "Iniciando modo de supressão cognitiva. Boa sorte, você vai precisar.",
      });
    } else {
      toast({
        title: "OPERAÇÃO INICIADA",
        description: `Modo: ${difficultyMode === 'AUTO' ? 'Adaptativo Tático' : selectedDifficulty}.`,
      });
    }
  };

  const getDifficultyTime = (qDifficulty: string, sessionDifficulty?: Difficulty) => {
    if (sessionDifficulty === 'Hardcore') return 30; 
    switch(qDifficulty) {
      case 'Fácil': return 45;
      case 'Médio': return 90;
      case 'Difícil': return 150;
      default: return 60;
    }
  };

  const handleTimeOut = () => {
    audioManager.playTimeout();
    toast({
      variant: "destructive",
      title: "TEMPO ESGOTADO",
      description: "O alvo escapou! Disparo considerado falho.",
    });
    submitResult(null, false);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    const current = filteredQuestions[currentIdx];
    const isCorrect = selectedAnswer === current.correta;
    submitResult(selectedAnswer, isCorrect);
  };

  const submitResult = (ans: number | null, isCorrect: boolean) => {
    if (!user) return;
    setIsAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (isCorrect) audioManager.playSuccess();
    else audioManager.playError();

    const current = filteredQuestions[currentIdx];
    let xp = 10;
    
    if (isCorrect) {
      xp = current.xpCustom || (current.nivelDificuldade === 'Difícil' ? 80 : current.nivelDificuldade === 'Médio' ? 50 : 30);
      if (selectedDifficulty === 'Hardcore') xp *= 2; 
      setSessionResults(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1, xpEarned: prev.xpEarned + xp }));
    } else {
      setSessionResults(prev => ({ ...prev, total: prev.total + 1, xpEarned: prev.xpEarned + 10 }));
    }

    updatePerformance(firestore, user.id, {
      questionId: current.id,
      subject: current.materia,
      topic: current.assunto,
      isCorrect,
      difficulty: current.nivelDificuldade,
      xpEarned: xp
    });
  };

  const handleNext = () => {
    if (currentIdx < filteredQuestions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(getDifficultyTime(filteredQuestions[nextIdx].nivelDificuldade, selectedDifficulty));
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    audioManager.playFanfare();
    setView('RESULT');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === 'SETUP') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 animate-pulse">
            <Crosshair className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
            Central de Missões
          </h1>
          <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase">Selecione o terreno da operação</p>
        </div>

        <Card className="border-2 border-primary/20 bg-card shadow-[0_0_50px_-12px_rgba(38,98,217,0.3)] overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase">
              <Settings2 className="w-5 h-5 text-primary" /> Parâmetros de Voo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Motor de Seleção
              </Label>
              <Tabs defaultValue="AUTO" onValueChange={(v) => setDifficultyMode(v as DifficultyMode)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-12 bg-muted/30">
                  <TabsTrigger value="AUTO" className="gap-2 font-bold uppercase text-xs">
                    <Cpu className="w-4 h-4" /> Automático Tático
                  </TabsTrigger>
                  <TabsTrigger value="MANUAL" className="gap-2 font-bold uppercase text-xs">
                    <User className="w-4 h-4" /> Manual
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="AUTO" className="pt-4">
                  <p className="text-xs text-muted-foreground italic bg-primary/5 p-3 rounded-lg border border-primary/10">
                    O algoritmo analisará seu desempenho recente para selecionar questões que garantam o equilíbrio ideal entre aprendizado e desafio (100% Determinístico).
                  </p>
                </TabsContent>
                <TabsContent value="MANUAL" className="pt-4 grid grid-cols-2 gap-2">
                  {['Fácil', 'Médio', 'Difícil', 'Hardcore'].map((d) => (
                    <Button
                      key={d}
                      variant={selectedDifficulty === d ? "default" : "outline"}
                      className={cn(
                        "h-12 font-black uppercase text-[10px] gap-2",
                        selectedDifficulty === d && d === 'Hardcore' && "bg-destructive hover:bg-destructive/90 text-white border-none shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      )}
                      onClick={() => setSelectedDifficulty(d as Difficulty)}
                    >
                      {d === 'Hardcore' && <Skull className="w-4 h-4" />}
                      {d}
                    </Button>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Setor de Inteligência (Matéria)
                    </Label>
                    <Select value={selectedMateria} onValueChange={(v) => { setSelectedMateria(v); setSelectedAssunto('all'); }}>
                    <SelectTrigger className="h-14 text-base font-bold bg-muted/30 border-2 hover:border-primary/50 transition-all">
                        <SelectValue placeholder="SETOR: TODOS" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">TODOS OS SETORES</SelectItem>
                        {uniqueMaterias.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Target className="w-3 h-3" /> Alvo Específico (Assunto)
                    </Label>
                    <Select value={selectedAssunto} onValueChange={setSelectedAssunto} disabled={selectedMateria === 'all'}>
                    <SelectTrigger className="h-14 text-base font-bold bg-muted/30 border-2 hover:border-primary/50 transition-all" disabled={selectedMateria === 'all'}>
                        <SelectValue placeholder="ALVO: TODOS" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">TODOS OS ALVOS</SelectItem>
                        {uniqueAssuntos.map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Volume de Alvos (Nº de Questões)
                </Label>
                <Input
                    type="number"
                    value={numQuestions}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) {
                            setNumQuestions(1);
                            return;
                        }
                        if (val > 50) setNumQuestions(50);
                        else if (val < 1) setNumQuestions(1);
                        else setNumQuestions(val);
                    }}
                    className="h-14 text-lg text-center font-black bg-muted/30 border-2"
                    min="1"
                    max="50"
                />
            </div>


            <div className="bg-primary/5 p-4 rounded-xl border-l-4 border-primary flex items-center gap-4">
              <Zap className="w-6 h-6 text-primary animate-bounce" />
              <div className="text-sm">
                <p className="font-black uppercase tracking-tight">Multiplicador de XP</p>
                <p className="text-muted-foreground text-[10px] font-bold">
                  {selectedDifficulty === 'Hardcore' ? 'MODO ELITE: 2X XP ATIVO' : 'RECOMPENSA PADRÃO OPERACIONAL'}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-16 text-2xl font-black gap-3 shadow-[0_8px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all group bg-primary hover:bg-primary/90"
              onClick={startSession}
            >
              <Play className="w-7 h-7 fill-current" /> 
              INICIAR MISSÃO
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (view === 'RESULT') {
    const accuracy = Math.round((sessionResults.correct / sessionResults.total) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-700">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
             <Trophy className="w-24 h-24 text-yellow-500 mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
             <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce">
               RANK UP!
             </div>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Missão Cumprida</h1>
          <p className="text-muted-foreground font-bold tracking-[0.2em] text-xs uppercase">Debriefing de Operação</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-b-4 border-primary p-6 text-center transform hover:scale-105 transition-transform">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precisão</span>
            <div className="text-4xl font-black mt-2 text-primary">{accuracy || 0}%</div>
          </Card>
          <Card className="bg-card border-b-4 border-accent p-6 text-center transform hover:scale-105 transition-transform">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Alvos</span>
            <div className="text-4xl font-black mt-2">{sessionResults.correct}/{sessionResults.total}</div>
          </Card>
          <Card className="bg-card border-b-4 border-emerald-500 p-6 text-center transform hover:scale-105 transition-transform">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">XP Ganho</span>
            <div className="text-4xl font-black mt-2 text-emerald-500">+{sessionResults.xpEarned}</div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1 h-14 text-lg font-black uppercase italic shadow-[0_5px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all" asChild>
            <Link href="/dashboard">Base de Comando</Link>
          </Button>
          <Button variant="outline" className="flex-1 h-14 text-lg font-black uppercase italic border-2 hover:bg-muted" onClick={() => setView('SETUP')}>
            Reiniciar Missão
          </Button>
        </div>
      </div>
    );
  }
  
  if (filteredQuestions.length === 0 || !filteredQuestions[currentIdx]) {
     return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const current = filteredQuestions[currentIdx];
  const maxTime = getDifficultyTime(current.nivelDificuldade, selectedDifficulty);
  const timePercentage = (timeLeft / maxTime) * 100;
  const isHardcore = selectedDifficulty === 'Hardcore';

  return (
    <div className={cn(
      "max-w-4xl mx-auto space-y-6 transition-all",
      isHardcore && "animate-stress"
    )}>
      <div className={cn(
        "grid grid-cols-3 items-center gap-4 bg-card border-2 rounded-2xl p-4 shadow-xl relative overflow-hidden",
        isHardcore ? "border-red-600 bg-red-950/10 animate-blink-red" : "border-primary/20"
      )}>
        <div 
          className={cn(
            "absolute bottom-0 left-0 h-1 transition-all duration-1000",
            timeLeft < 10 ? "bg-destructive animate-pulse" : isHardcore ? "bg-red-600" : "bg-primary"
          )}
          style={{ width: `${timePercentage}%` }}
        />
        
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Shield className="w-2 h-2" /> Setor Ativo
          </span>
          <h2 className={cn(
            "text-sm font-black truncate",
            isHardcore ? "text-red-600" : "text-primary"
          )}>{current.materia.toUpperCase()}</h2>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex gap-1 mb-1">
            {filteredQuestions.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentIdx ? (isHardcore ? "bg-red-600 scale-125 shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "bg-primary scale-125 shadow-[0_0_8px_rgba(38,98,217,0.8)]") : 
                  i < currentIdx ? "bg-emerald-500" : "bg-muted"
                )} 
              />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Progresso: {currentIdx + 1}/{filteredQuestions.length}</span>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className={cn(
            "flex items-center gap-2 font-mono font-black text-lg",
            timeLeft < 10 || isHardcore ? "text-red-600 animate-pulse" : "text-foreground"
          )}>
            <Timer className="w-4 h-4" /> {timeLeft}s
          </div>
          <Badge variant="outline" className={cn(
            "font-black text-[9px] px-2 py-0 uppercase italic mt-1",
            isHardcore ? "border-red-600 text-red-600 animate-glitch" : "border-primary/40 text-primary"
          )}>
            Modo: {isHardcore ? 'HARDCORE - SUPRESSÃO' : current.nivelDificuldade}
          </Badge>
        </div>
      </div>

      <Card className={cn(
        "border-2 bg-card shadow-2xl overflow-hidden min-h-[500px] flex flex-col relative transition-all",
        isHardcore ? "border-red-900 shadow-[0_0_40px_rgba(220,38,38,0.1)]" : "border-primary/20"
      )}>
        {isHardcore && !isAnswered && (
          <div className="absolute top-4 right-4 z-10 animate-pulse">
            <EyeOff className="w-5 h-5 text-red-900/40" />
          </div>
        )}

        <div className={cn(
          "p-8 border-b-2",
          isHardcore ? "bg-red-950/5 border-red-900/20" : "bg-muted/20 border-primary/10"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "font-black p-2 rounded-lg text-lg min-w-[40px] text-center shadow-lg",
              isHardcore ? "bg-red-600 text-white shadow-red-900/50" : "bg-primary text-white"
            )}>
              Q
            </div>
            <h3 className={cn(
              "text-xl leading-relaxed font-bold tracking-tight text-foreground transition-all",
              isHardcore && "tracking-tighter"
            )}>
              {current.enunciado}
            </h3>
          </div>
        </div>

        <CardContent className="flex-1 p-8">
          <RadioGroup 
            value={selectedAnswer?.toString()} 
            onValueChange={(v) => !isAnswered && setSelectedAnswer(parseInt(v))}
            className="grid grid-cols-1 gap-4"
          >
            {current.alternativas.map((alt, idx) => {
              const isCorrectAlt = idx === current.correta;
              const isSelectedAlt = idx === selectedAnswer;
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-center space-x-3 border-2 rounded-xl p-5 transition-all cursor-pointer group relative overflow-hidden",
                    !isAnswered && (isSelectedAlt ? (isHardcore ? "border-red-600 bg-red-600/5" : "border-primary bg-primary/5 shadow-[0_0_15px_rgba(38,98,217,0.2)]") : "hover:border-primary/40 hover:bg-muted/50"),
                    isAnswered && (
                      isCorrectAlt 
                      ? cn("border-emerald-500 bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.2)]", settings?.animations.enabled && 'animate-correct-answer-glow') 
                      : isSelectedAlt 
                        ? cn("border-red-500 bg-red-50", settings?.animations.enabled && 'animate-wrong-answer-shake') 
                        : "opacity-40"
                    ),
                    isHardcore && !isAnswered && "hover:animate-glitch"
                  )}
                  onClick={() => !isAnswered && setSelectedAnswer(idx)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-colors shrink-0",
                    !isAnswered && (isSelectedAlt ? (isHardcore ? "bg-red-600 text-white" : "bg-primary text-white") : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"),
                    isAnswered && (isCorrectAlt ? "bg-emerald-500 text-white" : isSelectedAlt ? "bg-red-500 text-white" : "bg-muted")
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <Label htmlFor={`alt-${idx}`} className={cn(
                    "flex-1 cursor-pointer text-base font-semibold leading-snug pl-2 transition-all",
                    isHardcore && !isAnswered && "group-hover:translate-x-1"
                  )}>
                    {alt}
                  </Label>
                  {isAnswered && isCorrectAlt && <CheckCircle2 className="w-6 h-6 text-emerald-500 absolute right-4" />}
                  {isAnswered && isSelectedAlt && !isCorrectAlt && <XCircle className="w-6 h-6 text-red-500 absolute right-4" />}
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>

        <CardFooter className={cn(
          "p-6 border-t-2",
          isHardcore ? "bg-red-950/5 border-red-900/20" : "bg-muted/30 border-primary/10"
        )}>
          {!isAnswered ? (
            <Button 
              className={cn(
                "w-full h-16 font-black text-2xl uppercase italic shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all gap-3",
                isHardcore ? "bg-red-600 hover:bg-red-700 shadow-[#991b1b]" : "bg-primary hover:bg-primary/90"
              )} 
              disabled={selectedAnswer === null} 
              onClick={handleSubmit}
            >
              <Zap className={cn("w-6 h-6 fill-current", isHardcore && "animate-glitch")} /> 
              {isHardcore ? 'DISPARO DE ELITE' : 'CONFIRMAR DISPARO'}
            </Button>
          ) : (
            <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className={cn(
                "p-6 backdrop-blur-sm border-2 rounded-2xl shadow-inner",
                isHardcore ? "bg-red-950/5 border-red-900/30" : "bg-background/80 border-primary/20"
              )}>
                <div className={cn(
                  "flex items-center gap-2 mb-3 font-black uppercase text-xs tracking-widest",
                  isHardcore ? "text-red-700" : "text-primary"
                )}>
                  {isHardcore ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  Debriefing da Operação
                </div>
                <p className="text-foreground leading-relaxed font-bold text-sm">{current.explicacao}</p>
              </div>
              <div className="flex w-full items-center gap-4">
                <Button variant="ghost" className="flex-1 h-16 font-black text-lg uppercase italic border-2 border-muted-foreground/20 text-muted-foreground" onClick={handleFinish}>
                    Finalizar
                </Button>
                <Button className="flex-1 h-16 font-black text-2xl uppercase italic shadow-[0_6px_0_0_#059669] bg-emerald-600 hover:bg-emerald-700 active:translate-y-1 active:shadow-none transition-all gap-3" onClick={handleNext}>
                    {currentIdx < filteredQuestions.length - 1 ? 'PRÓXIMO ALVO' : 'CONCLUIR MISSÃO'} <ChevronRight className="w-7 h-7" />
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
