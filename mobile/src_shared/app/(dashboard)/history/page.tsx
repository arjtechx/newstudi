
"use client"

import React, { useState, useEffect } from 'react';
import { getHistory } from '@/lib/store';
import { UserPerformance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [history, setHistory] = useState<UserPerformance['history']>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      const data = await getHistory(firestore, user.id);
      const sortedHistory = data.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : a.timestamp;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : b.timestamp;
        return timeB - timeA;
      });
      setHistory(sortedHistory);
      setIsLoading(false);
    }
    fetchHistory();
  }, [user, firestore]);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Firebase serverTimestamp can be a Timestamp object or a number from our older model
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd 'de' MMMM, HH:mm", { locale: ptBR });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-black tracking-tight">Histórico de Atividades</h1>
        <p className="text-muted-foreground">Analise seu rastro de aprendizagem e identifique padrões de erro.</p>
      </div>

      <Card className="material-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Matéria / Tópico</TableHead>
              <TableHead className="text-right">XP Ganhos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="mx-auto w-8 h-8 animate-spin text-primary" /></TableCell></TableRow>
            ) : history.length > 0 ? (
              history.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {item.isCorrect ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Correto
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 font-bold">
                        <XCircle className="w-4 h-4" /> Incorreto
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary uppercase">{item.subject}</span>
                      <span className="text-sm">{item.topic}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">
                    +{item.xpEarned || (item.isCorrect ? 50 : 10)} XP
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <HistoryIcon className="w-12 h-12 opacity-20" />
                    <p>Você ainda não respondeu nenhuma questão.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function HistoryIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
