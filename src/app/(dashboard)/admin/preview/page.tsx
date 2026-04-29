
"use client"

import React, { useState, useEffect } from 'react';
import { useFirestore, useFirebase } from '@/firebase';
import { getScientificDashboardData, getUsers } from '@/lib/store';
import { ScientificDashboard, UserProfile } from '@/lib/types';
import { Loader2, UserSearch, AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentDashboardView } from '@/components/dashboard/student-dashboard-view';
import { cn } from '@/lib/utils';

export default function AdminPreviewPage() {
  const firestore = useFirestore();
  const { settings } = useFirebase();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ScientificDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    getUsers(firestore).then(data => {
      setUsers(data);
      if (data.length > 0) {
        setSelectedUserId(data[0].id);
      }
      setIsLoading(false);
    });
  }, [firestore]);

  useEffect(() => {
    if (!selectedUserId || !firestore) return;
    setIsPreviewLoading(true);
    
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
        setSelectedUser(user);
        getScientificDashboardData(firestore, selectedUserId).then(data => {
            setStats(data);
            setIsPreviewLoading(false);
        });
    }
  }, [selectedUserId, firestore, users]);

  if (isLoading || !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border-2 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary">
            <UserSearch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase italic">Simulador de Experiência</h1>
            <p className="text-xs text-muted-foreground font-medium">Visualize o dashboard através dos olhos de qualquer aluno.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-muted p-1 rounded-xl">
             <button 
                onClick={() => setPreviewMode('desktop')}
                className={cn("p-2 rounded-lg transition-all", previewMode === 'desktop' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
             >
                <Monitor className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setPreviewMode('mobile')}
                className={cn("p-2 rounded-lg transition-all", previewMode === 'mobile' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
             >
                <Smartphone className="w-4 h-4" />
             </button>
          </div>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full md:w-64 h-12 font-bold border-2">
              <SelectValue placeholder="Selecionar Aluno..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? 'Admin' : 'Aluno'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn(
        "transition-all duration-500 mx-auto",
        previewMode === 'mobile' ? "max-w-[400px] border-[12px] border-slate-900 rounded-[3rem] h-[800px] overflow-hidden shadow-2xl relative" : "w-full"
      )}>
        {previewMode === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50" />
        )}
        
        <div className={cn(
            "bg-background h-full",
            previewMode === 'mobile' ? "overflow-y-auto custom-scrollbar pt-8" : ""
        )}>
            {isPreviewLoading || !selectedUser || !stats ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="font-black uppercase text-xs animate-pulse">Carregando Dossiê...</p>
              </div>
            ) : (
              <StudentDashboardView 
                user={selectedUser} 
                stats={stats} 
                settings={settings} 
                isPreview={true} 
              />
            )}
        </div>
      </div>

      {!stats && !isPreviewLoading && (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
            <p className="text-muted-foreground font-bold">Nenhum dado de desempenho localizado para este usuário.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
