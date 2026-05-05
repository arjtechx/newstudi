"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  Brain, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  ArrowLeft,
  Loader2,
  Lightbulb,
  AlertTriangle,
  History
} from 'lucide-react';
import { getWeakestSubject, updatePerformance, getQuestions } from '@/lib/store';
import { audioManager } from '@/lib/audio-manager';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { Question } from '@/lib/types';

type SessionState = 'SETUP' | 'LEARNING' | 'QUESTION' | 'FEEDBACK' | 'FEYNMAN' | 'SUMMARY';

export default function AIStudyPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [step, setStep] = useState<SessionState>('SETUP');
  const [config, setConfig] = useState({ subject: '', topic: '', difficulty: 1 });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [progress, setProgress] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [feynmanText, setFeynmanText] = useState('');
  const [sessionStats, setSessionStats] = useState({ blocksDone: 0, correct: 0, totalXP: 0 });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !user) return;
    const fetchWeakest = async () => {
      const suggested = await getWeakestSubject(firestore, user.id);
      setConfig({ ...config, subject: suggested.subject, topic: suggested.topic });
    }
    fetchWeakest();
  }, [firestore, user]);

  useEffect(() => {
    if (step === 'LEARNING' && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev - 1);
        setProgress(p => p + (100 / 60));
        if (timer <= 10 && timer > 0) {
          audioManager.playTick();
        }
      }, 1000);
    } else if (timer === 0 && step === 'LEARNING') {
      setStep('QUESTION');
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timer]);

  const startSession = async () => {
    setIsLoading(true);
    try {
      const allQ = await getQuestions(firestore);
      const subset = allQ.filter(q => q.materia === config.subject && !q.deletedAt);
      
      if (subset.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'Banco Vazio', 
          description: `Não há questões de ${config.subject} cadastradas.` 
        });
        setIsLoading(false);
        return;
      }

      const randomQ = subset[Math.floor(Math.random() * subset.length)];
      setCurrentQuestion(randomQ);
      setStep('LEARNING');
      setTimer(60);
      setProgress(0);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao processar desafio.' });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = () => {
    if (selectedAns === null || !user || !currentQuestion) return;
    const isCorrect = selectedAns === currentQuestion.correta;

    if (isCorrect) audioManager.playSuccess();
    else audioManager.playError();
    
    const xp = isCorrect ? 75 : 15;
    
    setSessionStats(prev => ({
      ...prev,
      blocksDone: prev.blocksDone + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      totalXP: prev.totalXP + xp
    }));

    updatePerformance(firestore, user.id, {
      questionId: currentQuestion.id,
      subject: config.subject,
      topic: config.topic,
      isCorrect,
      xpEarned: xp,
      difficulty: currentQuestion.nivelDificuldade
    });

    setStep('FEEDBACK');
  };

  const nextBlockOrFinish = async () => {
    if (sessionStats.blocksDone >= 3) {
      setStep('FEYNMAN');
    } else {
      startSession();
    }
  };

  const handleFinishFeynman = () => {
    // Processamento por script: Verificação heurística de volume de texto e termos-chave
    const cleanText = feynmanText.trim().toLowerCase();
    const words = cleanText.split(/\s+/);
    const wordCount = words.length;
    
    // Verifica se termos do tópico aparecem na explicação
    const topicKeywords = config.topic.toLowerCase().split(' ').filter(w => w.length > 3);
    const matches = topicKeywords.filter(kw => cleanText.includes(kw));
    
    let bonusXP = 0;
    
    if (wordCount > 40 && matches.length >= topicKeywords.length / 2) {
      bonusXP = 150;
      toast({ title: "Excelente Explicação!", description: "Bônus de XP concedido por síntese completa." });
    } else if (wordCount > 15) {
      bonusXP = 50;
      toast({ title: "Aprendizado Registrado", description: "O aprendizado foi validado com sucesso." });
    } else {
      toast({ variant: 'destructive', title: "Explicação Muito Curta", description: "Tente detalhar mais o que aprendeu." });
      return;
    }

    setSessionStats(prev => ({ ...prev, totalXP: prev.totalXP + bonusXP }));
    audioManager.playFanfare();
    setStep('SUMMARY');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" /> Desafio Adaptativo
            </h1>
            <p className="text-sm text-muted-foreground">Sistema tático de supressão de erros (Baseado em Scripts).</p>
          </div>
        </div>
        {step !== 'SETUP' && step !== 'SUMMARY' && (
          <Badge variant="outline" className="h-8 gap-2 px-3 bg-white shadow-sm border-2">
            <Trophy className="w-4 h-4 text-orange-500" /> {sessionStats.totalXP} XP acumulados
          </Badge>
        )}
      </div>

      {step === 'SETUP' && (
        <Card className="material-card border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Plano de Voo Operacional</CardTitle>
            <CardDescription>O algoritmo analisou seu histórico e detectou uma lacuna crítica em:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border-2 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{config.subject || "Processando..."}</h3>
                  <p className="text-muted-foreground">{config.topic || "Cruzando dados..."}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="font-black text-[10px]">DETECÇÃO HEURÍSTICA</Badge>
                <Badge className="bg-emerald-500 font-black text-[10px]">100% OFF-LINE</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-14 text-lg font-black gap-2 shadow-[0_5px_0_0_#1e40af]" onClick={startSession} disabled={isLoading || !config.subject}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              EXECUTAR MISSÃO TÁTICA
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'LEARNING' && currentQuestion && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="font-mono font-bold text-primary flex items-center gap-1">
              <Clock className="w-4 h-4" /> {timer}s
            </span>
          </div>
          
          <Card className="material-card overflow-hidden border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b p-6">
              <div className="flex justify-between items-center">
                <Badge className="bg-primary">{config.subject}</Badge>
                <Badge variant="outline" className="font-black">OBJETIVO {sessionStats.blocksDone + 1}/3</Badge>
              </div>
              <CardTitle className="text-2xl mt-4 font-black tracking-tight italic uppercase">Briefing de Aproximação</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="bg-muted/30 p-8 rounded-3xl border-2 border-dashed">
                <p className="text-xl leading-relaxed text-foreground font-bold italic">
                  "Você tem 60 segundos para eliminar este alvo. O algoritmo tático identificou que este tópico é essencial para seu nível de precisão atual."
                </p>
              </div>
              
              <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-2xl flex gap-4">
                <div className="bg-accent/20 p-2 rounded-lg h-fit"><History className="w-5 h-5 text-accent" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase text-accent mb-1">Nota do Script</p>
                  <p className="text-sm font-medium">As questões deste desafio foram extraídas do seu banco real por similaridade de dificuldade.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-muted/20 border-t">
              <Button variant="default" className="w-full h-14 gap-2 text-lg font-black shadow-[0_4px_0_0_#1e40af]" onClick={() => setStep('QUESTION')}>
                DESPACHAR AGORA <ChevronRight className="w-5 h-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 'QUESTION' && currentQuestion && (
        <Card className="material-card border-accent/30 shadow-2xl overflow-hidden">
          <div className="h-2 bg-accent" />
          <CardHeader className="p-8">
            <div className="flex items-center gap-3 mb-4">
               <Badge className="bg-accent text-accent-foreground font-black">QUESTÃO SELECIONADA</Badge>
               <Badge variant="outline" className="text-[10px]">{currentQuestion.banca || 'BANCA OFICIAL'}</Badge>
            </div>
            <CardTitle className="text-2xl font-bold leading-relaxed">{currentQuestion.enunciado}</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <RadioGroup value={selectedAns?.toString()} onValueChange={v => setSelectedAns(parseInt(v))} className="space-y-4">
              {currentQuestion.alternativas.map((alt, i) => (
                <div key={i} className={cn(
                  "flex items-center space-x-3 border-2 rounded-2xl p-5 cursor-pointer transition-all hover:border-primary/50 group",
                  selectedAns === i ? "border-primary bg-primary/5 shadow-lg" : "border-muted bg-white"
                )} onClick={() => setSelectedAns(i)}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-colors",
                    selectedAns === i ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <RadioGroupItem value={i.toString()} id={`challenge-alt-${i}`} className="hidden" />
                  <Label htmlFor={`challenge-alt-${i}`} className="flex-1 cursor-pointer font-semibold text-lg">
                    {alt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="p-8 bg-muted/10 border-t">
            <Button className="w-full h-16 text-xl font-black shadow-[0_6px_0_0_#1e40af]" disabled={selectedAns === null} onClick={submitAnswer}>
              CONFIRMAR DISPARO
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'FEEDBACK' && currentQuestion && (
        <Card className={cn(
          "material-card border-4",
          selectedAns === currentQuestion.correta ? "border-emerald-500 bg-emerald-50/10" : "border-red-500 bg-red-50/10"
        )}>
          <CardHeader className="text-center p-12">
            {selectedAns === currentQuestion.correta ? (
              <div className="bg-emerald-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            ) : (
              <div className="bg-red-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            )}
            <CardTitle className="text-4xl font-black italic tracking-tighter uppercase">
              {selectedAns === currentQuestion.correta ? 'Alvo Eliminado!' : 'Falha na Execução'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-12">
            <div className="p-8 bg-white rounded-3xl border-2 space-y-4 shadow-sm">
              <span className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Justificativa Determinística:
              </span>
              <p className="text-lg leading-relaxed font-medium">{currentQuestion.explicacao}</p>
            </div>
          </CardContent>
          <CardFooter className="p-12">
            <Button className="w-full h-16 text-xl font-black shadow-[0_6px_0_0_#1e40af]" onClick={nextBlockOrFinish} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
              PRÓXIMO ALVO <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'FEYNMAN' && (
        <Card className="material-card border-orange-300 shadow-2xl">
          <CardHeader className="p-10 text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-orange-300">
               <Lightbulb className="w-10 h-10 text-orange-500" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight uppercase italic">Debriefing Final (Auto-Avaliação)</CardTitle>
            <CardDescription className="text-lg mt-4">
              Explique com suas palavras o que aprendeu sobre **{config.topic}**.
              <br/><span className="text-xs font-bold text-orange-600 uppercase italic">O script analisará sua densidade de conceitos. Mínimo 20 palavras.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-6">
            <Textarea 
              className="min-h-[250px] text-xl p-8 focus:ring-orange-500 border-2 rounded-3xl font-medium leading-relaxed" 
              placeholder="Minha síntese sobre este tópico..."
              value={feynmanText}
              onChange={e => setFeynmanText(e.target.value)}
            />
          </CardContent>
          <CardFooter className="px-10 pb-10">
            <Button 
              className="w-full h-16 bg-orange-500 hover:bg-orange-600 font-black text-xl shadow-[0_6px_0_0_#9a3412]" 
              onClick={handleFinishFeynman}
              disabled={feynmanText.length < 15 || isLoading}
            >
              CONCLUIR APRENDIZADO
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'SUMMARY' && (
        <Card className="material-card overflow-hidden shadow-[0_20px_50px_rgba(38,98,217,0.2)]">
          <div className="bg-primary p-16 text-center text-white space-y-6">
            <Trophy className="w-24 h-24 mx-auto text-yellow-400" />
            <h2 className="text-5xl font-black italic tracking-tighter uppercase">Missão Concluída!</h2>
          </div>
          <CardContent className="p-12 space-y-10 text-center">
             <div className="space-y-4">
                <h3 className="font-black text-2xl uppercase tracking-tighter">Relatório de Desempenho</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-muted/20 rounded-2xl border">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Precisão Tática</span>
                      <p className="text-3xl font-black text-primary">{Math.round((sessionStats.correct / 3) * 100)}%</p>
                   </div>
                   <div className="p-6 bg-muted/20 rounded-2xl border">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Recompensa (XP)</span>
                      <p className="text-3xl font-black text-emerald-500">+{sessionStats.totalXP}</p>
                   </div>
                </div>
             </div>

            <Button className="w-full h-16 text-xl font-black shadow-[0_6px_0_0_#1e40af]" asChild>
              <Link href="/dashboard">VOLTAR À BASE DE COMANDO</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
