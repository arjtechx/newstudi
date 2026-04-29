
"use client"

import React, { useState, useEffect } from 'react';
import { getProgress, saveProgress } from '@/lib/store';
import { SubjectProgress } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Book, RefreshCcw, Target, Trophy, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';

export default function ChecklistPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getProgress(firestore, user.id);
    setSubjects(data);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchProgress();
  }, [user, firestore]);

  const handleToggle = (subjectId: string, topicId: string, field: 'studied' | 'reviewed') => {
    if (!user) return;
    const newSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => {
            if (t.id === topicId) {
              return { ...t, [field]: !t[field] };
            }
            return t;
          })
        };
      }
      return s;
    });
    setSubjects(newSubjects);
    saveProgress(firestore, user.id, newSubjects);
  };

  if (isLoading) {
    return (
       <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-black tracking-tight">Checklist de Estudos</h1>
          <p className="text-muted-foreground">Monitore seu avanço em cada ponto do edital do seu concurso.</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Meta</span>
            <Trophy className="w-5 h-5 text-accent" />
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-sm font-bold">100% Edital</div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-4" defaultValue={subjects.map(s => s.id)}>
        {subjects.map((subject) => {
          if (!subject.topics) return null;
          const completedTopics = subject.topics.filter(t => t.studied && t.reviewed).length;
          const progress = (completedTopics / (subject.topics.length || 1)) * 100;

          return (
            <AccordionItem key={subject.id} value={subject.id} className="border-none">
              <Card className="material-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex flex-col items-start text-left w-full gap-2">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="text-lg font-bold">{subject.name}</span>
                      <Badge variant={progress === 100 ? "default" : "secondary"}>
                        {completedTopics}/{subject.topics.length} tópicos
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-1.5 w-full mt-1" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                      <Book className="w-3 h-3" /> Tópico do Conteúdo
                    </div>
                    <div className="hidden md:grid grid-cols-2 text-xs font-bold text-muted-foreground uppercase text-center">
                      <div className="flex items-center justify-center gap-1"><Book className="w-3 h-3" /> Estudar</div>
                      <div className="flex items-center justify-center gap-1"><RefreshCcw className="w-3 h-3" /> Revisar</div>
                    </div>

                    {subject.topics.map((topic) => (
                      <React.Fragment key={topic.id}>
                        <div className="flex items-center gap-3">
                          <span className={topic.studied && topic.reviewed ? "text-muted-foreground line-through" : "font-medium"}>
                            {topic.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors border ${topic.studied ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-transparent hover:bg-muted'}`}
                            onClick={() => handleToggle(subject.id, topic.id, 'studied')}
                          >
                            <Checkbox checked={topic.studied} onCheckedChange={() => handleToggle(subject.id, topic.id, 'studied')} className="mb-1" />
                            <span className="text-[10px] font-bold">Estudado</span>
                          </div>
                          <div 
                            className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors border ${topic.reviewed ? 'bg-accent/10 border-accent text-accent-foreground' : 'bg-muted/50 border-transparent hover:bg-muted'}`}
                            onClick={() => handleToggle(subject.id, topic.id, 'reviewed')}
                          >
                            <Checkbox checked={topic.reviewed} onCheckedChange={() => handleToggle(subject.id, topic.id, 'reviewed')} className="mb-1" />
                            <span className="text-[10px] font-bold">Revisado</span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
