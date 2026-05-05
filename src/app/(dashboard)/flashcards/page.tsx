"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Layers, Loader2, RefreshCcw, CheckCircle2, XCircle, BrainCircuit, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useFirebase } from '@/firebase';
import { getQuestions, updatePerformance } from '@/lib/store';
import { Question } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function FlashcardsPage() {
  const { user, isUserLoading } = useUser();
  const { settings } = useFirebase();
  const firestore = useFirestore();
  const [deck, setDeck] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [deckSize, setDeckSize] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(true);

  // Stats da sessão
  const [cardsReviewd, setCardsReviewed] = useState(0);
  const [cardsCorrect, setCardsCorrect] = useState(0);

  useEffect(() => {
    if (!user || !firestore) return;
    
    // Buscar questões do banco para servir como baralho
    const loadDeck = async () => {
      const q = await getQuestions(firestore, false);
      setAllQuestions(q);
      setIsLoading(false);
    };

    loadDeck();
  }, [user, firestore]);

  const startSession = () => {
    let filtered = allQuestions;
    if (selectedSubject !== 'ALL') {
      filtered = allQuestions.filter(q => q.materia === selectedSubject);
    }
    const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, deckSize);
    setDeck(shuffled);
    setIsConfiguring(false);
  };

  const currentCard = deck[currentIndex];

  const handleReview = async (quality: 'again' | 'good' | 'easy') => {
    if (!user || !firestore || !currentCard) return;

    const isCorrect = quality !== 'again';
    setCardsReviewed(prev => prev + 1);
    if (isCorrect) setCardsCorrect(prev => prev + 1);

    // Salvar no histórico (gamificação e performance real)
    await updatePerformance(firestore, user.id!, {
      questionId: currentCard.id,
      subject: currentCard.materia,
      topic: currentCard.assunto,
      isCorrect,
      difficulty: currentCard.nivelDificuldade,
      xpEarned: isCorrect ? (quality === 'easy' ? 30 : 20) : 5,
      type: 'flashcard' // Identificador extra (opcional, dependendo do db)
    });

    if (settings?.sounds?.success) {
        const audioUrl = isCorrect ? settings.sounds.success : settings.sounds.error;
        const audio = new Audio(audioUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }

    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isUserLoading || isLoading) {
    return (
       <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
       </div>
    );
  }

  if (isConfiguring) {
    const subjects = Array.from(new Set(allQuestions.map(q => q.materia).filter(Boolean)));
    
    return (
       <div className="max-w-2xl mx-auto pt-8 px-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 mb-8">
             <Layers className="w-8 h-8 text-primary" />
             <div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">Preparar Baralho</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Configuração da Sessão de Flashcards</p>
             </div>
          </div>
          
          <Card className="border-2 shadow-sm mb-6">
            <CardContent className="p-6 space-y-6">
               <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Filtro de Matéria</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <button
                        onClick={() => setSelectedSubject('ALL')}
                        className={cn(
                           "p-4 rounded-xl border-2 text-left transition-all active:scale-95",
                           selectedSubject === 'ALL' ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-300"
                        )}
                     >
                        <div className="text-sm font-black uppercase italic text-slate-800">Mistão Global</div>
                        <div className="text-xs font-bold text-slate-500">Revisão de todas as disciplinas</div>
                     </button>
                     {subjects.map(sub => (
                        <button
                           key={sub}
                           onClick={() => setSelectedSubject(sub)}
                           className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all active:scale-95",
                              selectedSubject === sub ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-300"
                           )}
                        >
                           <div className="text-sm font-black uppercase italic text-slate-800 truncate">{sub}</div>
                           <div className="text-xs font-bold text-slate-500">Foco específico</div>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tamanho do Baralho</label>
                  <div className="flex gap-3">
                     {[10, 15, 30].map(size => (
                        <button
                           key={size}
                           onClick={() => setDeckSize(size)}
                           className={cn(
                              "flex-1 py-3 rounded-xl border-2 font-black italic transition-all active:scale-95",
                              deckSize === size ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300"
                           )}
                        >
                           {size} Cards
                        </button>
                     ))}
                  </div>
               </div>
            </CardContent>
          </Card>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg font-black uppercase italic shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all gap-2"
          >
             <Zap className="w-5 h-5" /> Iniciar Treino
          </Button>
          
          <Button variant="ghost" className="w-full mt-4 font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest text-xs" asChild>
             <Link href="/dashboard">Voltar para Base</Link>
          </Button>
       </div>
    );
  }

  if (deck.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center space-y-4">
          <Layers className="w-16 h-16 text-slate-300" />
          <h2 className="text-2xl font-black uppercase italic text-slate-700">Seu baralho está vazio</h2>
          <p className="text-slate-500 font-bold max-w-sm">
             Não encontramos questões para o filtro selecionado. Tente mudar a matéria ou adicione mais questões.
          </p>
          <Button onClick={() => setIsConfiguring(true)} className="mt-4"><ArrowLeft className="w-4 h-4 mr-2"/> Voltar para Configuração</Button>
       </div>
    );
  }

  if (isFinished) {
    const accuracy = Math.round((cardsCorrect / cardsReviewd) * 100);
    return (
       <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-in zoom-in-95 duration-500">
          <div className="bg-primary/10 p-6 rounded-full mb-6">
            <BrainCircuit className="w-20 h-20 text-primary" />
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Treino Concluído!</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest mb-8">Repetição Espaçada Sincronizada</p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 text-center shadow-sm">
                <div className="text-3xl font-black italic text-slate-800">{cardsReviewd}</div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mt-1">Cards Revisados</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 text-center shadow-sm">
                <div className={cn("text-3xl font-black italic", accuracy >= 70 ? "text-emerald-500" : "text-amber-500")}>{accuracy}%</div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mt-1">Retenção (Precisão)</div>
            </div>
          </div>

          <Button size="lg" className="h-14 px-10 text-lg font-black uppercase italic shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all" asChild>
             <Link href="/dashboard"><ArrowLeft className="w-5 h-5 mr-2"/> Retornar à Base</Link>
          </Button>
       </div>
    );
  }

  const progress = ((currentIndex) / deck.length) * 100;

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center pt-8 pb-20 px-4 md:px-0">
      
      {/* Header e Progresso */}
      <div className="w-full mb-8 flex flex-col space-y-4">
        <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic text-slate-800 flex items-center gap-2">
                 <Layers className="text-primary w-6 h-6 md:w-8 md:h-8" />
                 Sessão de Flashcards
              </h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                 Módulo de Repetição Espaçada Ativo
              </p>
            </div>
            <Badge className="bg-slate-900 text-white font-black text-xs md:text-sm py-1 px-3">
               CARD {currentIndex + 1} / {deck.length}
            </Badge>
        </div>
        <Progress value={progress} className="h-2 bg-slate-200" />
      </div>

      {/* O Card do Flashcard */}
      <div className="relative w-full aspect-[4/3] md:aspect-video perspective-1000 mb-8">
        <div 
           className={cn(
             "w-full h-full transition-all duration-700 preserve-3d cursor-pointer shadow-2xl rounded-3xl",
             isFlipped ? "rotate-y-180" : "hover:scale-[1.02]"
           )}
           onClick={() => !isFlipped && setIsFlipped(true)}
        >
           {/* FRENTE DO CARD (Pergunta) */}
           <Card className="absolute inset-0 backface-hidden bg-white border-4 border-slate-100 flex flex-col items-center justify-center p-6 md:p-12 text-center rounded-3xl">
              <div className="absolute top-4 left-4 md:top-6 md:left-6">
                 <Badge variant="outline" className="text-[10px] md:text-xs font-black uppercase text-slate-400 border-slate-200">
                    Frente
                 </Badge>
              </div>
              <div className="absolute top-4 right-4 md:top-6 md:right-6">
                 <Badge className="bg-primary/10 text-primary text-[10px] md:text-xs font-black uppercase">
                    {currentCard.materia}
                 </Badge>
              </div>
              
              <BrainCircuit className="w-12 h-12 text-slate-200 mb-6" />
              <h3 className="text-xl md:text-3xl font-bold text-slate-800 leading-snug">
                 {currentCard.enunciado}
              </h3>
              
              <div className="absolute bottom-6 left-0 right-0 text-center animate-pulse">
                 <span className="text-xs font-black uppercase text-slate-400 tracking-widest bg-slate-100 py-1.5 px-4 rounded-full">
                    Toque para virar
                 </span>
              </div>
           </Card>

           {/* VERSO DO CARD (Resposta) */}
           <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 border-4 border-slate-800 flex flex-col p-6 md:p-10 rounded-3xl overflow-y-auto custom-scrollbar">
              <div className="absolute top-4 left-4 md:top-6 md:left-6">
                 <Badge className="bg-slate-800 text-slate-400 text-[10px] md:text-xs font-black uppercase border-none">
                    Verso
                 </Badge>
              </div>
              <div className="absolute top-4 right-4 md:top-6 md:right-6">
                 <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-black uppercase border-none">
                    Gabarito
                 </Badge>
              </div>
              
              <div className="flex-1 flex flex-col justify-center mt-8">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 md:p-6 rounded-2xl mb-4 md:mb-6">
                     <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Resposta Correta
                     </div>
                     <p className="text-emerald-50 text-lg md:text-2xl font-bold leading-tight">
                        {currentCard.alternativas[currentCard.correta]}
                     </p>
                  </div>

                  {currentCard.explicacao && (
                     <div className="bg-slate-800 p-4 md:p-6 rounded-2xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                           <RefreshCcw className="w-3 h-3" /> Memória Fixada
                        </div>
                        <p className="text-slate-300 text-sm md:text-base font-bold leading-relaxed">
                           {currentCard.explicacao}
                        </p>
                     </div>
                  )}
              </div>
           </Card>
        </div>
      </div>

      {/* Botões de Ação (Aparecem apenas após virar o card) */}
      <div className={cn(
         "w-full grid grid-cols-3 gap-2 md:gap-6 transition-all duration-500",
         isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
         <Button 
            onClick={() => handleReview('again')}
            className="h-16 md:h-24 bg-red-100 hover:bg-red-200 text-red-700 flex flex-col items-center justify-center gap-1 md:gap-2 rounded-2xl border-2 border-red-200 shadow-[0_4px_0_0_#fca5a5] active:translate-y-1 active:shadow-none"
         >
            <XCircle className="w-5 h-5 md:w-8 md:h-8" />
            <span className="font-black uppercase italic text-[10px] md:text-sm tracking-widest">Errei</span>
         </Button>

         <Button 
            onClick={() => handleReview('good')}
            className="h-16 md:h-24 bg-emerald-500 hover:bg-emerald-600 text-white flex flex-col items-center justify-center gap-1 md:gap-2 rounded-2xl border-2 border-emerald-600 shadow-[0_4px_0_0_#047857] active:translate-y-1 active:shadow-none"
         >
            <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8" />
            <span className="font-black uppercase italic text-[10px] md:text-sm tracking-widest">Acertei</span>
         </Button>

         <Button 
            onClick={() => handleReview('easy')}
            className="h-16 md:h-24 bg-blue-100 hover:bg-blue-200 text-blue-700 flex flex-col items-center justify-center gap-1 md:gap-2 rounded-2xl border-2 border-blue-200 shadow-[0_4px_0_0_#93c5fd] active:translate-y-1 active:shadow-none"
         >
            <Zap className="w-5 h-5 md:w-8 md:h-8" />
            <span className="font-black uppercase italic text-[10px] md:text-sm tracking-widest">Fácil</span>
         </Button>
      </div>

    </div>
  );
}
