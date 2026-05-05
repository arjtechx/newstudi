
"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  CheckSquare, 
  History, 
  LogOut,
  ShieldCheck,
  TrendingUp,
  Award,
  Download,
  GraduationCap,
  Trash2,
  User,
  Users,
  Settings2,
  Zap,
  Terminal,
  UserSearch,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const studentNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Missão Adaptativa', href: '/ai-study', icon: Zap },
  { name: 'Cursos Prep', href: '/courses', icon: GraduationCap },
  { name: 'Checklist', href: '/checklist', icon: CheckSquare },
  { name: 'Questões', href: '/questions', icon: BookOpen },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Meu Perfil', href: '/profile', icon: User },
];

const adminNav = [
  { name: 'Painel Admin', href: '/admin', icon: ShieldCheck },
  { name: 'Simulador', href: '/admin/preview', icon: UserSearch },
  { name: 'Gerenciar Usuários', href: '/admin/users', icon: Users },
  { name: 'Gerenciar Cursos', href: '/admin/courses', icon: GraduationCap },
  { name: 'Questões e Matérias', href: '/admin/questions', icon: BookOpen },
  { name: 'Configurações', href: '/admin/settings', icon: Settings2 },
  { name: 'Lixeira', href: '/admin/trash', icon: Trash2 },
  { name: 'Meu Perfil', href: '/admin/profile', icon: User },
];

export const SidebarNav = () => {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const logout = () => {
    signOut(auth);
  }

  const progressToNextLevel = user ? ((user.xp ?? 0) % 1000) / 10 : 0;
  const currentNav = user?.role === 'admin' ? [...adminNav] : studentNav;

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-full md:w-64 p-4 lg:p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 rotate-3">
            <Award className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-headline font-black text-xl tracking-tighter text-primary italic">AprovaConcursos</h1>
        </div>
        <Badge variant="outline" className="text-[8px] font-black opacity-50 px-1 py-0 border-primary/20">BETA</Badge>
      </div>

      <nav className="flex-1 space-y-1.5">
        {currentNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all group",
              pathname === item.href 
                ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]" 
                : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
            )}
          >
            <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", pathname === item.href ? "text-white" : "text-primary/60")} />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {user?.role === 'admin' && (
           <Button 
            asChild
            variant="outline" 
            size="sm" 
            className="w-full h-12 justify-start text-xs font-black gap-3 border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 rounded-xl uppercase italic"
           >
             <Link href="/admin/import">
              <Download className="w-4 h-4" />
              Backup do Sistema
             </Link>
           </Button>
        )}

        {user?.role === 'student' && !isUserLoading && user && (
          <div className="bg-primary/5 p-5 rounded-2xl border-2 border-primary/10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-primary uppercase italic">Nível {user.level || 1}</span>
              <span className="text-xs font-black text-primary">{user.xp || 0} XP</span>
            </div>
            <Progress value={progressToNextLevel} className="h-1.5 bg-primary/10" />
            <div className="flex items-center gap-1.5 mt-3">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Fogo: {user.studyStreak || 0} dias</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-6">
          <Link href={user?.role === 'admin' ? '/admin/profile' : '/profile'} className="flex items-center gap-3 px-2 group cursor-pointer">
            <Avatar className="h-10 w-10 border-2 border-primary/10 group-hover:border-primary transition-all shadow-sm">
              <AvatarImage src={user?.photoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-black text-sm uppercase">
                {user?.name?.substring(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate group-hover:text-primary transition-colors text-slate-800">{user?.name}</span>
              <span className="text-[10px] font-black text-muted-foreground truncate uppercase tracking-widest">{user?.role}</span>
            </div>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="w-full h-11 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 gap-3 px-3 font-bold rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logoff Operacional
          </Button>
        </div>
      </div>
    </div>
  );
};
