
"use client"

import React, { useState, useEffect } from 'react';
import { getUsers, saveUser, deleteUser, getHistory, getProgress } from '@/lib/store';
import { UserProfile, UserRole, UserPerformance, SubjectProgress } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  GraduationCap, 
  Edit2, 
  Trash2, 
  MoreHorizontal,
  Mail,
  Calendar,
  ShieldAlert,
  Loader2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  KeyRound,
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordResetAlertOpen, setIsPasswordResetAlertOpen] = useState(false);
  const [userForPasswordReset, setUserForPasswordReset] = useState<Partial<UserProfile> | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const userList = await getUsers(firestore);
    setUsers(userList);
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (!isUserLoading && user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, isUserLoading, firestore]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkSoftDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        deleteUser(firestore, id);
      }
      toast({ title: "Sincronizado", description: `${selectedIds.size} usuários movidos para a lixeira.` });
      setSelectedIds(new Set());
      await fetchUsers();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na operação' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = (userId: string, role: UserRole) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate) {
      const updated = { ...userToUpdate, role };
      saveUser(firestore, updated);
      fetchUsers();
      toast({ title: "Cargo Atualizado", description: `Usuário agora é ${role === 'admin' ? 'Administrador' : 'Aluno'}.` });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingUserId) return;
    deleteUser(firestore, deletingUserId);
    fetchUsers();
    toast({ title: "Usuário na Lixeira" });
    setDeletingUserId(null);
    setIsDeleteDialogOpen(false);
  };

  const handleSaveEdit = () => {
    if (editingUser && editingUser.id) {
      saveUser(firestore, editingUser as UserProfile);
      fetchUsers();
      setIsEditDialogOpen(false);
      toast({ title: "Perfil Atualizado" });
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!userForPasswordReset?.email) return;
    try {
      await sendPasswordResetEmail(auth, userForPasswordReset.email);
      toast({ title: "E-mail Enviado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao Enviar", description: error.message });
    } finally {
      setIsPasswordResetAlertOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> Gestão de Operadores
          </h1>
          <p className="text-muted-foreground font-medium">Controle de acesso e cargos da plataforma AprovaConcursos.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou e-mail..." 
            className="pl-10 h-12 border-2 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border-2 border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary font-black">{selectedIds.size}</Badge>
            <span className="text-sm font-bold text-primary uppercase">Usuários Selecionados</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="font-bold text-primary hover:bg-primary/10" onClick={() => setSelectedIds(new Set())}>Desmarcar Tudo</Button>
            <Button variant="destructive" size="sm" className="font-black gap-2" onClick={handleBulkSoftDelete}>
              <Trash2 className="w-4 h-4" /> MOVER PARA LIXEIRA
            </Button>
          </div>
        </div>
      )}

      <Card className="material-card border-2 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="font-black uppercase text-[10px]">Identidade</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Cargo</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Cadastro</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Segurança</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredUsers.length > 0 ? filteredUsers.map((u) => (
                <TableRow key={u.id} className={cn("group transition-colors", selectedIds.has(u.id) && "bg-primary/5")}>
                  <TableCell><Checkbox checked={selectedIds.has(u.id)} onCheckedChange={() => toggleId(u.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/10"><AvatarImage src={u.photoUrl} /><AvatarFallback className="font-bold bg-primary/10 text-primary">{u.name.substring(0, 1)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{u.name}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium"><Mail className="w-2 h-2" /> {u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? "default" : "secondary"} className="font-black text-[9px] uppercase tracking-widest">
                      {u.role === 'admin' ? <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ADMIN</span> : <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> ALUNO</span>}
                    </Badge>
                  </TableCell>
                  <TableCell><div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {u.createdAt ? format(u.createdAt, "dd/MM/yyyy", { locale: ptBR }) : '-'}</div></TableCell>
                  <TableCell>{u.twoFactorEnabled ? <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-[8px] font-black uppercase">2FA ATIVO</Badge> : <Badge variant="outline" className="border-muted text-muted-foreground text-[8px] font-black uppercase">2FA INATIVO</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 font-bold">
                        <DropdownMenuItem onSelect={() => { setEditingUser(u); setIsEditDialogOpen(true); }} className="gap-2 cursor-pointer"><Edit2 className="w-4 h-4" /> Editar Dados</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setViewingUser(u); setIsPerformanceDialogOpen(true); }} className="gap-2 cursor-pointer"><TrendingUp className="w-4 h-4" /> Ver Desempenho</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setUserForPasswordReset(u); setIsPasswordResetAlertOpen(true); }} className="gap-2 cursor-pointer"><KeyRound className="w-4 h-4" /> Redefinir Senha</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleUpdateRole(u.id, u.role === 'admin' ? 'student' : 'admin')} className="gap-2 cursor-pointer">{u.role === 'admin' ? <GraduationCap className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />} Tornar {u.role === 'admin' ? 'Aluno' : 'Admin'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => { setDeletingUserId(u.id); setIsDeleteDialogOpen(true); }} className="gap-2 text-destructive cursor-pointer hover:bg-destructive/10"><Trash2 className="w-4 h-4" /> Mover para Lixeira</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
              <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-30 text-muted-foreground uppercase text-xs font-black">Nenhum operador localizado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md border-4 border-primary/20 rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase italic">Ajuste de Identidade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-primary">Nome Completo</label><Input value={editingUser?.name || ''} onChange={e => setEditingUser({...editingUser!, name: e.target.value})} className="font-bold border-2" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-primary">E-mail (Leitura)</label><Input value={editingUser?.email || ''} readOnly disabled className="font-bold border-2 bg-muted/50" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-primary">WhatsApp / Contato</label><Input value={editingUser?.phone || ''} onChange={e => setEditingUser({...editingUser!, phone: e.target.value})} className="font-bold border-2" /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveEdit} className="w-full h-14 font-black bg-primary text-lg shadow-[0_5px_0_0_#1e40af]">SALVAR ALTERAÇÕES</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão?</AlertDialogTitle><AlertDialogDescription>O usuário será movido para a lixeira do sistema.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingUserId(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive font-black">CONFIRMAR</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Dossiê de Desempenho: {viewingUser?.name}</DialogTitle></DialogHeader>{viewingUser && <div className="flex-1 overflow-y-auto custom-scrollbar pr-4"><UserPerformanceDetails user={viewingUser} /></div>}</DialogContent>
      </Dialog>
    </div>
  );
}

function UserPerformanceDetails({ user }: { user: UserProfile }) {
  const firestore = useFirestore();
  const [history, setHistory] = useState<UserPerformance['history']>([]);
  const [progress, setProgress] = useState<SubjectProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user.id) return;
    const fetchData = async () => {
      setIsLoading(true);
      const [historyData, progressData] = await Promise.all([getHistory(firestore, user.id), getProgress(firestore, user.id)]);
      setHistory(historyData.sort((a, b) => (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : b.timestamp) - (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : a.timestamp)));
      setProgress(progressData);
      setIsLoading(false);
    };
    fetchData();
  }, [firestore, user.id]);

  const stats = React.useMemo(() => {
    const total = history.length;
    const correct = history.filter(h => h.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, incorrect: total - correct, accuracy };
  }, [history]);
  
  if (isLoading) return <div className="flex items-center justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatItem label="Aproveitamento" value={`${stats.accuracy}%`} icon={<TrendingUp className="text-primary" />} />
        <StatItem label="Questões Totais" value={stats.total.toString()} icon={<Users className="text-accent" />} />
        <StatItem label="Acertos / Erros" value={`${stats.correct} / ${stats.incorrect}`} icon={<ShieldCheck className="text-emerald-500" />} />
      </div>
      <Tabs defaultValue="progress">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50"><TabsTrigger value="progress" className="font-black uppercase text-xs">Progresso Edital</TabsTrigger><TabsTrigger value="history" className="font-black uppercase text-xs">Histórico Tático</TabsTrigger></TabsList>
        <TabsContent value="progress" className="mt-4">
          <Accordion type="multiple" className="space-y-2">
            {progress.map((s) => (
              <AccordionItem key={s.id} value={s.id} className="border-2 rounded-2xl bg-white overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline"><div className="w-full text-left pr-4"><div className="flex justify-between items-center"><span className="font-black uppercase text-xs">{s.name}</span><Badge variant="secondary" className="font-black">{s.topics.filter(t => t.studied && t.reviewed).length}/{s.topics.length}</Badge></div><Progress value={(s.topics.filter(t => t.studied && t.reviewed).length / s.topics.length) * 100} className="h-1 mt-2" /></div></AccordionTrigger>
                <AccordionContent className="px-4 pb-4 bg-muted/5 border-t">
                  <ul className="space-y-2 pt-4">{s.topics.map(t => <li key={t.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-white border shadow-sm"><span className={cn("font-bold", t.studied && t.reviewed && "text-muted-foreground line-through")}>{t.name}</span><div className="flex gap-3"><Badge variant={t.studied ? "default" : "outline"} className="text-[8px] font-black">ESTUDO</Badge><Badge variant={t.reviewed ? "default" : "outline"} className="text-[8px] font-black bg-accent">REVISÃO</Badge></div></li>)}</ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card className="material-card overflow-hidden"><Table><TableHeader className="bg-muted/30"><TableRow><TableHead className="font-black text-[9px] uppercase">Status</TableHead><TableHead className="font-black text-[9px] uppercase">Data</TableHead><TableHead className="font-black text-[9px] uppercase">Matéria/Tópico</TableHead></TableRow></TableHeader><TableBody>{history.slice(0, 30).map((h, i) => <TableRow key={i}><TableCell>{h.isCorrect ? <CheckCircle2 className="text-emerald-500 w-4 h-4" /> : <XCircle className="text-red-500 w-4 h-4" />}</TableCell><TableCell className="text-[10px] font-bold text-muted-foreground">{h.timestamp?.toDate ? format(h.timestamp.toDate(), "dd/MM HH:mm") : '-'}</TableCell><TableCell><div className="font-black text-[10px] uppercase text-primary leading-tight">{h.subject}</div><div className="text-[9px] text-muted-foreground font-medium">{h.topic}</div></TableCell></TableRow>)}</TableBody></Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="material-card p-4 flex items-center justify-between border-2"><div className="space-y-1"><p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{label}</p><p className="text-2xl font-black italic">{value}</p></div><div className="p-3 bg-muted/50 rounded-xl">{icon}</div></Card>
  );
}
