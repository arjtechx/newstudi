
"use client"

import React, { useState, useEffect } from 'react';
import { CourseService, generateSecureId } from '@/lib/services/course-service';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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



export default function AdminCoursesPage() {
  const firestore = useFirestore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const [isBBCodeDialogOpen, setIsBBCodeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [bbcodeInput, setBbcodeInput] = useState('');
  const [activeLessonTarget, setActiveLessonTarget] = useState<{modIdx: number, lessonIdx: number} | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [expandedModuleIdx, setExpandedModuleIdx] = useState<number | null>(null);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchCourses = async () => {
    setIsLoading(true);
    const data = await CourseService.getAll(firestore);
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

    await CourseService.save(firestore, editingCourse);
    await fetchCourses();
    setIsDialogOpen(false);
    toast({ title: 'Sincronizado', description: 'Curso salvo no banco de dados.' });
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourseId) return;
    await CourseService.delete(firestore, deletingCourseId);
    await fetchCourses();
    toast({ title: 'Lixeira', description: 'Curso movido para a lixeira.' });
    setDeletingCourseId(null);
    setIsDeleteDialogOpen(false);
  };

  const addModule = () => {
    setEditingCourse(CourseService.addModule(editingCourse));
  };

  const addLesson = (modIdx: number) => {
    setEditingCourse(CourseService.addLesson(editingCourse, modIdx));
    setExpandedModuleIdx(modIdx);
  };

  const addBlock = (modIdx: number, lessonIdx: number, type: BlockType, insertIdx?: number) => {
    setEditingCourse(CourseService.addBlock(editingCourse, modIdx, lessonIdx, type, insertIdx));
    toast({ title: 'Bloco Adicionado', description: `Um novo bloco de ${type} foi inserido.` });
  };

  const updateBlockValue = (modIdx: number, lessonIdx: number, blockIdx: number, value: string) => {
    setEditingCourse(CourseService.updateBlockValue(editingCourse, modIdx, lessonIdx, blockIdx, value));
  };

  const updateBlockMeta = (modIdx: number, lessonIdx: number, blockIdx: number, key: string, value: any) => {
    setEditingCourse(CourseService.updateBlockMeta(editingCourse, modIdx, lessonIdx, blockIdx, key, value));
  };

  const moveBlock = (modIdx: number, lessonIdx: number, blockIdx: number, dir: 'up' | 'down') => {
    setEditingCourse(CourseService.moveBlock(editingCourse, modIdx, lessonIdx, blockIdx, dir));
  };

  const removeBlock = (modIdx: number, lessonIdx: number, blockIdx: number) => {
    setEditingCourse(CourseService.removeBlock(editingCourse, modIdx, lessonIdx, blockIdx));
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
        await CourseService.save(firestore, course);
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
            setExpandedModuleIdx(null);
            setSelectedLessonIdx(null);
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
                    <Button variant="ghost" size="icon" onClick={() => { 
                      setEditingCourse(JSON.parse(JSON.stringify(course))); 
                      setExpandedModuleIdx(null);
                      setSelectedLessonIdx(null);
                      setIsDialogOpen(true); 
                    }}><Edit2 className="w-4 h-4" /></Button>
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
            {/* LATERAL (SIDEBAR DE MÓDULOS) */}
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
              
              {/* LISTAGEM DE MÓDULOS E LIÇÕES */}
              <div className="space-y-4 pt-4 border-t-2 border-slate-200/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Módulos e Aulas</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={addModule}><Plus className="w-4 h-4" /></Button>
                </div>
                
                <div className="space-y-3">
                  {(editingCourse.modules || []).map((mod, modIdx) => (
                    <div key={`side-mod-${modIdx}`} className="space-y-1">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border-2 border-slate-100 shadow-sm">
                        <Input className="h-7 text-xs font-bold border-none bg-transparent p-0 focus-visible:ring-0 flex-1" placeholder="Nome do Módulo" value={mod.title} onChange={e => {
                          const newMods = JSON.parse(JSON.stringify(editingCourse.modules || []));
                          newMods[modIdx].title = e.target.value;
                          setEditingCourse({...editingCourse, modules: newMods});
                        }} />
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" onClick={() => addLesson(modIdx)}><Plus className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => {
                            setEditingCourse(CourseService.removeModule(editingCourse, modIdx));
                            if (expandedModuleIdx === modIdx) { setExpandedModuleIdx(null); setSelectedLessonIdx(null); }
                          }}><Trash className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      
                      {/* Lições */}
                      <div className="pl-4 space-y-1 border-l-2 border-slate-200/50 ml-3">
                        {(mod.lessons || []).map((lesson, lessonIdx) => {
                          const isSelected = expandedModuleIdx === modIdx && selectedLessonIdx === lessonIdx;
                          return (
                            <div key={`side-lesson-${lessonIdx}`} className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-transparent' : 'hover:bg-slate-100 border-transparent'}`} onClick={() => {
                              setExpandedModuleIdx(modIdx);
                              setSelectedLessonIdx(lessonIdx);
                            }}>
                              <span className={`text-xs truncate max-w-[140px] ${isSelected ? 'font-black text-primary' : 'font-semibold text-slate-600'}`}>{lesson.title || 'Nova Lição'}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {
                                e.stopPropagation();
                                setEditingCourse(CourseService.removeLesson(editingCourse, modIdx, lessonIdx));
                                if (isSelected) { setExpandedModuleIdx(null); setSelectedLessonIdx(null); }
                              }}><Trash className="w-3 h-3" /></Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-slate-50 relative">
              {expandedModuleIdx === null || selectedLessonIdx === null ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                  <div className="bg-primary/5 p-10 rounded-[3rem] border-4 border-dashed border-primary/20">
                     <Layout className="w-16 h-16 text-primary/30 mx-auto" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-slate-800">Selecione uma Matéria</h2>
                    <p className="font-bold text-slate-400 max-w-md mx-auto">Navegue pela barra lateral para escolher o módulo que deseja editar.</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto p-10 pb-40">
                  {(() => {
                    const modIdx = expandedModuleIdx;
                    const lessonIdx = selectedLessonIdx;
                    const mod = editingCourse.modules?.[modIdx];
                    const lesson = mod?.lessons?.[lessonIdx];
                    if (!lesson) return null;

                    return (
                      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        {/* CABEÇALHO DA LIÇÃO */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-primary/10 shadow-sm">
                          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                            <Clock className="w-6 h-6 text-primary" />
                            <Input className="font-black text-3xl border-none p-0 focus-visible:ring-0 flex-1 h-12" placeholder="Título da Lição" value={lesson.title} onChange={e => {
                              const newMods = JSON.parse(JSON.stringify(editingCourse.modules || []));
                              newMods[modIdx].lessons[lessonIdx].title = e.target.value;
                              setEditingCourse({...editingCourse, modules: newMods});
                            }} />
                            <Button variant="outline" size="lg" className="h-12 gap-2 font-black text-xs border-primary text-primary" onClick={() => { setActiveLessonTarget({ modIdx, lessonIdx }); setIsBBCodeDialogOpen(true); }}>
                              <Code2 className="w-4 h-4" /> BBCODE
                            </Button>
                          </div>
                        </div>

                        {/* BLOCOS DA LIÇÃO */}
                        <div className="space-y-6">
                          {(lesson.blocks || []).map((block, blockIdx) => (
                            <div key={`${block.id}-${modIdx}-${lessonIdx}-${blockIdx}`} className="relative group/block border-2 border-transparent hover:border-primary/20 rounded-2xl p-4 bg-slate-50/30 transition-all">
                              <div className="absolute -left-12 top-0 bottom-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/block:opacity-100 transition-all duration-300 z-10 p-2">
                                  {/* INSERT TOP */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 bg-primary text-white shadow-lg rounded-full absolute -top-2 hover:scale-125 transition-transform"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="left" className="w-56 p-2 rounded-2xl shadow-2xl border-4 border-slate-100 z-[100]">
                                    <div className="grid grid-cols-2 gap-1.5 p-1">
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'h1', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-primary/10 w-full"><Type className="w-3 h-3 text-primary" /> TÍTULO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'p', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-primary/10 w-full"><Plus className="w-3 h-3 text-primary" /> TEXTO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'math', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-accent/10 w-full"><Sigma className="w-3 h-3 text-accent" /> RLM</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'audio', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-emerald-100 w-full"><Mic2 className="w-3 h-3 text-emerald-500" /> ÁUDIO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'slides', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-indigo-100 w-full"><Presentation className="w-3 h-3 text-indigo-500" /> SLIDES</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'table', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-indigo-100 w-full"><Grid3X3 className="w-3 h-3 text-indigo-500" /> TABELA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'law', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-slate-200 w-full"><Shield className="w-3 h-3 text-slate-500" /> LEI</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'tip', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-amber-100 w-full"><Lightbulb className="w-3 h-3 text-amber-500" /> DICA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'warning', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-red-100 w-full"><AlertTriangle className="w-3 h-3 text-red-500" /> ALERTA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'quiz', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-emerald-100 w-full"><HelpCircle className="w-3 h-3 text-emerald-500" /> QUIZ</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'video', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-blue-100 w-full"><Youtube className="w-3 h-3 text-blue-500" /> VÍDEO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'image', blockIdx)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-slate-200 w-full"><ImageIcon className="w-3 h-3 text-slate-500" /> IMAGEM</Button></DropdownMenuItem>
                                    </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                <div className="flex flex-col gap-1.5 bg-white shadow-xl border-2 border-slate-100 p-1.5 rounded-2xl">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100" onClick={() => moveBlock(modIdx, lessonIdx, blockIdx, 'up')}><MoveUp className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-50 text-destructive" onClick={() => removeBlock(modIdx, lessonIdx, blockIdx)}><Trash className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100" onClick={() => moveBlock(modIdx, lessonIdx, blockIdx, 'down')}><MoveDown className="w-4 h-4" /></Button>
                                </div>

                                {/* INSERT BOTTOM */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 bg-primary text-white shadow-lg rounded-full absolute -bottom-2 hover:scale-125 transition-transform"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent side="left" className="w-56 p-2 rounded-2xl shadow-2xl border-4 border-slate-100 z-[100]">
                                    <div className="grid grid-cols-2 gap-1.5 p-1">
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'h1', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-primary/10 w-full"><Type className="w-3 h-3 text-primary" /> TÍTULO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'p', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-primary/10 w-full"><Plus className="w-3 h-3 text-primary" /> TEXTO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'math', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-accent/10 w-full"><Sigma className="w-3 h-3 text-accent" /> RLM</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'audio', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-emerald-100 w-full"><Mic2 className="w-3 h-3 text-emerald-500" /> ÁUDIO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'slides', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-indigo-100 w-full"><Presentation className="w-3 h-3 text-indigo-500" /> SLIDES</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'table', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-indigo-100 w-full"><Grid3X3 className="w-3 h-3 text-indigo-500" /> TABELA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'law', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-slate-200 w-full"><Shield className="w-3 h-3 text-slate-500" /> LEI</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'tip', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-amber-100 w-full"><Lightbulb className="w-3 h-3 text-amber-500" /> DICA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'warning', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-red-100 w-full"><AlertTriangle className="w-3 h-3 text-red-500" /> ALERTA</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'quiz', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-emerald-100 w-full"><HelpCircle className="w-3 h-3 text-emerald-500" /> QUIZ</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'video', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-blue-100 w-full"><Youtube className="w-3 h-3 text-blue-500" /> VÍDEO</Button></DropdownMenuItem>
                                      <DropdownMenuItem asChild onSelect={() => addBlock(modIdx!, lessonIdx!, 'image', blockIdx + 1)}><Button variant="outline" size="sm" className="justify-start h-9 text-[9px] font-black gap-2 border-slate-200 w-full"><ImageIcon className="w-3 h-3 text-slate-500" /> IMAGEM</Button></DropdownMenuItem>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

                        {/* FLOATING SIDE TOOLBAR */}
                        <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
                          {isToolbarOpen && (
                            <div className="flex flex-col gap-1.5 p-3 bg-white rounded-3xl shadow-2xl border-4 border-slate-100 animate-in fade-in slide-in-from-bottom-8">
                              <div className="px-2 pb-2 border-b-2 border-slate-100/60 mb-2 flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ferramentas</span>
                              </div>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'h1')}><Type className="w-3.5 h-3.5 text-primary" /> TÍTULO</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'p')}><Plus className="w-3.5 h-3.5 text-primary" /> TEXTO</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-accent/20 hover:bg-accent/5 hover:border-accent/50 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'math')}><Sigma className="w-3.5 h-3.5 text-accent" /> RLM</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'audio')}><Mic2 className="w-3.5 h-3.5 text-emerald-500" /> ÁUDIO</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'slides')}><Presentation className="w-3.5 h-3.5 text-indigo-500" /> SLIDES</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'table')}><Grid3X3 className="w-3.5 h-3.5 text-indigo-500" /> TABELA</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'law')}><Shield className="w-3.5 h-3.5 text-slate-500" /> LEI</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-amber-200 hover:bg-amber-50 hover:border-amber-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'tip')}><Lightbulb className="w-3.5 h-3.5 text-amber-500" /> DICA</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-red-200 hover:bg-red-50 hover:border-red-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'warning')}><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> ALERTA</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'quiz')}><HelpCircle className="w-3.5 h-3.5 text-emerald-500" /> QUIZ</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'video')}><Youtube className="w-3.5 h-3.5 text-blue-500" /> VÍDEO</Button>
                              <Button variant="outline" size="sm" className="justify-start h-9 text-[10px] font-black gap-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700" onClick={() => addBlock(modIdx, lessonIdx, 'image')}><ImageIcon className="w-3.5 h-3.5 text-slate-500" /> IMAGEM</Button>
                            </div>
                          )}
                          <Button 
                            size="icon" 
                            className={`h-14 w-14 rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-110 active:scale-95 ${isToolbarOpen ? 'bg-slate-800 hover:bg-slate-900 rotate-[135deg]' : 'bg-primary hover:bg-primary/90'}`}
                            onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                          >
                            <Plus className="w-6 h-6 text-white" />
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
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
