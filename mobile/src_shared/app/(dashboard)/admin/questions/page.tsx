
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { getQuestions, saveQuestion, deleteQuestion, getSubjects, getSystemSettings } from '@/lib/store';
import { Question, Difficulty, Subject, AIMultiConfig, AIProviderName } from '@/lib/types';
import { callAI, AIMessage, AI_PROVIDER_DEFAULTS } from '@/lib/ai-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Save, 
  BookCopy, 
  FileJson, 
  Search,
  Tag as TagIcon,
  ShieldAlert,
  FileText,
  Terminal,
  HelpCircle,
  Sparkles,
  Zap,
  RotateCcw,
  Bot,
  Cpu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { QuestionListSchema } from '@/lib/schemas';
import { runFullDataAudit } from '@/lib/maintenance-actions';
// generateQuestion (Genkit) removido em favor do novo sistema callAI multi-provedor

export default function AdminQuestionsPage() {
  const firestore = useFirestore();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonInput, setJsonInput] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [aiSystemConfig, setAiSystemConfig] = useState<AIMultiConfig | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<AIProviderName | 'none'>('none');

  const [aiGenParams, setAiGenParams] = useState({
    topic: '',
    subject: '',
    difficulty: 'Médio' as Difficulty
  });

  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({
    enunciado: '',
    alternativas: ['', '', '', ''],
    correta: 0,
    materia: '',
    assunto: '',
    nivelDificuldade: 'Médio',
    explicacao: '',
    banca: 'Prep IA',
    ano: new Date().getFullYear(),
    tags: []
  });

  const { toast } = useToast();
  
  const fetchQuestionsAndSubjects = async () => {
    setIsLoading(true);
    const [questionsData, subjectsData, settings] = await Promise.all([
      getQuestions(firestore),
      getSubjects(firestore),
      getSystemSettings(firestore)
    ]);
    setQuestions(questionsData);
    setSubjects(subjectsData);
    
    if (settings?.aiConfig) {
      setAiSystemConfig(settings.aiConfig);
      setSelectedEngine(settings.aiConfig.defaultProvider || 'none');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuestionsAndSubjects();
  }, [firestore]);

  const handleRunAiGeneration = async () => {
    if (!aiGenParams.topic || !aiGenParams.subject) {
      toast({ variant: 'destructive', title: 'Campos Vazios', description: 'Informe a matéria e o tópico para a IA.' });
      return;
    }

    if (!aiSystemConfig || selectedEngine === 'none') {
      toast({ variant: 'destructive', title: 'IA Não Configurada', description: 'Configure um provedor de IA no painel administrativo.' });
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Gere uma questão inédita de concurso público seguindo estritamente este formato JSON:
{
  "enunciado": "corpo da questão",
  "alternativas": ["opção A", "opção B", "opção C", "opção D"],
  "correta": 0,
  "explicacao": "detalhes técnicos da resposta",
  "materia": "${aiGenParams.subject}",
  "assunto": "${aiGenParams.topic}"
}

Critérios:
- Matéria: ${aiGenParams.subject}
- Tópico: ${aiGenParams.topic}
- Dificuldade: ${aiGenParams.difficulty}
- Idioma: Português (Brasil)
- Formato: Responda APENAS o JSON puro, sem markdown.`;

      const res = await callAI(aiSystemConfig, [{ role: 'user', content: prompt }], { forceProvider: selectedEngine as any });
      
      if (res.error) throw new Error(res.error);

      // Limpar possíveis markdown fences do JSON
      const cleanJson = res.response.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      setEditingQuestion({
        enunciado: result.enunciado,
        alternativas: result.alternativas,
        correta: result.correta,
        materia: result.materia || aiGenParams.subject,
        assunto: result.assunto || aiGenParams.topic,
        nivelDificuldade: aiGenParams.difficulty,
        explicacao: result.explicacao,
        banca: 'INTELIGÊNCIA ARTIFICIAL',
        ano: new Date().getFullYear(),
        tags: [result.materia || aiGenParams.subject, result.assunto || aiGenParams.topic]
      });

      setIsAiDialogOpen(false);
      setIsQuestionDialogOpen(true);
      toast({ title: 'Questão Gerada!', description: `Processado via ${selectedEngine.toUpperCase()}.` });
    } catch (error: any) {
      console.error('AI Error:', error);
      toast({ variant: 'destructive', title: 'Erro na IA', description: error.message || 'Não foi possível gerar a questão.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await runFullDataAudit();
      toast({ 
        title: "Auditoria Determinística Concluída", 
        description: `${result.brokenRefs} vínculos de questões foram reparados com sucesso.` 
      });
      await fetchQuestionsAndSubjects();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro no Script', description: e.message });
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.enunciado.toLowerCase().includes(search.toLowerCase()) ||
    q.materia.toLowerCase().includes(search.toLowerCase()) ||
    q.assunto.toLowerCase().includes(search.toLowerCase()) ||
    (q.tags && q.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const handleBulkSoftDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        deleteQuestion(firestore, id);
      }
      toast({ title: "Operação Concluída", description: `${selectedIds.size} questões movidas para a lixeira.` });
      setSelectedIds(new Set());
      await fetchQuestionsAndSubjects();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na operação' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return;
    try {
        const parsedData = JSON.parse(jsonInput);
        const items = Array.isArray(parsedData) ? parsedData : [parsedData];
        const validation = QuestionListSchema.safeParse(items);
        if (!validation.success) throw new Error("Estrutura inválida.");

        for (const question of validation.data) {
            saveQuestion(firestore, question);
        }
        await fetchQuestionsAndSubjects();
        setIsJsonImportOpen(false);
        setJsonInput('');
        toast({ title: "Importado", description: "Questões integradas." });
    } catch (err: any) {
        toast({ variant: "destructive", title: "Erro na Validação" });
    }
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion.enunciado || !editingQuestion.materia || !editingQuestion.assunto) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Preencha os campos obrigatórios.' });
      return;
    }
    saveQuestion(firestore, { ...editingQuestion as Question });
    await fetchQuestionsAndSubjects();
    setIsQuestionDialogOpen(false);
    toast({ title: 'Sincronizado' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <BookCopy className="w-8 h-8 text-primary" /> Banco de Questões
          </h1>
          <p className="text-muted-foreground font-medium">Gestão tática do acervo com vinculação via tags.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => setIsInstructionsOpen(true)} className="gap-2 border-amber-500 text-amber-600 font-bold">
                <HelpCircle className="w-4 h-4" /> Instruções JSON
            </Button>
            <Button variant="outline" onClick={handleRunAudit} disabled={isAuditing} className="gap-2 border-emerald-500 text-emerald-600 font-bold">
                {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                Verificar Vínculos
            </Button>
            <Button variant="outline" onClick={() => setIsAiDialogOpen(true)} className="gap-2 border-primary text-primary font-black bg-primary/5">
                <Sparkles className="w-4 h-4" /> GERAR COM IA
            </Button>
            <Button variant="outline" onClick={() => setIsJsonImportOpen(true)} className="gap-2 border-primary text-primary font-bold">
                <FileJson className="w-4 h-4" /> Importar JSON
            </Button>
            <Button onClick={() => { setEditingQuestion({ enunciado: '', alternativas: ['', '', '', ''], correta: 0, materia: subjects[0]?.name || '', assunto: '', nivelDificuldade: 'Médio', explicacao: '', banca: 'Prep IA', ano: new Date().getFullYear(), tags: [] }); setIsQuestionDialogOpen(true); }} className="gap-2 font-black shadow-[0_4px_0_0_#1e40af]">
                <Plus className="w-4 h-4" /> Nova Questão
            </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filtrar por enunciado, matéria, assunto ou tags..." 
          className="pl-10 h-12 border-2 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border-2 border-primary/20 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-bold text-primary uppercase">{selectedIds.size} Itens Selecionados</span>
          <Button variant="destructive" size="sm" className="font-black gap-2" onClick={handleBulkSoftDelete}>
            <Trash2 className="w-4 h-4" /> MOVER PARA LIXEIRA
          </Button>
        </div>
      )}

      <Card className="material-card overflow-hidden border-2 shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox onCheckedChange={(checked) => setSelectedIds(checked ? new Set(filteredQuestions.map(q => q.id)) : new Set())} /></TableHead>
              <TableHead className="font-black uppercase text-[10px]">Origem</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Matéria</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Vinculação (Tags)</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Enunciado</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                <TableRow key={q.id} className={cn("group", selectedIds.has(q.id) && "bg-primary/5")}>
                    <TableCell><Checkbox checked={selectedIds.has(q.id)} onCheckedChange={(checked) => { const next = new Set(selectedIds); checked ? next.add(q.id) : next.delete(q.id); setSelectedIds(next); }} /></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase font-black">{q.banca} {q.ano}</Badge></TableCell>
                    <TableCell><Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-black text-[9px] uppercase tracking-tighter">{q.materia}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {q.tags?.map((t, i) => <Badge key={i} variant="secondary" className="text-[8px] font-bold py-0">{t}</Badge>)}
                        {(!q.tags || q.tags.length === 0) && <span className="text-[8px] opacity-50 italic">Sem tags</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm font-medium">{q.enunciado}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsQuestionDialogOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { deleteQuestion(firestore, q.id); fetchQuestionsAndSubjects(); }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                    </TableCell>
                </TableRow>
            )) : <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-30 uppercase font-black">Nenhum registro localizado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* IA Generator Dialog */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-md border-4 border-primary/20 rounded-[2.5rem] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2 pt-2">
               <Sparkles className="text-primary" /> Laboratório de IA
            </DialogTitle>
            <DialogDescription className="font-bold">
              Selecione o motor e o tema. A IA criará uma questão inédita para você.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {/* Engine Selection */}
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Motor de Inteligência
                </label>
                <Select value={selectedEngine} onValueChange={(v: any) => setSelectedEngine(v)}>
                    <SelectTrigger className="h-12 border-2 font-bold uppercase italic bg-slate-50">
                      <SelectValue placeholder="Escolha o motor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>DESATIVADO</SelectItem>
                      {aiSystemConfig && Object.entries(aiSystemConfig.providers)
                        .filter(([_, slot]) => slot.enabled)
                        .map(([pName, _]) => (
                          <SelectItem key={pName} value={pName} className="font-black uppercase italic">
                            {pName} {pName === aiSystemConfig.defaultProvider ? '(PADRÃO)' : ''}
                          </SelectItem>
                        ))
                      }
                      {!aiSystemConfig && <SelectItem value="none">Carregando motores...</SelectItem>}
                    </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Setor (Matéria)
                </label>
                <Select value={aiGenParams.subject} onValueChange={v => setAiGenParams({...aiGenParams, subject: v})}>
                    <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                  <TagIcon className="w-3 h-3" /> Alvo Específico (Tópico)
                </label>
                <Input 
                  placeholder="Ex: Artigo 5º da CF ou Crase" 
                  className="h-12 border-2 font-bold"
                  value={aiGenParams.topic}
                  onChange={e => setAiGenParams({...aiGenParams, topic: e.target.value})}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nível de Dificuldade IA</label>
                <div className="grid grid-cols-3 gap-2">
                   {['Fácil', 'Médio', 'Difícil'].map(d => (
                     <Button 
                        key={d} 
                        variant={aiGenParams.difficulty === d ? 'default' : 'outline'} 
                        onClick={() => setAiGenParams({...aiGenParams, difficulty: d as any})}
                        className="font-black text-[10px] h-10 rounded-xl border-2"
                     >
                       {d}
                     </Button>
                   ))}
                </div>
             </div>
          </div>
          <DialogFooter className="pt-2">
             <Button 
                className="w-full h-16 text-lg font-black gap-3 shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none rounded-2xl"
                onClick={handleRunAiGeneration}
                disabled={isGenerating || selectedEngine === 'none'}
             >
               {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />}
               DETONAR GERAÇÃO
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isJsonImportOpen} onOpenChange={setIsJsonImportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase italic font-black"><FileJson className="text-primary" /> Importação em Lote</DialogTitle></DialogHeader>
          <Textarea className="min-h-[400px] font-mono text-xs bg-slate-950 text-emerald-500 rounded-xl p-4" placeholder="Cole o JSON de questões..." value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
          <DialogFooter><Button onClick={handleJsonImport} className="font-black bg-primary">SINCRONIZAR</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase italic font-black text-amber-600"><FileText /> Estrutura de Importação Tática</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium">Use o formato abaixo para importar múltiplas questões de uma vez. O campo <code className="bg-muted px-1 rounded">tags</code> é essencial para a vinculação inteligente.</p>
            <div className="bg-slate-950 p-6 rounded-2xl overflow-x-auto">
              <pre className="text-[10px] text-emerald-400 font-mono">
{`[
  {
    "materia": "Direito Constitucional",
    "assunto": "Artigo 5º",
    "enunciado": "A casa é asilo inviolável do indivíduo...",
    "alternativas": [
      "Opção A",
      "Opção B",
      "Opção C",
      "Opção D"
    ],
    "correta": 1,
    "explicacao": "Conforme o texto da CF/88...",
    "nivelDificuldade": "Médio",
    "banca": "FCC",
    "ano": 2024,
    "tags": ["cf88", "art5", "direitos-individuais"]
  }
]`}
              </pre>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-bold">IMPORTANTE: O índice "correta" começa em 0 (A=0, B=1, C=2...). Se não enviar tags, o sistema usará a matéria e o assunto como tags automáticas.</p>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setIsInstructionsOpen(false)} className="font-black">ENTENDIDO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-4 border-primary/20 rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic">{editingQuestion.id ? 'Refinar Questão' : 'Nova Questão Tática'}</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary">Matéria</label>
                    <Select value={editingQuestion.materia} onValueChange={v => setEditingQuestion({...editingQuestion, materia: v})}>
                        <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary">Assunto</label>
                    <Input value={editingQuestion.assunto} onChange={e => setEditingQuestion({...editingQuestion, assunto: e.target.value})} className="font-bold border-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary">Dificuldade</label>
                    <Select value={editingQuestion.nivelDificuldade} onValueChange={v => setEditingQuestion({...editingQuestion, nivelDificuldade: v as Difficulty})}>
                        <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Fácil">Fácil</SelectItem><SelectItem value="Médio">Médio</SelectItem><SelectItem value="Difícil">Difícil</SelectItem><SelectItem value="Hardcore">Hardcore</SelectItem></SelectContent>
                    </Select>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary">Banca</label>
                    <Input value={editingQuestion.banca || ''} onChange={e => setEditingQuestion({...editingQuestion, banca: e.target.value})} className="font-bold border-2" placeholder="Ex: FCC, FGV, CEBRASPE" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary">Ano</label>
                    <Input type="number" value={editingQuestion.ano || ''} onChange={e => setEditingQuestion({...editingQuestion, ano: parseInt(e.target.value)})} className="font-bold border-2" />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                  <TagIcon className="w-3 h-3" /> Tags de Vinculação (Separe por vírgula)
                </label>
                <Input 
                  value={editingQuestion.tags?.join(', ')} 
                  placeholder="ex: cf88, administrativo, art5"
                  onChange={e => setEditingQuestion({...editingQuestion, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})} 
                  className="font-bold border-2" 
                />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-primary">Enunciado Principal</label>
                <Textarea value={editingQuestion.enunciado} onChange={e => setEditingQuestion({...editingQuestion, enunciado: e.target.value})} className="min-h-[150px] font-bold border-2 rounded-xl" />
             </div>
             <div className="space-y-3 p-6 bg-muted/30 rounded-2xl border-2 border-dashed">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alternativas de Resposta</label>
                {editingQuestion.alternativas?.map((alt, idx) => (
                    <div key={idx} className="flex gap-2">
                        <Button variant={editingQuestion.correta === idx ? "default" : "outline"} className={cn("w-10 h-10 shrink-0 font-black rounded-xl", editingQuestion.correta === idx && "bg-emerald-600")} onClick={() => setEditingQuestion({...editingQuestion, correta: idx})}>{String.fromCharCode(65 + idx)}</Button>
                        <Input value={alt} onChange={e => { const a = [...editingQuestion.alternativas!]; a[idx] = e.target.value; setEditingQuestion({...editingQuestion, alternativas: a}); }} className="font-semibold border-2 rounded-xl" />
                    </div>
                ))}
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-primary">Justificativa Técnica</label>
                <Textarea value={editingQuestion.explicacao} onChange={e => setEditingQuestion({...editingQuestion, explicacao: e.target.value})} className="border-2 rounded-xl italic text-sm" />
             </div>
          </div>
          <DialogFooter className="pt-6">
            <Button onClick={handleSaveQuestion} className="w-full h-14 text-lg font-black shadow-[0_5px_0_0_#1e40af]">
              <Save className="w-5 h-5 mr-2" /> SALVAR REGISTRO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
