"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  getQuestions, 
  getUsers,
} from '@/lib/store';
import type { UserProfile } from '@/lib/types';
import { 
  Database, 
  Users, 
  AlertCircle, 
  PieChart as PieIcon, 
  ShieldCheck,
  Download,
  Layout,
  BookOpen,
  Loader2,
  User,
  Settings2,
  Terminal,
  UserSearch,
  TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFirestore, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [questionsCount, setQuestionsCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [subjectDistribution, setSubjectDistribution] = useState<{name: string, count: number}[]>([]);
  const [latestUser, setLatestUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [questions, users] = await Promise.all([
          getQuestions(firestore),
          getUsers(firestore)
        ]);

        setQuestionsCount(questions.length);
        setUsersCount(users.length);

        const distribution = Array.from(new Set(questions.map(q => q.materia))).map(m => ({
          name: m ? m.split(' ')[0] : 'Geral',
          count: questions.filter(q => q.materia === m).length
        }));
        setSubjectDistribution(distribution);

        if (users.length > 0) {
          const sortedUsers = [...users].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setLatestUser(sortedUsers[0]);
        }
      } catch (err) {
        console.error("Erro no carregamento administrativo:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isUserLoading, firestore]);


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-primary" /> Central de Comando
          </h1>
          <p className="text-muted-foreground font-medium">Gestão inteligente de dados e métricas da AprovaConcursos.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button asChild variant="outline" className="flex-1 md:flex-none gap-2 border-primary text-primary font-black shadow-[0_3px_0_0_#2563eb] active:translate-y-0.5 active:shadow-none">
            <Link href="/admin/import">
              <Download className="w-4 h-4" /> IMPORTAR / EXPORTAR
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-12 bg-muted/50 border-2">
          <TabsTrigger value="metrics" className="font-black uppercase text-xs gap-2">
            <PieIcon className="w-4 h-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="data" className="font-black uppercase text-xs gap-2">
            <Database className="w-4 h-4" /> Acesso Rápido
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Banco de Questões" value={questionsCount.toString()} icon={<Database className="w-5 h-5 text-primary" />} />
                <StatCard title="Usuários Ativos" value={usersCount.toString()} icon={<Users className="w-5 h-5 text-accent" />} />
                <StatCard title="Status do Sistema" value="OPERANTE" icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} />
                <StatCard title="Versão" value="1.0-BETA" icon={<AlertCircle className="w-5 h-5 text-orange-500" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 material-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-black uppercase">Volume por Área</CardTitle>
                    <CardDescription>Distribuição de questões no banco de dados operacional</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    {subjectDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectDistribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{fill: 'rgba(38,98,217,0.05)'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic">Nenhum dado para exibir.</div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="material-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-black uppercase">Módulos de Gestão</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <QuickLink href="/admin/preview" icon={<UserSearch />} title="Simulador de Aluno" desc="Visualize através de outros olhos" />
                      <QuickLink href="/admin/users" icon={<Users />} title="Gerenciar Usuários" desc="Controle de acesso e cargos" />
                      <QuickLink href="/admin/courses" icon={<Layout />} title="Gerenciar Cursos" desc="Editor visual de trilhas" />
                      <QuickLink href="/admin/questions" icon={<BookOpen />} title="Gerenciar Questões" desc="Manutenção de banco tático" />
                      <QuickLink href="/admin/maintenance" icon={<Terminal />} title="Auditoria e Scripts" desc="Integridade e migração de dados" />
                      <QuickLink href="/admin/settings" icon={<Settings2 />} title="Configurações" desc="Sons, animações e sistema" />
                      <QuickLink href="/admin/trash" icon={<AlertCircle />} title="Lixeira do Sistema" desc="Recuperação de dados deletados" />
                    </CardContent>
                  </Card>
                  <LatestUserCard user={latestUser} />
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="data">
           <Card className="material-card">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase">Links Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickLink href="/admin/preview" icon={<UserSearch />} title="Simulador de Aluno" desc="Visualize através de outros olhos" />
                <QuickLink href="/admin/users" icon={<Users />} title="Gerenciar Usuários" desc="Controle de acesso e cargos" />
                <QuickLink href="/admin/courses" icon={<Layout />} title="Gerenciar Cursos" desc="Editor visual de trilhas" />
                <QuickLink href="/admin/questions" icon={<BookOpen />} title="Gerenciar Questões" desc="Manutenção de banco tático" />
                <QuickLink href="/admin/maintenance" icon={<Terminal />} title="Auditoria e Scripts" desc="Integridade e migração de dados" />
                <QuickLink href="/admin/settings" icon={<Settings2 />} title="Configurações" desc="Sons, animações e sistema" />
                <QuickLink href="/admin/trash" icon={<AlertCircle />} title="Lixeira do Sistema" desc="Recuperação de dados deletados" />
                <QuickLink href="/admin/import" icon={<Download />} title="Importar/Exportar" desc="Gestão de backups e dados em lote" />
                <QuickLink href="/admin/profile" icon={<User />} title="Meu Perfil" desc="Alterar seus dados e senha" />
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="material-card border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tighter">{value}</div>
      </CardContent>
    </Card>
  );
}

function LatestUserCard({ user }: { user: UserProfile | null }) {
  if (!user) return null;

  return (
    <Card className="material-card">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase">Novo Recruta</CardTitle>
        <CardDescription>Último operador registrado na plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-primary/10">
          <AvatarImage src={user.photoUrl} />
          <AvatarFallback>{user.name?.substring(0, 1) ?? '?'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-sm">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {user.createdAt && (
            <p className="text-[10px] text-muted-foreground font-bold">
              Em {format(new Date(user.createdAt), "dd 'de' MMMM", { locale: ptBR })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon, title, desc }: { href: string, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors border-2 border-transparent hover:border-primary/10 group">
      <div className="bg-primary/10 p-2.5 rounded-lg text-primary group-hover:scale-110 transition-transform">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <div>
        <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">{title}</h4>
        <p className="text-[10px] text-muted-foreground font-medium">{desc}</p>
      </div>
    </Link>
  );
}
