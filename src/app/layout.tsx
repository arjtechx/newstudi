
import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';
import RootLoading from './loading';

export const metadata: Metadata = {
  title: 'AprovaConcursos - Plataforma de Estudos para Concursos',
  description: 'Plataforma profissional e gamificada para preparação de concursos públicos.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AprovaConcursos'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased bg-background overflow-x-hidden">
        <FirebaseClientProvider>
          <Suspense fallback={<RootLoading />}>
            {children}
          </Suspense>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
