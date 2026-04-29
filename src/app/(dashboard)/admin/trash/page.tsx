
"use client"

import React, { useState, useEffect } from 'react';
import { 
  getQuestions, restoreQuestion, permanentlyDeleteQuestion,
  getCourses, restoreCourse, permanentlyDeleteCourse,
  getUsers, restoreUser, permanentlyDeleteUser,
  getSubjects, restoreSubject, permanentlyDeleteSubject
} from '@/lib/store';
import { Question, Course, UserProfile, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RefreshCw, 
  Trash2, 
  ShieldAlert, 
  BookOpen, 
  GraduationCap, 
  Loader2, 
  Users, 
  BookCopy,
  ChevronRight,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminTrashPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [tab, setTab] = useState('questions');
  const [data, setData] = useState<{questions: Question[], courses: Course[], users: UserProfile[], subjects: Subject[]}>({ questions: [], courses: [], users: [], subjects: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);

  const refreshTrash = async () => {
    setIsLoading(true);
    setSelectedIds(new Set());
    const [allQ, allC, allU, allS] = await Promise.all([
      getQuestions(firestore, true), getCourses(firestore, true), getUsers(firestore, true), getSubjects(firestore, true)
    ]);
    setData({
      questions: allQ.filter(q => !!q.deletedAt),
      courses: allC.filter(c => !!c.deletedAt),
      users: allU.filter(u => !!u.deletedAt),
      subjects: allS.filter(s => !!s.deletedAt)
    });
    setIsLoading(false);
  };

  useEffect(() => { refreshTrash(); }, [firestore]);

  const currentList = tab === 'questions' ? data.questions : tab === 'courses' ? data.courses : tab === 'users' ? data.users : data.subjects;

  const toggleSelectAll = () => {
    if (selectedIds.size === currentList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentList.map(item => item.id)));
  };

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkRestore = async () => {
    setIsLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        if (tab === 'questions') restoreQuestion(firestore, id);
        else if (tab === 'courses') restoreCourse(firestore, id);
        else if (tab === 'users') restoreUser(firestore, id);
        else if (tab === 'subjects') restoreSubject(firestore, id);
      }
      toast({ title: "Restaurado", description: `${selectedIds.size} itens voltaram ao banco ativo.` });
      await refreshTrash();
    } catch (e) { toast({ variant: 'destructive', title: 'Erro ao restaurar' }); }
    setIsLoading(false);
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const ids = deleteMode === 'BULK' ? Array.from(selectedIds) : [itemToDelete!.id];
      for (const id of ids) {
        if (tab === 'questions') permanentlyDeleteQuestion(firestore, id);
        else if (tab === 'courses') permanentlyDeleteCourse(firestore, id);
        else if (tab === 'users') permanentlyDeleteUser(firestore, id);
        else if (tab === 'subjects') permanentlyDeleteSubject(firestore, id);
      }
      toast({ variant: 'destructive', title: 'Excluído', description: 'Removido permanentemente do sistema.' });
      await refreshTrash();
    } catch (e) { toast({ variant: 'destructive', title: 'Erro ao excluir' }); }
    setIsLoading(false);
    setIsDeleteDialogOpen(false);
  };

  const formatDate = (ts: any) => ts ? format(ts.toDate ? ts.toDate() : new Date(ts), "dd/MM HH:mm", { locale: ptBR }) : '-';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3"><Trash2 className="w-8 h-8 text-destructive" /> Lixeira do Sistema</h1>
          <p className="text-muted-foreground font-medium italic">Recuperação de dados ou purificação permanente.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl h-14 bg-muted/50 border-2 rounded-2xl overflow-hidden p-1">
          <TabsTrigger value="questions" className="gap-2 font-black uppercase text-[10px]"><BookOpen className="w-3 h-3" /> Questões ({data.questions.length})</TabsTrigger>
          <TabsTrigger value="courses" className="gap-2 font-black uppercase text-[10px]"><GraduationCap className="w-3 h-3" /> Cursos ({data.courses.length})</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 font-black uppercase text-[10px]"><Users className="w-3 h-3" /> Usuários ({data.users.length})</TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2 font-black uppercase text-[10px]"><BookCopy className="w-3 h-3" /> Matérias ({data.subjects.length})</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {selectedIds.size > 0 && (
            <div className="bg-destructive/10 border-2 border-destructive/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-destructive font-black">{selectedIds.size}</Badge>
                <span className="text-sm font-bold text-destructive uppercase italic">Operação em Lote</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="font-black border-emerald-500 text-emerald-600 gap-2" onClick={handleBulkRestore}><RefreshCw className="w-3 h-3" /> RESTAURAR TODOS</Button>
                <Button variant="destructive" size="sm" className="font-black gap-2" onClick={() => { setDeleteMode('BULK'); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /> PURGAR DEFINITIVAMENTE</Button>
              </div>
            </div>
          )}

          <Card className="material-card overflow-hidden border-2 shadow-xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40px]"><Checkbox checked={selectedIds.size === currentList.length && currentList.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Excluído em</TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Identificador / Título</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : currentList.length > 0 ? currentList.map((item: any) => (
                  <TableRow key={item.id} className={cn("group transition-colors", selectedIds.has(item.id) && "bg-destructive/5")}>
                    <TableCell><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleId(item.id)} /></TableCell>
                    <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">{formatDate(item.deletedAt)}</TableCell>
                    <TableCell>
                      {tab === 'users' ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={item.photoUrl} /><AvatarFallback className="font-black text-[10px]">{item.name?.substring(0,1)}</AvatarFallback></Avatar>
                          <div className="flex flex-col"><span className="text-xs font-bold">{item.name}</span><span className="text-[9px] text-muted-foreground font-medium">{item.email}</span></div>
                        </div>
                      ) : tab === 'questions' ? (
                        <div className="flex flex-col"><span className="text-xs font-bold text-destructive uppercase italic">{item.materia}</span><span className="text-sm font-medium line-clamp-1 opacity-60">{item.enunciado}</span></div>
                      ) : (
                        <span className="font-bold text-sm">{item.title || item.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="outline" size="sm" className="h-8 font-black text-[9px] border-emerald-500 text-emerald-600 gap-1" onClick={() => {
                          if (tab === 'questions') restoreQuestion(firestore, item.id);
                          else if (tab === 'courses') restoreCourse(firestore, item.id);
                          else if (tab === 'users') restoreUser(firestore, item.id);
                          else if (tab === 'subjects') restoreSubject(firestore, item.id);
                          refreshTrash();
                          toast({ title: "Item Restaurado" });
                        }}><RefreshCw className="w-3 h-3" /> RESTAURAR</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setItemToDelete({id: item.id, type: tab}); setDeleteMode('SINGLE'); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] italic">Lixeira Vazia.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-4 border-destructive/20 rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2"><ShieldAlert className="text-destructive" /> ALERTA DE PURGA</AlertDialogTitle>
            <AlertDialogDescription className="font-bold">Esta ação é **irreversível**. Os dados serão incinerados permanentemente do banco de dados operacional.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="font-bold">ABORTAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive font-black shadow-[0_4px_0_0_#991b1b] active:translate-y-1 active:shadow-none transition-all">CONFIRMAR INCINERAÇÃO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="material-card p-4 flex items-center justify-between border-2"><div className="space-y-1"><p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{label}</p><p className="text-2xl font-black italic">{value}</p></div><div className="p-3 bg-muted/50 rounded-xl">{icon}</div></Card>
  );
}
