
"use client"

import React, { useState, useEffect } from 'react';
import { getCourses, saveCourse, deleteCourse } from '@/lib/store';
import { Course, ContentBlock, BlockType, FontSize, FontWeight, FontFamily, TextColor, CourseStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table as TableUI, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileJson, 
  PlusCircle, 
  Save, 
  Layers,
  ImageIcon,
  Clock,
  Layout,
  Type,
  Shield,
  Lightbulb,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Trash,
  CheckCircle2,
  HelpCircle,
  Youtube,
  Sigma,
  Grid3X3,
  Code2,
  Settings2,
  BookOpen,
  Palette,
  CaseSensitive,
  Mic2,
  Presentation,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { CourseListSchema } from '@/lib/schemas';

// Contador Atômico para IDs Únicos Absolutos
let globalIdCounter = 0;
const generateSecureId = (prefix: string) => {
  globalIdCounter++;
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${r}-${globalIdCounter}`;
};

export default function AdminCoursesPage() {
  const firestore = useFirestore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const [isBBCodeDialogOpen, setIsBBCodeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [bbcodeInput, setBbcodeInput] = useState('');
  const [activeLessonTarget, setActiveLessonTarget] = useState<{modIdx: number, lessonIdx: number} | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const { toast } = useToast();

  const fetchCourses = async () => {
    setIsLoading(true);
    const data = await getCourses(firestore);
    setCourses(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [firestore]);

  const [editingCourse, setEditingCourse] = useState<Partial<Course>>({
    title: '',
    description: '',
    category: 'Concursos Públicos',
    thumbnail: 'https://picsum.photos/seed/concursos/800/400',
    status: 'draft',
    modules: []
  });

  const parseBBCode = (text: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, ""); // Limpa HTML residual
    const tagRegex = /\[(\w+)([^\]]*)\]([\s\S]*?)\[\/\1\]/g;
    
    let lastIndex = 0;
    let match;

    const addTextBlock = (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      
      const parts = trimmed.split(/\n\s*\n/);
      parts.forEach(part => {
        if (part.trim()) {
          blocks.push({ 
            id: generateSecureId('b'), 
            type: 'p', 
            value: part.trim(),
            metadata: { fontSize: 'base', fontWeight: 'normal', fontFamily: 'sans', textColor: 'default' }
          });
        }
      });
    };

    while ((match = tagRegex.exec(cleanText)) !== null) {
      const textBefore = cleanText.substring(lastIndex, match.index);
      addTextBlock(textBefore);

      const tag = match[1].toLowerCase();
      const attrsStr = match[2];
      const content = match[3].trim();
      
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w+)\s*=\s*['"]([^'"]*)['"]/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const id = generateSecureId('b');

      switch (tag) {
        case 'h1':
          blocks.push({ 
            id, type: 'h1', value: content, 
            metadata: { 
              fontSize: (attrs.size as FontSize) || '2xl', 
              fontWeight: (attrs.weight as FontWeight) || 'black',
              fontFamily: (attrs.font as FontFamily) || 'sans',
              textColor: (attrs.color as TextColor) || 'primary'
            } 
          });
          break;
        case 'p':
          blocks.push({ 
            id, type: 'p', value: content, 
            metadata: { 
              fontSize: (attrs.size as FontSize) || 'base', 
              fontWeight: (attrs.weight as FontWeight) || 'normal',
              fontFamily: (attrs.font as FontFamily) || 'sans',
              textColor: (attrs.color as TextColor) || 'default'
            } 
          });
          break;
        case 'math': blocks.push({ id, type: 'math', value: content }); break;
        case 'audio': blocks.push({ id, type: 'audio', value: content }); break;
        case 'slides': blocks.push({ id, type: 'slides', value: content }); break;
        case 'table':
          blocks.push({
            id, type: 'table', value: '',
            metadata: {
              headers: (attrs.headers || 'H1,H2').split(','),
              rows: (attrs.rows || '-,-').split('|').map(r => ({ cells: r.split(',') }))
            }
          });
          break;
        case 'quiz':
          blocks.push({
            id, type: 'quiz', value: content,
            metadata: {
              alternatives: (attrs.alts || 'A,B,C,D').split(','),
              correct: parseInt(attrs.ok || '0'),
              explanation: attrs.exp || 'Justificativa técnica.'
            }
          });
          break;
        case 'law': blocks.push({ id, type: 'law', value: content }); break;
        case 'tip': blocks.push({ id, type: 'tip', value: content }); break;
        case 'warning': blocks.push({ id, type: 'warning', value: content }); break;
        case 'example': blocks.push({ id, type: 'example', value: content }); break;
        case 'video': blocks.push({ id, type: 'video', value: content }); break;
        case 'image': blocks.push({ id, type: 'image', value: content }); break;
        default: addTextBlock(match[0]);
      }
      lastIndex = tagRegex.lastIndex;
    }

    const remainingText = cleanText.substring(lastIndex);
    addTextBlock(remainingText);

    return blocks;
  };

  const handleImportBBCode = () => {
    if (!activeLessonTarget) return;
    const newBlocks = parseBBCode(bbcodeInput);
    
    if (newBlocks.length === 0) {
      toast({ variant: 'destructive', title: 'Erro de Compilação', description: 'Nenhum conteúdo detectado.' });
      return;
    }

    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      const { modIdx, lessonIdx } = activeLessonTarget;
      if (newMods[modIdx]?.lessons[lessonIdx]) {
        newMods[modIdx].lessons[lessonIdx].blocks = [
          ...newMods[modIdx].lessons[lessonIdx].blocks,
          ...newBlocks
        ];
      }
      return { ...prev, modules: newMods };
    });

    setIsBBCodeDialogOpen(false);
    setBbcodeInput('');
    toast({ title: 'Compilação Tática', description: `${newBlocks.length} blocos integrados.` });
  };

  const handleSave = async () => {
    if (!editingCourse.title) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Título é obrigatório.' });
      return;
    }

    const c: Partial<Course> = {
      ...editingCourse,
      status: editingCourse.status || 'draft',
      createdAt: editingCourse.createdAt || Date.now(),
    };

    saveCourse(firestore, c);
    await fetchCourses();
    setIsDialogOpen(false);
    toast({ title: 'Sincronizado', description: 'Curso salvo no banco de dados.' });
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourseId) return;
    deleteCourse(firestore, deletingCourseId);
    await fetchCourses();
    toast({ title: 'Lixeira', description: 'Curso movido para a lixeira.' });
    setDeletingCourseId(null);
    setIsDeleteDialogOpen(false);
  };

  const addModule = () => {
    setEditingCourse(prev => ({
      ...prev,
      modules: [...(prev.modules || []), { id: generateSecureId('mod'), title: 'Novo Módulo', lessons: [] }]
    }));
  };

  const addLesson = (modIdx: number) => {
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      newMods[modIdx].lessons.push({
        id: generateSecureId('l'),
        title: 'Nova Lição',
        blocks: [],
        type: 'reading',
        estimatedTime: 15
      });
      return { ...prev, modules: newMods };
    });
  };

  const addBlock = (modIdx: number, lessonIdx: number, type: BlockType) => {
    const newBlock: ContentBlock = {
      id: generateSecureId('b'),
      type,
      value: type === 'image' ? 'https://picsum.photos/seed/concursos/800/400' : 
             type === 'video' ? 'https://www.youtube.com/watch?v=VIDEO_ID' : 
             type === 'audio' ? 'https://docs.google.com/uc?export=download&id=ID_DO_ARQUIVO' :
             type === 'slides' ? 'https://docs.google.com/presentation/d/ID/edit' : '',
      metadata: type === 'quiz' ? {
        alternatives: ['A', 'B', 'C', 'D'],
        correct: 0,
        explanation: 'Justificativa...'
      } : (type === 'h1' || type === 'p') ? {
        fontSize: type === 'h1' ? '2xl' : 'base',
        fontWeight: type === 'h1' ? 'black' : 'normal',
        fontFamily: 'sans',
        textColor: type === 'h1' ? 'primary' : 'default'
      } : type === 'table' ? {
        headers: ['Condição', 'Resultado'],
        rows: [{ cells: ['V', 'V'] }]
      } : undefined
    };
    
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      if (newMods[modIdx]?.lessons[lessonIdx]) {
        newMods[modIdx].lessons[lessonIdx].blocks.push(newBlock);
      }
      return { ...prev, modules: newMods };
    });
  };

  const updateBlockValue = (modIdx: number, lessonIdx: number, blockIdx: number, value: string) => {
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      if (newMods[modIdx]?.lessons[lessonIdx]?.blocks[blockIdx]) {
        newMods[modIdx].lessons[lessonIdx].blocks[blockIdx].value = value;
      }
      return { ...prev, modules: newMods };
    });
  };

  const updateBlockMeta = (modIdx: number, lessonIdx: number, blockIdx: number, key: string, value: any) => {
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      const block = newMods[modIdx]?.lessons[lessonIdx]?.blocks[blockIdx];
      if (block) {
        if (!block.metadata) block.metadata = {};
        block.metadata[key] = value;
      }
      return { ...prev, modules: newMods };
    });
  };

  const moveBlock = (modIdx: number, lessonIdx: number, blockIdx: number, dir: 'up' | 'down') => {
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      const blocks = newMods[modIdx]?.lessons[lessonIdx]?.blocks;
      if (!blocks) return prev;
      const target = dir === 'up' ? blockIdx - 1 : blockIdx + 1;
      if (target < 0 || target >= blocks.length) return prev;
      [blocks[blockIdx], blocks[target]] = [blocks[target], blocks[blockIdx]];
      return { ...prev, modules: newMods };
    });
  };

  const removeBlock = (modIdx: number, lessonIdx: number, blockIdx: number) => {
    setEditingCourse(prev => {
      const newMods = JSON.parse(JSON.stringify(prev.modules || []));
      newMods[modIdx]?.lessons[lessonIdx]?.blocks.splice(blockIdx, 1);
      return { ...prev, modules: newMods };
    });
  };
  
  const handleJsonImport = async () => {
    let parsedData;
    try {
        parsedData = JSON.parse(jsonInput);
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Erro de Sintaxe JSON",
            description: "O conteúdo inserido não é um JSON válido.",
            duration: 9000,
        });
        return;
    }

    try {
      const coursesToSave = Array.isArray(parsedData) ? parsedData : [parsedData];
      const validation = CourseListSchema.safeParse(coursesToSave);
      if (!validation.success) {
        throw new Error(validation.error.errors.map(e => e.message).join('; '));
      }

      for (const course of validation.data) {
        saveCourse(firestore, course);
      }
      await fetchCourses();
      setIsJsonDialogOpen(false);
      setJsonInput('');
      toast({ title: "Importado", description: `${validation.data.length} cursos salvos.` });
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro na Validação",
        description: err.message,
        duration: 15000,
      });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Layout className="w-8 h-8 text-primary" /> Editor Wix-Flow
          </h1>
          <p className="text-muted-foreground font-medium">Gestão de trilhas com visibilidade e sincronização tática.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGuideDialogOpen(true)} className="gap-2 border-amber-500 text-amber-600 font-bold">
            <HelpCircle className="w-4 h-4" /> Ver Guia JSON
          </Button>
          <Button variant="outline" onClick={() => setIsJsonDialogOpen(true)} className="gap-2 border-primary text-primary font-bold">
            <FileJson className="w-4 h-4" /> Importar JSON
          </Button>
          <Button onClick={() => {
            setEditingCourse({ title: '', description: '', category: 'Concursos Públicos', status: 'draft', modules: [], thumbnail: 'https://picsum.photos/seed/concursos/800/400' });
            setIsDialogOpen(true);
          }} className="gap-2 font-black shadow-[0_4px_0_0_#1e40af]">
            <Plus className="w-4 h-4" /> Novo Curso
          </Button>
        </div>
      </div>

      <Card className="material-card border-2 shadow-xl overflow-hidden">
        <TableUI>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-black uppercase text-[10px]">Curso</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Categoria</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Estrutura</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="mx-auto w-6 h-6 animate-spin" /></TableCell></TableRow>
            ) : courses.map((course, cIdx) => (
              <TableRow key={`${course.id}-${cIdx}`} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={course.thumbnail} className="w-16 h-10 object-cover rounded-lg shadow-sm border-2" alt="" />
                    <span className="font-bold text-lg">{course.title}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="font-black text-[10px]">{course.category}</Badge></TableCell>
                <TableCell>
                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'} className="font-black text-[9px] uppercase">
                    {course.status === 'published' ? <span className="flex items-center gap-1"><Eye className="w-2 h-2" /> Publicado</span> : <span className="flex items-center gap-1"><EyeOff className="w-2 h-2" /> Rascunho</span>}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant="secondary" className="font-bold">{course.modules?.length || 0} Módulos</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCourse(JSON.parse(JSON.stringify(course))); setIsDialogOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { setDeletingCourseId(course.id); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableUI>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden border-4 border-primary/20 shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-2 rounded-xl text-white"><Layout className="w-6 h-6" /></div>
              <div>
                <DialogTitle className="text-xl font-black uppercase italic">Canvas Operacional Wix-Flow</DialogTitle>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Motor de Conteúdo v5.1</p>
              </div>
            </div>
            <Button size="lg" className="font-black gap-2 h-14 px-10 shadow-[0_6px_0_0_#1e40af] text-lg rounded-2xl" onClick={handleSave}>
              <Save className="w-5 h-5" /> SINCRONIZAR CURSO
            </Button>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-80 border-r bg-muted/10 p-6 space-y-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-primary">Título</label>
                  <Input value={editingCourse.title} onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} className="h-10 text-sm font-bold border-2" />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-primary">Visibilidade</label>
                  <Select value={editingCourse.status} onValueChange={v => setEditingCourse({...editingCourse, status: v as CourseStatus})}>
                    <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho (Oculto)</SelectItem>
                      <SelectItem value="published">Publicado (Visível)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-primary">Capa URL</label>
                  <Input value={editingCourse.thumbnail} onChange={e => setEditingCourse({...editingCourse, thumbnail: e.target.value})} className="h-10 text-[10px] border-2" />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-primary">Categoria</label>
                  <Select value={editingCourse.category} onValueChange={v => setEditingCourse({...editingCourse, category: v})}>
                    <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Concursos Públicos">Concursos Públicos</SelectItem><SelectItem value="Carreiras Policiais">Carreiras Policiais</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="default" className="w-full h-12 text-xs font-black bg-emerald-600 shadow-[0_4px_0_0_#065f46]" onClick={addModule}>+ MÓDULO</Button>
            </div>

            <ScrollArea className="flex-1 p-10 bg-slate-50">
              <div className="max-w-5xl mx-auto space-y-12">
                {(editingCourse.modules || []).map((mod, modIdx) => (
                  <div key={`${mod.id}-${modIdx}`} className="bg-white border-2 border-primary/10 rounded-3xl shadow-lg overflow-hidden">
                    <div className="p-5 bg-primary/5 border-b flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Badge className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center font-black text-lg p-0">{modIdx + 1}</Badge>
                        <Input className="h-10 font-black bg-transparent border-none text-xl p-0 focus-visible:ring-0 flex-1" placeholder="Nome do Módulo" value={mod.title} onChange={e => {
                          const newMods = JSON.parse(JSON.stringify(editingCourse.modules || []));
                          newMods[modIdx].title = e.target.value;
                          setEditingCourse({...editingCourse, modules: newMods});
                        }} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => addLesson(modIdx)} className="font-black text-[10px] border-emerald-500 text-emerald-600">NOVA LIÇÃO</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          const newMods = editingCourse.modules?.filter((_, i) => i !== modIdx);
                          setEditingCourse({...editingCourse, modules: newMods});
                        }}><Trash className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      {(mod.lessons || []).map((lesson, lessonIdx) => (
                        <div key={`${lesson.id}-${lessonIdx}`} className="border-2 border-dashed border-muted-foreground/20 rounded-3xl p-8 bg-white space-y-8 relative">
                          <div className="flex items-center gap-4 border-b border-dashed pb-6">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            <Input className="font-black text-2xl border-none p-0 focus-visible:ring-0 flex-1" placeholder="Título da Lição" value={lesson.title} onChange={e => {
                              const newMods = JSON.parse(JSON.stringify(editingCourse.modules || []));
                              newMods[modIdx].lessons[lessonIdx].title = e.target.value;
                              setEditingCourse({...editingCourse, modules: newMods});
                            }} />
                            <Button variant="outline" size="lg" className="h-12 gap-2 font-black text-xs border-primary text-primary" onClick={() => { setActiveLessonTarget({ modIdx, lessonIdx }); setIsBBCodeDialogOpen(true); }}>
                              <Code2 className="w-4 h-4" /> BBCODE
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                              const newMods = JSON.parse(JSON.stringify(editingCourse.modules || []));
                              newMods[modIdx].lessons.splice(lessonIdx, 1);
                              setEditingCourse({...editingCourse, modules: newMods});
                            }}><Trash className="w-5 h-5" /></Button>
                          </div>

                          <div className="space-y-6">
                            {(lesson.blocks || []).map((block, blockIdx) => (
                              <div key={`${block.id}-${modIdx}-${lessonIdx}-${blockIdx}`} className="relative group/block border-2 border-transparent hover:border-primary/20 rounded-2xl p-4 bg-slate-50/30 transition-all">
                                <div className="absolute -left-12 top-0 flex flex-col gap-2 opacity-0 group-hover/block:opacity-100 transition-opacity z-10 p-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-md rounded-full" onClick={() => moveBlock(modIdx, lessonIdx, blockIdx, 'up')}><MoveUp className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-md rounded-full text-destructive" onClick={() => removeBlock(modIdx, lessonIdx, blockIdx)}><Trash className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-md rounded-full" onClick={() => moveBlock(modIdx, lessonIdx, blockIdx, 'down')}><MoveDown className="w-4 h-4" /></Button>
                                </div>
                                
                                <div className="space-y-4">
                                  {(block.type === 'h1' || block.type === 'p') && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white/50 rounded-xl border border-dashed">
                                      <Select value={block.metadata?.fontSize || 'base'} onValueChange={v => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'fontSize', v)}>
                                        <SelectTrigger className="h-7 text-[9px] w-24 font-bold bg-white"><Type className="w-3 h-3 mr-1" /><SelectValue placeholder="Tam." /></SelectTrigger>
                                        <SelectContent><SelectItem value="xs">X-Pequeno</SelectItem><SelectItem value="sm">Pequeno</SelectItem><SelectItem value="base">Normal</SelectItem><SelectItem value="lg">Médio</SelectItem><SelectItem value="xl">Grande</SelectItem><SelectItem value="2xl">Banner</SelectItem><SelectItem value="3xl">Banner LG</SelectItem><SelectItem value="4xl">Banner XL</SelectItem></SelectContent>
                                      </Select>
                                      <Select value={block.metadata?.fontWeight || 'normal'} onValueChange={v => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'fontWeight', v)}>
                                        <SelectTrigger className="h-7 text-[9px] w-24 font-bold bg-white"><CaseSensitive className="w-3 h-3 mr-1" /><SelectValue placeholder="Peso" /></SelectTrigger>
                                        <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="semibold">Semi-Bold</SelectItem><SelectItem value="bold">Negrito</SelectItem><SelectItem value="black">Black</SelectItem></SelectContent>
                                      </Select>
                                      <Select value={block.metadata?.fontFamily || 'sans'} onValueChange={v => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'fontFamily', v)}>
                                        <SelectTrigger className="h-7 text-[9px] w-24 font-bold bg-white"><Layout className="w-3 h-3 mr-1" /><SelectValue placeholder="Fonte" /></SelectTrigger>
                                        <SelectContent><SelectItem value="sans">Sans</SelectItem><SelectItem value="serif">Serif</SelectItem><SelectItem value="mono">Mono</SelectItem><SelectItem value="display">Display</SelectItem></SelectContent>
                                      </Select>
                                      <Select value={block.metadata?.textColor || 'default'} onValueChange={v => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'textColor', v)}>
                                        <SelectTrigger className="h-7 text-[9px] w-24 font-bold bg-white"><Palette className="w-3 h-3 mr-1" /><SelectValue placeholder="Cor" /></SelectTrigger>
                                        <SelectContent><SelectItem value="default">Padrão</SelectItem><SelectItem value="primary">Primária</SelectItem><SelectItem value="accent">Destaque</SelectItem><SelectItem value="success">Sucesso</SelectItem><SelectItem value="warning">Aviso</SelectItem><SelectItem value="danger">Crítico</SelectItem><SelectItem value="muted">Suave</SelectItem></SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {block.type === 'h1' && <Input className="border-none bg-primary/5 h-auto py-4 font-black text-2xl focus-visible:ring-0" placeholder="Título da Seção..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />}
                                  {block.type === 'p' && <Textarea className="border-none bg-transparent min-h-[100px] resize-none text-lg leading-relaxed focus-visible:ring-0" placeholder="Texto didático..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />}
                                  
                                  {block.type === 'math' && (
                                    <div className="bg-slate-900 border-l-4 border-accent rounded-xl p-6">
                                      <div className="text-[9px] font-black text-accent uppercase mb-2">Fórmula / RLM</div>
                                      <Input className="font-serif italic text-2xl border-none bg-transparent text-white focus-visible:ring-0" placeholder="Ex: P ^ Q -> ~R" value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                    </div>
                                  )}

                                  {block.type === 'law' && (
                                    <div className="bg-slate-100 border-l-8 border-primary rounded-r-2xl p-6 italic shadow-sm">
                                      <div className="text-[9px] font-black text-primary uppercase mb-2">Artigo de Lei / Citação</div>
                                      <Textarea className="font-mono text-sm border-none bg-transparent resize-none focus-visible:ring-0" placeholder="Artigo de Lei..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                    </div>
                                  )}

                                  {block.type === 'tip' && (
                                    <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
                                      <Lightbulb className="w-6 h-6 text-amber-600 shrink-0" />
                                      <div className="flex-1 space-y-2">
                                        <div className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Dica Operacional</div>
                                        <Textarea className="font-bold text-amber-900 italic bg-transparent border-none resize-none focus-visible:ring-0 p-0" placeholder="Sua dica..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                      </div>
                                    </div>
                                  )}

                                  {block.type === 'warning' && (
                                    <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex gap-4 items-start border-dashed">
                                      <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                                      <div className="flex-1 space-y-2">
                                        <div className="text-[9px] font-black uppercase text-red-600 tracking-widest">Cuidado: Pegadinha</div>
                                        <Textarea className="font-black text-red-900 bg-transparent border-none resize-none focus-visible:ring-0 p-0" placeholder="Aviso de perigo..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                      </div>
                                    </div>
                                  )}

                                  {block.type === 'example' && (
                                    <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-2xl space-y-4">
                                      <div className="flex items-center gap-3">
                                        <div className="bg-blue-600 p-2 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div>
                                        <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest">Cenário Prático</span>
                                      </div>
                                      <Textarea className="text-lg font-semibold text-blue-900 italic bg-transparent border-none resize-none focus-visible:ring-0 p-0" placeholder="Descreva um cenário..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                    </div>
                                  )}

                                  {(block.type === 'image' || block.type === 'video' || block.type === 'audio' || block.type === 'slides') && (
                                    <div className="bg-muted/30 rounded-2xl p-6 border-2 border-dashed border-muted-foreground/20 space-y-4">
                                      <div className="flex items-center gap-3">
                                        {block.type === 'image' && <ImageIcon className="w-5 h-5 text-primary" />}
                                        {block.type === 'video' && <Youtube className="w-5 h-5 text-red-600" />}
                                        {block.type === 'audio' && <Mic2 className="w-5 h-5 text-emerald-600" />}
                                        {block.type === 'slides' && <Presentation className="w-5 h-5 text-indigo-600" />}
                                        <span className="text-[10px] font-black uppercase text-muted-foreground">URL DO RECURSO (Drive/Ytb/Externo)</span>
                                      </div>
                                      <Input className="font-mono text-[10px] h-10 border-2" placeholder="https://..." value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} />
                                    </div>
                                  )}

                                  {block.type === 'table' && (
                                    <div className="bg-white border-2 rounded-2xl p-6 shadow-sm space-y-4">
                                       <div className="flex items-center gap-2 mb-4"><Grid3X3 className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase">Tabela de Dados</span></div>
                                       <div className="space-y-2">
                                          <label className="text-[9px] font-black uppercase">Cabeçalhos (Vírgula)</label>
                                          <Input className="h-8 text-xs font-mono" value={block.metadata?.headers?.join(',')} onChange={e => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'headers', e.target.value.split(','))} />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[9px] font-black uppercase">Linhas (Pipe | para linha, vírgula para coluna)</label>
                                          <Input className="h-8 text-xs font-mono" value={block.metadata?.rows?.map(r => r.cells.join(',')).join('|')} onChange={e => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'rows', e.target.value.split('|').map(r => ({ cells: r.split(',') })))} />
                                       </div>
                                    </div>
                                  )}

                                  {block.type === 'quiz' && (
                                    <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-8 space-y-6 shadow-inner">
                                      <div className="flex items-center gap-3"><HelpCircle className="w-5 h-5 text-primary" /><span className="font-black text-xs uppercase tracking-widest text-primary">Questão Integrada</span></div>
                                      <Textarea value={block.value} onChange={e => updateBlockValue(modIdx, lessonIdx, blockIdx, e.target.value)} className="font-bold text-lg h-24 border-2 rounded-xl" placeholder="A pergunta?" />
                                      <div className="grid grid-cols-1 gap-3">
                                         {(block.metadata?.alternatives || []).map((alt: string, aIdx: number) => (
                                           <div key={aIdx} className="flex gap-3 items-center">
                                             <Button variant={block.metadata?.correct === aIdx ? "default" : "outline"} size="sm" className={cn("h-10 w-10 font-black rounded-xl", block.metadata?.correct === aIdx && "bg-emerald-600")} onClick={() => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'correct', aIdx)}>{String.fromCharCode(65 + aIdx)}</Button>
                                             <Input value={alt} onChange={e => {
                                               const newAlts = [...(block.metadata?.alternatives || [])];
                                               newAlts[aIdx] = e.target.value;
                                               updateBlockMeta(modIdx, lessonIdx, blockIdx, 'alternatives', newAlts);
                                             }} className="h-10 text-sm font-semibold rounded-xl border-2" />
                                           </div>
                                         ))}
                                      </div>
                                      <Textarea value={block.metadata?.explanation} onChange={e => updateBlockMeta(modIdx, lessonIdx, blockIdx, 'explanation', e.target.value)} className="h-20 text-xs italic bg-white/50 border-2 rounded-xl" placeholder="Explicação..." />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-8 border-t-2 border-dashed border-muted-foreground/10 bg-slate-50/30 p-4 -m-8 mt-8 rounded-b-3xl">
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-primary/20" onClick={() => addBlock(modIdx, lessonIdx, 'h1')}><Type className="w-4 h-4" /> TÍTULO</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-primary/20" onClick={() => addBlock(modIdx, lessonIdx, 'p')}><Plus className="w-4 h-4" /> TEXTO</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-accent/20 text-accent-foreground" onClick={() => addBlock(modIdx, lessonIdx, 'math')}><Sigma className="w-4 h-4" /> RLM</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-emerald-200 text-emerald-700" onClick={() => addBlock(modIdx, lessonIdx, 'audio')}><Mic2 className="w-4 h-4" /> ÁUDIO</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-indigo-200 text-indigo-700" onClick={() => addBlock(modIdx, lessonIdx, 'slides')}><Presentation className="w-4 h-4" /> SLIDES</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-indigo-200 text-indigo-700" onClick={() => addBlock(modIdx, lessonIdx, 'table')}><Grid3X3 className="w-4 h-4" /> TABELA</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-slate-300" onClick={() => addBlock(modIdx, lessonIdx, 'law')}><Shield className="w-4 h-4" /> LEI</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-amber-200 text-amber-700" onClick={() => addBlock(modIdx, lessonIdx, 'tip')}><Lightbulb className="w-4 h-4" /> DICA</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-red-200 text-red-700" onClick={() => addBlock(modIdx, lessonIdx, 'warning')}><AlertTriangle className="w-4 h-4" /> ALERTA</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-emerald-200 text-emerald-700" onClick={() => addBlock(modIdx, lessonIdx, 'quiz')}><HelpCircle className="w-4 h-4" /> QUIZ</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2 border-blue-200 text-blue-700" onClick={() => addBlock(modIdx, lessonIdx, 'video')}><Youtube className="w-4 h-4" /> VÍDEO</Button>
                             <Button variant="outline" size="sm" className="h-10 text-[10px] font-black gap-2" onClick={() => addBlock(modIdx, lessonIdx, 'image')}><ImageIcon className="w-4 h-4" /> IMAGEM</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação moverá o curso para a lixeira. Você poderá restaurá-lo mais tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCourseId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
