
"use client"

import React, { useState, useEffect } from 'react';
import { getCourses, getCourseProgress } from '@/lib/store';
import { Course } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Clock, ChevronRight, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useUser } from '@/firebase';

export default function CoursesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      const data = await getCourses(firestore);
      // Filtra apenas cursos publicados para os alunos
      const published = data.filter(c => c.status === 'published' || !c.status);
      setCourses(published);
      setIsLoading(false);
    }
    fetchCourses();
  }, [firestore]);

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.description.toLowerCase().includes(search.toLowerCase())
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-black tracking-tight text-primary flex items-center gap-3">
            <GraduationCap className="w-8 h-8" /> Trilhas Publicadas
          </h1>
          <p className="text-muted-foreground mt-1">Materiais de elite validados pela nossa coordenação.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 rounded-xl" 
            placeholder="Buscar trilhas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const progress = getCourseProgress(course, user?.completedLessons || []);
          return (
            <Card key={course.id} className="material-card overflow-hidden flex flex-col group border-2 hover:border-primary/30">
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary/90 backdrop-blur-sm border-none font-bold uppercase tracking-widest text-[10px]">
                    {course.category}
                  </Badge>
                </div>
              </div>
              <CardHeader className="flex-1">
                <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground">
                  <span>Progresso</span>
                  <span className="text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase pt-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {course.modules.length} Módulos
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Lições
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild className="w-full h-12 font-bold gap-2 group/btn">
                  <Link href={`/courses/${course.id}`}>
                    {progress === 0 ? 'Iniciar Curso' : progress === 100 ? 'Revisar Conteúdo' : 'Continuar Estudos'} 
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto opacity-20">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum curso disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
