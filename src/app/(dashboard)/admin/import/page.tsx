
"use client"

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveQuestion, saveCourse, getQuestions, getCourses, getUsers } from '@/lib/store';
import { 
  FileJson, 
  Upload, 
  ShieldCheck, 
  Database, 
  History,
  Download,
  FileCode,
  BookOpen,
  GraduationCap,
  Users,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  RefreshCcw,
  Layers,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { CourseSchema, QuestionSchema } from '@/lib/schemas';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type ImportStatus = 'NEW' | 'UPDATE' | 'DUPLICATE_CONTENT';

type StagedItem = {
  id: string; 
  realId?: string; 
  type: 'question' | 'course' | 'user';
  title: string;
  subtitle: string;
  data: any;
  status: ImportStatus;
};

export default function AdvancedImportPage() {
  const firestore = useFirestore();
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importType, setImportType] = useState<'BACKUP' | 'BATCH' | 'SINGLE' | null>(null);
  
  // Export states
  const [exportQuestions, setExportQuestions] = useState(true);
  const [exportCourses, setExportCourses] = useState(true);
  const [exportUsers, setExportUsers] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!jsonInput.trim()) return;
    setIsProcessing(true);
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Sintaxe", description: "O conteúdo inserido não é um JSON válido." });
      setIsProcessing(false);
      return;
    }

    try {
      // Fetch existing data for duplication check
      const [existingQuestions, existingCourses] = await Promise.all([
        getQuestions(firestore),
        getCourses(firestore)
      ]);

      const newStaged: StagedItem[] = [];
      
      const isQuestion = (item: any) => item && typeof item === 'object' && (item.enunciado || item.materia);
      const isCourse = (item: any) => item && typeof item === 'object' && (item.modules || item.lessons || (item.title && item.category));

      const processItem = (item: any, type: 'question' | 'course') => {
        if (!item) return;
        const id = `staged-${Math.random().toString(36).substring(7)}`;
        
        let status: ImportStatus = 'NEW';
        
        if (type === 'question') {
          const hasSameId = existingQuestions.find(q => q.id === item.id);
          const hasSameContent = existingQuestions.find(q => q.enunciado?.trim() === item.enunciado?.trim());
          
          if (hasSameId) status = 'UPDATE';
          else if (hasSameContent) status = 'DUPLICATE_CONTENT';

          newStaged.push({
            id,
            realId: item.id,
            type: 'question',
            title: (item.enunciado?.substring(0, 60) || 'Questão sem enunciado') + '...',
            subtitle: `${item.materia || 'Geral'} > ${item.assunto || 'Sem Assunto'}`,
            data: item,
            status
          });
        } else if (type === 'course') {
          const hasSameId = existingCourses.find(c => c.id === item.id);
          const hasSameTitle = existingCourses.find(c => c.title?.trim() === item.title?.trim());

          if (hasSameId) status = 'UPDATE';
          else if (hasSameTitle) status = 'DUPLICATE_CONTENT';

          newStaged.push({
            id,
            realId: item.id,
            type: 'course',
            title: item.title || 'Curso sem título',
            subtitle: `${item.category || 'Geral'} | ${item.modules?.length || 0} Módulos`,
            data: item,
            status
          });
        }
      };

      // Cascade Detection Logic
      if (parsed.questions && Array.isArray(parsed.questions)) {
        setImportType('BACKUP');
        parsed.questions.forEach((q: any) => processItem(q, 'question'));
      }
      if (parsed.courses && Array.isArray(parsed.courses)) {
        setImportType('BACKUP');
        parsed.courses.forEach((c: any) => processItem(c, 'course'));
      }

      if (newStaged.length === 0) {
        if (Array.isArray(parsed)) {
          setImportType('BATCH');
          parsed.forEach(item => {
            if (isQuestion(item)) processItem(item, 'question');
            else if (isCourse(item)) processItem(item, 'course');
          });
        } 
        else {
           if (isQuestion(parsed)) {
             setImportType('SINGLE');
             processItem(parsed, 'question');
           } else if (isCourse(parsed)) {
             setImportType('SINGLE');
             processItem(parsed, 'course');
           }
        }
      }

      if (newStaged.length === 0) {
        throw new Error("Nenhum dado compatível (Questões ou Cursos) foi localizado no JSON.");
      }

      setStagedItems(newStaged);
      const autoSelected = new Set<number>();
      newStaged.forEach((item, idx) => {
        if (item.status !== 'DUPLICATE_CONTENT') {
          autoSelected.add(idx);
        }
      });
      setSelectedIndices(autoSelected);
      
      toast({ title: "Análise Concluída", description: `${newStaged.length} registros mapeados com verificação de duplicidade.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Falha na Leitura", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === stagedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(stagedItems.map((_, i) => i)));
    }
  };

  const toggleIndex = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const handleImportSelected = async () => {
    if (selectedIndices.size === 0) return;
    setIsProcessing(true);

    try {
      const itemsToSave = Array.from(selectedIndices).map(idx => stagedItems[idx]);
      let questionsSaved = 0;
      let coursesSaved = 0;

      for (const item of itemsToSave) {
        if (item.type === 'question') {
          const validated = QuestionSchema.parse(item.data);
          saveQuestion(firestore, validated);
          questionsSaved++;
        } else if (item.type === 'course') {
          const courseData = { ...item.data };
          // Auto-fix tables if in old format
          courseData.modules?.forEach((m: any) => {
            m.lessons?.forEach((l: any) => {
              l.blocks?.forEach((b: any) => {
                if (b.type === 'table' && b.metadata?.rows && Array.isArray(b.metadata.rows)) {
                   if (b.metadata.rows.length > 0 && Array.isArray(b.metadata.rows[0])) {
                     b.metadata.rows = b.metadata.rows.map((row: string[]) => ({ cells: row }));
                   }
                }
              });
            });
          });
          const validated = CourseSchema.parse(courseData);
          saveCourse(firestore, validated);
          coursesSaved++;
        }
      }

      toast({ 
        title: "Importação Finalizada", 
        description: `${questionsSaved} questões e ${coursesSaved} cursos integrados com sucesso.` 
      });
      resetStage();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro na Gravação", description: "Alguns itens não seguem o formato obrigatório do sistema." });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetStage = () => {
    setStagedItems([]);
    setSelectedIndices(new Set());
    setJsonInput('');
    setImportType(null);
  };

  const handleExportSystem = async () => {
    setIsProcessing(true);
    try {
      const [questions, courses, users] = await Promise.all([
        exportQuestions ? getQuestions(firestore, true) : Promise.resolve([]),
        exportCourses ? getCourses(firestore, true) : Promise.resolve([]),
        exportUsers ? getUsers(firestore) : Promise.resolve([])
      ]);

      const systemData = {
        version: "1.1.0",
        exportDate: new Date().toISOString(),
        questions: questions.length > 0 ? questions : undefined,
        courses: courses.length > 0 ? courses : undefined,
        users: users.length > 0 ? users : undefined,
      };

      const blob = new Blob([JSON.stringify(systemData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aprovaconcursos_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Dados Exportados", description: "O arquivo de backup foi gerado e baixado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na Exportação" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ImportStatus) => {
    switch (status) {
      case 'NEW': return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black text-[8px] uppercase">Novo</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-500 hover:bg-blue-600 font-black text-[8px] uppercase">Atualizar</Badge>;
      case 'DUPLICATE_CONTENT': return <Badge className="bg-amber-500 hover:bg-amber-600 font-black text-[8px] uppercase flex gap-1"><AlertTriangle className="w-2 h-2" /> Duplicado</Badge>;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Database className="w-10 h-10 text-primary" /> Central de Dados
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Gestão de Carga e Detecção de Duplicidade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="material-card border-2 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
            <div className="h-2 bg-primary" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 uppercase italic text-xl">
                  {stagedItems.length > 0 ? <RefreshCcw className="w-5 h-5 text-primary" /> : <Upload className="w-5 h-5 text-primary" />}
                  {stagedItems.length > 0 ? "Revisão de Dados" : "Carga de Entrada"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {stagedItems.length > 0 
                    ? `${stagedItems.length} registros aguardando aprovação. Verifique as duplicidades.` 
                    : "Insira os dados em formato JSON para análise de integridade."}
                </CardDescription>
              </div>
              {stagedItems.length === 0 && (
                <div className="flex gap-2">
                  <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setJsonInput(event.target?.result as string);
                      reader.readAsText(file);
                    }
                  }} />
                  <Button variant="outline" size="sm" className="font-black gap-2 border-primary text-primary" onClick={() => fileInputRef.current?.click()}>
                    <FileCode className="w-4 h-4" /> SELECIONAR ARQUIVO
                  </Button>
                </div>
              )}
              {stagedItems.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive font-black gap-2 uppercase text-[10px]" onClick={resetStage}>
                  <X className="w-4 h-4" /> Cancelar Carga
                </Button>
              )}
            </CardHeader>
            
            <CardContent className="flex-1 bg-muted/10 p-0">
              {stagedItems.length === 0 ? (
                <div className="p-6 h-full flex flex-col space-y-4">
                  <Textarea 
                    className="flex-1 min-h-[400px] font-mono text-[11px] bg-white border-2 rounded-2xl p-6 focus-visible:ring-primary shadow-inner" 
                    placeholder='Cole aqui seu JSON... (Ex: { "questions": [...] } ou [ { "enunciado": "..." } ])' 
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                  <div className="p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <p className="text-[10px] text-primary font-bold uppercase">O motor de descoberta detectará itens já existentes para evitar poluição no banco de dados.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center bg-white p-4 border-b">
                    <div className="flex items-center gap-3">
                      <Checkbox id="select-all" checked={selectedIndices.size === stagedItems.length} onCheckedChange={toggleSelectAll} />
                      <Label htmlFor="select-all" className="text-[10px] font-black uppercase cursor-pointer">Selecionar Todos ({stagedItems.length})</Label>
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase font-black bg-primary/5 border-primary/20">
                      ORIGEM: {importType}
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[450px]">
                    <div className="divide-y">
                      {stagedItems.map((item, idx) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center gap-4 p-5 transition-all cursor-pointer hover:bg-muted/30",
                            selectedIndices.has(idx) ? "bg-primary/5" : "opacity-40 grayscale"
                          )}
                          onClick={() => toggleIndex(idx)}
                        >
                          <Checkbox checked={selectedIndices.has(idx)} onCheckedChange={() => toggleIndex(idx)} />
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg",
                            item.type === 'question' ? "bg-amber-500" : "bg-primary"
                          )}>
                            {item.type === 'question' ? <BookOpen className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-sm truncate uppercase tracking-tight">{item.title}</h4>
                                {getStatusBadge(item.status)}
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                {item.type === 'question' ? <Layers className="w-3 h-3" /> : <TableIcon className="w-3 h-3" />}
                                {item.subtitle}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[8px] font-black tracking-widest">{item.type.toUpperCase()}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-white p-6 border-t shadow-inner">
              {stagedItems.length === 0 ? (
                <Button className="w-full h-14 text-lg font-black gap-3 shadow-[0_5px_0_0_#1e40af] uppercase italic" onClick={handleAnalyze} disabled={isProcessing || !jsonInput.trim()}>
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Search className="w-6 h-6" /> Analisar Estrutura</>}
                </Button>
              ) : (
                <Button className="w-full h-14 text-lg font-black gap-3 shadow-[0_5px_0_0_#1e40af] uppercase italic" onClick={handleImportSelected} disabled={isProcessing || selectedIndices.size === 0}>
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ShieldCheck className="w-6 h-6" /> Sincronizar Selecionados ({selectedIndices.size})</>}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="material-card border-primary/20 bg-white overflow-hidden shadow-xl">
            <div className="h-1 bg-primary" />
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2 uppercase italic">
                <Download className="w-5 h-5 text-primary" /> Central de Saída
              </CardTitle>
              <CardDescription className="text-xs">Gere arquivos de backup para restauração futura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border-2 transition-all hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg"><BookOpen className="w-4 h-4 text-amber-600" /></div>
                    <div>
                      <Label className="font-black text-[10px] uppercase tracking-widest">Questões</Label>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Banco Operacional</p>
                    </div>
                  </div>
                  <Switch checked={exportQuestions} onCheckedChange={setExportQuestions} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border-2 transition-all hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg"><GraduationCap className="w-4 h-4 text-primary" /></div>
                    <div>
                      <Label className="font-black text-[10px] uppercase tracking-widest">Cursos</Label>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Trilhas de Estudos</p>
                    </div>
                  </div>
                  <Switch checked={exportCourses} onCheckedChange={setExportCourses} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border-2 transition-all hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg"><Users className="w-4 h-4 text-emerald-600" /></div>
                    <div>
                      <Label className="font-black text-[10px] uppercase tracking-widest">Usuários</Label>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Perfis e Desempenho</p>
                    </div>
                  </div>
                  <Switch checked={exportUsers} onCheckedChange={setExportUsers} />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex gap-3 shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-[9px] text-blue-800 font-black italic leading-relaxed uppercase">
                  Os arquivos gerados são 100% compatíveis com o terminal de entrada desta plataforma.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full h-14 font-black border-2 border-primary text-primary gap-2 hover:bg-primary hover:text-white transition-all shadow-[0_4px_0_0_#2563eb] active:translate-y-1 active:shadow-none uppercase italic"
                onClick={handleExportSystem}
                disabled={isProcessing || (!exportQuestions && !exportCourses && !exportUsers)}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Gerar Backup
              </Button>
            </CardFooter>
          </Card>
          
          <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex gap-4 shadow-lg">
            <History className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-800 font-bold italic leading-relaxed">
              DICA OPERACIONAL: O sistema desmarca automaticamente itens duplicados por conteúdo. Revise a lista para garantir que deseja atualizar registros existentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
