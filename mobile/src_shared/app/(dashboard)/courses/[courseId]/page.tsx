
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourses, completeLesson, getPerformance, saveNote, getNote } from '@/lib/store';
import { Course, Lesson, ContentBlock } from '@/lib/types';
import { audioManager } from '@/lib/audio-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Layers,
  HelpCircle,
  FileText,
  PenTool,
  Save,
  StickyNote,
  Youtube,
  Sigma,
  Grid3X3,
  Shield,
  Mic2,
  Presentation
} from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser } from '@/firebase';
import { DiagramBuilder } from '@/components/diagram-builder';

function QuizBlockComponent({ block }: { block: ContentBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const meta = block.metadata || { alternatives: [], correct: 0, explanation: '' };

  const handleConfirm = () => {
    setIsAnswered(true);
    if (selected === meta.correct) {
      audioManager.playSuccess();
    } else {
      audioManager.playError();
    }
  };

  return (
    <div className="bg-slate-50 border-2 border-primary/10 rounded-3xl p-5 md:p-8 my-6 md:my-10 shadow-sm relative group animate-in slide-in-from-left-4">
      <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-2 rounded-xl text-primary"><HelpCircle className="w-5 h-5" /></div>
        <span className="font-black text-xs uppercase tracking-widest text-primary">Questão de Fixação</span>
      </div>
      
      <p className="text-lg md:text-xl font-bold mb-6 md:mb-8 leading-relaxed">{block.value}</p>
      
      <RadioGroup value={selected?.toString()} onValueChange={v => !isAnswered && setSelected(parseInt(v))} className="space-y-4">
        {(meta.alternatives || []).map((alt: string, i: number) => (
          <div key={`${block.id}-alt-${i}`} className={cn(
            "flex items-center space-x-3 md:space-x-4 border-2 rounded-2xl p-4 md:p-5 transition-all",
            !isAnswered ? "cursor-pointer hover:border-primary/40 bg-white" : 
            i === meta.correct ? "bg-emerald-50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : 
            selected === i ? "bg-red-50 border-red-500" : "bg-white opacity-60"
          )} onClick={() => !isAnswered && setSelected(i)}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 transition-colors",
              !isAnswered ? (selected === i ? "bg-primary text-white" : "bg-muted text-muted-foreground") :
              i === meta.correct ? "bg-emerald-500 text-white" :
              selected === i ? "bg-red-500 text-white" : "bg-muted"
            )}>
              {String.fromCharCode(65 + i)}
            </div>
            <Label className="flex-1 cursor-pointer font-bold text-base md:text-lg leading-tight">{alt}</Label>
          </div>
        ))}
      </RadioGroup>

      {!isAnswered ? (
        <Button 
          className="w-full h-14 md:h-16 mt-6 md:mt-10 font-black text-lg md:text-xl shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all" 
          disabled={selected === null}
          onClick={handleConfirm}
        >
          CONFIRMAR DISPARO
        </Button>
      ) : (
        <div className="mt-6 md:mt-10 p-5 md:p-8 bg-white rounded-2xl border-2 border-dashed border-primary/20 animate-in zoom-in-95">
          <div className="flex items-center gap-3 mb-4">
             <Badge className={selected === meta.correct ? "bg-emerald-500" : "bg-red-500"}>
               {selected === meta.correct ? 'MISSÃO CUMPRIDA' : 'FALHA TÁTICA'}
             </Badge>
          </div>
          <p className="text-sm md:text-base font-bold italic leading-relaxed text-slate-700">"{meta.explanation}"</p>
        </div>
      )}
    </div>
  );
}

function RenderBlock({ block, idx }: { block: ContentBlock, idx: number }) {
  const meta = block.metadata || {};
  
  const getFontSizeClass = (type: string, size?: string) => {
    switch (size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg md:text-xl';
      case 'xl': return 'text-xl md:text-2xl';
      case '2xl': return 'text-2xl md:text-3xl';
      case '3xl': return 'text-3xl md:text-4xl';
      case '4xl': return 'text-4xl md:text-5xl';
      default: return type === 'h1' ? 'text-3xl' : 'text-base';
    }
  };

  const getFontWeightClass = (weight?: string) => {
    switch (weight) {
      case 'normal': return 'font-normal';
      case 'medium': return 'font-medium';
      case 'semibold': return 'font-semibold';
      case 'bold': return 'font-bold';
      case 'black': return 'font-black';
      default: return 'font-normal';
    }
  };

  const getFontFamilyClass = (family?: string) => {
    switch (family) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-headline tracking-tighter uppercase italic';
      case 'sans':
      default: return 'font-sans';
    }
  };

  const getTextColorClass = (color?: string) => {
    switch (color) {
      case 'primary': return 'text-primary';
      case 'accent': return 'text-accent';
      case 'success': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-destructive';
      case 'muted': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const gdMatch = url.match(/\/file\/d\/([\w-]+)\/(?:view|edit|preview)?/);
    if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
    return url;
  };

  const getAudioSource = (url: string) => {
    if (!url) return '';
    const gdMatch = url.match(/\/file\/d\/([\w-]+)\//);
    if (gdMatch) return `https://docs.google.com/uc?export=download&id=${gdMatch[1]}`;
    return url;
  };

  const getSlidesEmbed = (url: string) => {
    if (!url) return '';
    const gdMatch = url.match(/\/presentation\/d\/([\w-]+)\//);
    if (gdMatch) return `https://docs.google.com/presentation/d/${gdMatch[1]}/embed?start=false&loop=false&delayms=3000`;
    return url;
  };

  const blockKey = `${block.id}-${idx}`;

  switch (block.type) {
    case 'h1':
      return (
        <h1 key={blockKey} className={cn(
          "border-b-4 border-primary/10 pb-3 mb-8 leading-tight",
          getFontSizeClass('h1', meta.fontSize),
          getFontWeightClass(meta.fontWeight || 'black'),
          getFontFamilyClass(meta.fontFamily),
          getTextColorClass(meta.textColor || 'primary')
        )}>
          {block.value}
        </h1>
      );
    case 'p':
      return (
        <p key={blockKey} className={cn(
          "leading-relaxed whitespace-pre-wrap mb-6",
          getFontSizeClass('p', meta.fontSize),
          getFontWeightClass(meta.fontWeight),
          getFontFamilyClass(meta.fontFamily),
          getTextColorClass(meta.textColor)
        )}>
          {block.value}
        </p>
      );
    case 'math':
      return (
        <div key={blockKey} className="bg-slate-900 border-l-[8px] md:border-l-[12px] border-accent p-6 md:p-8 rounded-2xl my-6 md:my-8 shadow-2xl relative flex flex-col items-center justify-center text-center">
          <div className="absolute top-4 left-4 text-accent opacity-20"><Sigma className="w-6 h-6 md:w-8 md:h-8" /></div>
          <p className="font-serif italic text-2xl md:text-3xl text-accent tracking-widest py-4">
            {block.value}
          </p>
        </div>
      );
    case 'audio':
      return (
        <div key={blockKey} className="bg-emerald-50 border-2 border-emerald-200 p-4 md:p-6 rounded-3xl my-6 md:my-8 flex flex-col gap-4 shadow-sm">
           <div className="flex items-center gap-3"><Mic2 className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Áudio da Aula</span></div>
           <audio controls className="w-full h-12">
             <source src={getAudioSource(block.value)} type="audio/mpeg" />
             Seu navegador não suporta áudio.
           </audio>
        </div>
      );
    case 'slides':
      return (
        <div key={blockKey} className="my-6 md:my-10 aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100 flex flex-col">
           <div className="bg-indigo-600 p-3 flex items-center gap-2 text-white"><Presentation className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Apresentação de Apoio</span></div>
           <iframe src={getSlidesEmbed(block.value)} className="flex-1 w-full" allowFullScreen />
        </div>
      );
    case 'law':
      return (
        <div key={blockKey} className="bg-slate-50 border-l-[6px] md:border-l-[10px] border-primary p-5 md:p-8 rounded-r-3xl my-6 md:my-10 shadow-lg font-mono relative overflow-hidden">
          <div className="absolute top-4 right-4 text-primary/10"><Shield className="w-8 h-8 md:w-12 md:h-12" /></div>
          <div className="text-[10px] font-black uppercase text-primary mb-4 tracking-widest">Base Legal / Texto Normativo</div>
          <p className="text-sm md:text-base leading-relaxed text-slate-800 border-t border-primary/10 pt-4">{block.value}</p>
        </div>
      );
    case 'tip':
      return (
        <div key={blockKey} className="bg-amber-50 border-2 border-amber-200 p-5 md:p-8 rounded-3xl my-6 md:my-8 flex flex-col md:flex-row gap-4 md:gap-6 items-start shadow-sm">
          <div className="bg-amber-100 p-3 md:p-4 rounded-2xl"><Lightbulb className="w-6 h-6 md:w-8 md:h-8 text-amber-600" /></div>
          <div>
            <div className="text-[10px] font-black uppercase text-amber-600 mb-2 tracking-widest">Dica Operacional</div>
            <p className="text-base md:text-lg font-bold text-amber-900 italic leading-snug">"{block.value}"</p>
          </div>
        </div>
      );
    case 'warning':
      return (
        <div key={blockKey} className="bg-red-50 border-2 border-red-200 p-5 md:p-8 rounded-3xl my-6 md:my-8 flex flex-col md:flex-row gap-4 md:gap-6 items-start border-dashed">
          <div className="bg-red-100 p-3 md:p-4 rounded-2xl"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-red-600" /></div>
          <div>
            <div className="text-[10px] font-black uppercase text-red-600 mb-2 tracking-widest">Cuidado: Pegadinha</div>
            <p className="text-base md:text-lg font-black text-red-900 leading-snug">{block.value}</p>
          </div>
        </div>
      );
    case 'example':
      return (
        <div key={blockKey} className="bg-blue-50 border-2 border-blue-200 p-5 md:p-8 rounded-3xl my-6 md:my-8 space-y-4">
          <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div><span className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Cenário Prático</span></div>
          <p className="text-base md:text-lg font-semibold text-blue-900 leading-relaxed italic border-l-2 border-blue-200 pl-4">{block.value}</p>
        </div>
      );
    case 'table':
      return (
        <div key={blockKey} className="my-6 md:my-10 border-2 rounded-3xl overflow-x-auto shadow-xl">
           <table className="w-full border-collapse">
             <thead className="bg-slate-900">
                <tr>
                  {meta.headers?.map((h: string, hi: number) => (
                    <th key={hi} className="p-3 text-white font-black uppercase text-[10px] text-center border-x border-white/10">{h}</th>
                  ))}
                </tr>
             </thead>
             <tbody className="bg-white">
                {meta.rows?.map((row, ri: number) => (
                  <tr key={ri} className="text-center font-bold border-b">
                    {row.cells.map((cell: string, ci: number) => (
                      <td key={ci} className={cn("p-3 border-x", cell === 'V' ? "text-emerald-600 bg-emerald-50/20" : cell === 'F' ? "text-red-600 bg-red-50/20" : "")}>{cell}</td>
                    ))}
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      );
    case 'quiz':
      return <QuizBlockComponent key={blockKey} block={block} />;
    case 'video':
      return (
        <div key={blockKey} className="my-6 md:my-10 aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black">
          <iframe src={getEmbedUrl(block.value)} className="w-full h-full" allowFullScreen />
        </div>
      );
    case 'image':
      return (
        <div key={blockKey} className="rounded-3xl overflow-hidden border-4 border-white shadow-2xl my-6 md:my-10 group relative">
          <img src={block.value} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" alt="Material" />
        </div>
      );
    case 'diagram':
      return (
        <div key={blockKey} className="my-6 md:my-10 p-2 md:p-6 bg-slate-50 border-2 border-slate-200/50 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10 opacity-50 group-hover:opacity-100 transition-opacity">
            Diagrama Interativo
          </div>
          <div className="rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200/50">
            <DiagramBuilder 
              initialNodes={meta.nodes || []} 
              initialEdges={meta.edges || []} 
              readOnly={true} 
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  
  // Mobile states
  const [mobileView, setMobileView] = useState<'topics' | 'content'>('topics');
  const [touchStartX, setTouchStartX] = useState<number>(0);

  const flatLessons = useMemo(() => course?.modules.flatMap(m => m.lessons) || [], [course]);
  const activeLessonIdx = useMemo(() => activeLesson ? flatLessons.findIndex(l => l.id === activeLesson.id) : -1, [activeLesson, flatLessons]);

  useEffect(() => {
    if (!firestore) return;
    const fetchCourseData = async () => {
      const all = await getCourses(firestore);
      const found = all.find(c => c.id === courseId);
      
      if (user && user.completedLessons) {
        setCompletedLessons(user.completedLessons);
      }

      if (found) {
        setCourse(found);
        if (found.modules?.[0]?.lessons?.[0]) setActiveLesson(found.modules[0].lessons[0]);
      } else router.push('/courses');
    };
    fetchCourseData();
  }, [courseId, router, firestore, user]);

  useEffect(() => {
    if (activeLesson && user && user.id) {
      getNote(firestore, user.id, activeLesson.id).then(setNote);
      document.getElementById('lesson-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeLesson, user, firestore]);

  const handleComplete = () => {
    if (activeLesson && user && user.id) {
      completeLesson(firestore, user.id, activeLesson.id);
      setCompletedLessons(prev => [...new Set([...prev, activeLesson.id])]);
      audioManager.playSuccess();
      toast({ title: "Tópico Dominado!", description: "+25 XP ganhos." });
    }
  };

  const handleNextLesson = () => {
    const isCurrentLastInCourse = activeLessonIdx === flatLessons.length - 1;
    
    if (activeLesson && !completedLessons.includes(activeLesson.id)) {
      handleComplete();
    }

    if (isCurrentLastInCourse) {
      audioManager.playFanfare();
      toast({ title: "Curso Concluído!", description: "Você dominou toda a trilha tática." });
    } else {
      setActiveLesson(flatLessons[activeLessonIdx + 1]);
      setMobileView('content');
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIdx > 0) {
      setActiveLesson(flatLessons[activeLessonIdx - 1]);
      setMobileView('content');
    }
  };

  if (!course || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase animate-pulse">Acessando...</div>;

  const progress = Math.round((flatLessons.filter(l => completedLessons.includes(l.id)).length / (flatLessons.length || 1)) * 100);

  return (
    <div className="flex h-[calc(100dvh-56px)] -m-3 md:m-0 md:h-[calc(100vh-120px)] md:gap-6 animate-in fade-in duration-500 relative overflow-hidden md:overflow-visible">
      {/* TELA DE TÓPICOS (SIDEBAR NO DESKTOP, TELA INTEIRA NO MOBILE) */}
      <Card className={cn(
        "w-full md:w-80 flex flex-col border-2 shadow-xl bg-card/50 transition-transform duration-300 absolute md:relative inset-0 z-10 md:translate-x-0 md:rounded-xl rounded-none border-0 md:border-2",
        mobileView === 'content' ? "-translate-x-full" : "translate-x-0"
      )}>
        <CardHeader className="bg-primary/5 border-b p-6 pt-10 md:pt-6">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-primary font-bold"><Link href="/courses"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Trilhas</Link></Button>
          <CardTitle className="text-lg font-black uppercase text-primary truncate">{course.title}</CardTitle>
          <div className="mt-2 space-y-1">
             <div className="flex justify-between text-[10px] font-black uppercase"><span>Progresso</span><span>{progress}%</span></div>
             <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 pb-20 md:pb-0">
          <Accordion type="multiple" className="w-full" defaultValue={[course.modules[0]?.id]}>
            {course.modules.map((mod, mi) => (
              <AccordionItem key={mod.id} value={mod.id} className="border-b">
                <AccordionTrigger className="px-6 py-5 text-xs font-black uppercase truncate">{mi + 1}. {mod.title}</AccordionTrigger>
                <AccordionContent className="p-0">
                  {mod.lessons.map(l => (
                    <button key={l.id} onClick={() => { setActiveLesson(l); setMobileView('content'); }} className={cn("flex items-center gap-4 px-8 py-5 w-full text-left transition-all border-l-8 active:scale-[0.98]", activeLesson?.id === l.id ? "bg-primary/10 border-primary text-primary font-black" : "border-transparent text-muted-foreground")}>
                      {completedLessons.includes(l.id) ? <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4 text-emerald-500 shrink-0" /> : <div className="w-5 h-5 md:w-4 md:h-4 border-2 rounded-full opacity-30 shrink-0" />}
                      <span className="text-[12px] md:text-[10px] line-clamp-2 leading-tight">{l.title}</span>
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </Card>

      {/* TELA DE CONTEÚDO (MAIN AREA NO DESKTOP, TELA INTEIRA NO MOBILE) */}
      <div className={cn(
        "flex-1 flex flex-col bg-background md:bg-white md:rounded-[2.5rem] md:border-2 md:shadow-2xl overflow-hidden absolute md:relative inset-0 z-20 transition-transform duration-300 md:translate-x-0",
        mobileView === 'topics' ? "translate-x-full" : "translate-x-0"
      )}>
        {activeLesson ? (
          <>
            <div className="p-6 md:p-8 border-b flex flex-col md:flex-row justify-between md:items-center bg-slate-50/50 gap-4 pt-10 md:pt-8">
              <div className="flex items-center gap-3 md:gap-6">
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-10 w-10 text-primary bg-primary/10 rounded-xl" onClick={() => setMobileView('topics')}><ArrowLeft className="w-5 h-5" /></Button>
                <div className="bg-primary w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 shrink-0"><BookOpen className="w-5 h-5 md:w-8 md:h-8" /></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-2xl font-black tracking-tighter uppercase italic truncate">{activeLesson.title}</h2>
                  <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-2"><Clock className="w-3 h-3" /> {activeLesson.estimatedTime} MIN</span>
                </div>
              </div>
              <div className="hidden md:flex gap-2">
                 <Sheet>
                    <SheetTrigger asChild><Button variant="outline" className="h-10 md:h-12 px-4 md:px-6 rounded-xl font-black gap-2 flex-1 md:flex-none"><PenTool className="w-4 h-4" /> NOTAS</Button></SheetTrigger>
                    <SheetContent className="w-[100vw] sm:w-[400px] flex flex-col">
                      <SheetHeader className="p-6 border-b"><SheetTitle className="font-black italic text-2xl uppercase">Caderno de Campo</SheetTitle></SheetHeader>
                      <div className="flex-1 p-6 space-y-4">
                        <Textarea className="flex-1 h-full min-h-[400px] bg-orange-50/20 rounded-2xl p-6" value={note} onChange={e => setNote(e.target.value)} />
                        <Button className="w-full h-14 bg-orange-600 font-black" onClick={() => { if (user?.id) { saveNote(firestore, user.id, activeLesson.id, note); toast({ title: "Salvo" }); } }}>SALVAR</Button>
                      </div>
                    </SheetContent>
                 </Sheet>
                 <Button className={cn("h-10 md:h-12 px-4 md:px-8 rounded-xl font-black gap-2 flex-1 md:flex-none", completedLessons.includes(activeLesson.id) ? "bg-emerald-100 text-emerald-700" : "bg-primary")} onClick={handleComplete} disabled={completedLessons.includes(activeLesson.id)}>
                   {completedLessons.includes(activeLesson.id) ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />} DOMINAR
                 </Button>
              </div>
            </div>
            
            {/* BOTOES FLUTUANTES (MOBILE ONLY) */}
            <div className="md:hidden absolute bottom-6 right-4 z-50 flex flex-col gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white border-2 border-slate-200 text-slate-700 active:scale-95 transition-transform">
                    <PenTool className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="w-[100vw] h-[80vh] sm:w-[400px] flex flex-col rounded-t-[2rem]">
                  <SheetHeader className="p-6 border-b"><SheetTitle className="font-black italic text-2xl uppercase">Caderno de Campo</SheetTitle></SheetHeader>
                  <div className="flex-1 p-6 space-y-4">
                    <Textarea className="flex-1 h-[60%] bg-orange-50/20 rounded-2xl p-6" value={note} onChange={e => setNote(e.target.value)} />
                    <Button className="w-full h-14 bg-orange-600 font-black" onClick={() => { if (user?.id) { saveNote(firestore, user.id, activeLesson.id, note); toast({ title: "Salvo" }); } }}>SALVAR</Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Button size="icon" className={cn("h-14 w-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 active:scale-95 transition-transform", completedLessons.includes(activeLesson.id) ? "bg-emerald-500 border-emerald-600 text-white" : "bg-primary border-primary text-white")} onClick={handleComplete} disabled={completedLessons.includes(activeLesson.id)}>
                {completedLessons.includes(activeLesson.id) ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
              </Button>
            </div>

            <ScrollArea 
              className="flex-1 p-4 md:p-12 pb-24 md:pb-12"  
              id="lesson-scroll-area"
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const distance = touchStartX - touchEndX;
                if (distance > 80) {
                  if (activeLessonIdx < flatLessons.length - 1) handleNextLesson();
                } else if (distance < -80) {
                  setMobileView('topics');
                }
              }}
            >
              <div className="max-w-4xl mx-auto space-y-8 pb-32">
                <div className="md:hidden text-center mb-6 opacity-30 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-4">
                  <span>← Voltar</span>
                  <span>Deslize na tela</span>
                  <span>Avançar →</span>
                </div>
                {activeLesson.blocks.map((b, i) => <RenderBlock key={`${b.id}-${i}`} block={b} idx={i} />)}
                <div className="pt-16 border-t flex flex-col md:flex-row justify-between gap-4">
                   <Button variant="outline" className="h-14 w-full md:flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={handlePrevLesson} disabled={activeLessonIdx === 0}><ChevronLeft className="w-4 h-4 mr-2" /> Aula Anterior</Button>
                   <Button className="h-14 w-full md:flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={handleNextLesson}>{activeLessonIdx < flatLessons.length - 1 ? 'Próximo Objetivo' : 'Finalizar Trilha'} <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : <div className="flex-1 flex items-center justify-center opacity-20 font-black text-2xl md:text-4xl italic uppercase p-8 text-center">Selecione uma Missão</div>}
      </div>
    </div>
  );
}
