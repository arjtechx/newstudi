
"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Menu, Award } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest animate-pulse">Acessando Base...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar - Visible from MD up */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 z-50 w-64">
        <SidebarNav />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header - Only visible on small screens */}
        <header className="md:hidden h-14 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-lg">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div className="font-headline font-black text-sm text-primary italic uppercase tracking-tighter">AprovaConcursos</div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5">
                <Menu className="w-5 h-5 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-4 border-primary/10">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu Tático</SheetTitle>
              </SheetHeader>
              <SidebarNav />
            </SheetContent>
          </Sheet>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-3 md:p-8 lg:p-10 w-full overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
