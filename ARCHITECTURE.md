# Arquitetura do Projeto - Newstudi (AprovaConcursos)

Aqui está a estrutura completa da arquitetura do projeto, organizada no formato de árvore, com explicações sobre o papel de cada pasta e dos principais arquivos:

```text
newstudi/
|---- .agents/                   # Configurações e "skills" (habilidades) dos agentes de Inteligência Artificial
|---- docs/                      # Documentações internas e anotações do projeto
|---- public/                    # Arquivos estáticos servidos publicamente (imagens, SVGs, fontes, favicon)
|---- src/                       # 🗂️ Diretório principal contendo todo o código-fonte da aplicação
|     |---- ai/                  # Integrações e configurações do Google Genkit (Motor de IA)
|     |     |---- flows/         # Fluxos de execução ("agentes") que a IA pode rodar
|     |     |---- genkit.ts      # Inicialização do Genkit
|     |
|     |---- app/                 # Sistema de Rotas do Next.js 15 (App Router)
|     |     |---- (dashboard)/   # Grupo de rotas privadas (compartilham o mesmo Layout com Menu/Sidebar)
|     |     |     |---- admin/       # Painel de administração (onde está o Editor de Cursos)
|     |     |     |---- ai-study/    # Módulo de estudo guiado por IA
|     |     |     |---- checklist/   # Módulo de acompanhamento de tarefas/metas
|     |     |     |---- courses/     # Visualização dos cursos e aulas pelo aluno
|     |     |     |---- dashboard/   # Tela inicial pós-login com KPIs e resumo
|     |     |     |---- flashcards/  # Módulo de repetição espaçada
|     |     |     |---- history/     # Histórico de performance
|     |     |     |---- profile/     # Edição do perfil do usuário logado
|     |     |     |---- questions/   # Banco de questões e simulados
|     |     |
|     |     |---- api/           # Rotas de Backend (Serverless functions do Next.js)
|     |     |---- register/      # Fluxo de cadastro de novos alunos
|     |     |---- setup/         # Onboarding inicial (coleta de preferências do usuário)
|     |     |---- globals.css    # CSS global da aplicação (Tailwind directives)
|     |     |---- layout.tsx     # O "Shell" principal que envolve todo o site
|     |
|     |---- components/          # Componentes visuais do React (Separados da lógica das páginas)
|     |     |---- dashboard/     # Widgets específicos do painel (ex: gráficos, alertas)
|     |     |---- layout/        # Componentes estruturais (Sidebar, Header, Menus)
|     |     |---- ui/            # Componentes genéricos e reaproveitáveis do shadcn/ui (Botões, Modais, Inputs)
|     |     |---- diagram-builder.tsx  # Componente complexo isolado para diagramas visuais
|     |     |---- scratchpad-widget.tsx # Componente de bloco de anotações rápido
|     |
|     |---- firebase/            # Configurações e conexões com o Firebase
|     |     |---- firestore/     # Hooks customizados para facilitar leituras no banco (ex: use-collection)
|     |     |---- config.ts      # Chaves de inicialização do Firebase App
|     |     |---- provider.tsx   # Contexto React para distribuir a instância do Firebase
|     |
|     |---- hooks/               # Custom Hooks do React utilitários
|     |     |---- use-mobile.tsx # Detecta se o usuário está em tela pequena
|     |     |---- use-toast.ts   # Controla as notificações flutuantes na tela
|     |
|     |---- lib/                 # Lógica de negócios, tipos genéricos e persistência
|     |     |---- services/      # Camada de Serviço (Regras de negócio, ex: course-service.ts)
|     |     |---- store/         # Camada de Banco de Dados (Comunicação direta com o Firestore)
|     |     |     |---- courses.ts     # Acesso a dados de cursos
|     |     |     |---- performance.ts # Lógica do Dashboard Científico / Estatísticas
|     |     |     |---- users.ts       # Acesso a dados de perfis e roles
|     |     |     |---- questions.ts   # Acesso a dados do banco de questões
|     |     |     |---- index.ts       # Centraliza e exporta todas as funções de acesso a dados
|     |     |
|     |     |---- ai-service.ts  # Funções auxiliares para se comunicar com a IA
|     |     |---- schemas.ts     # Validações Zod (garantem a integridade dos dados)
|     |     |---- types.ts       # Definições de Interfaces do TypeScript para o projeto
|     |     |---- utils.ts       # Funções puras de formatação (ex: merge de classes CSS)
|
|---- .env.local                 # Variáveis de ambiente secretas (chaves de API)
|---- capacitor.config.ts        # Configurações do wrapper móvel Capacitor (gera os APKs/iOS apps)
|---- components.json            # Configuração do Shadcn UI
|---- firebase-blueprint.json    # Mapa estrutural do banco de dados (backup/esquema)
|---- firestore.rules            # 🛡️ Regras de segurança do Banco de Dados (quem pode ler/escrever o que)
|---- next.config.ts             # Configuração do compilador do Next.js
|---- package.json               # Dependências do projeto (npm) e scripts de execução
|---- tailwind.config.ts         # Design System (cores, fontes, animações)
|---- tsconfig.json              # Regras do compilador TypeScript
```

### O que essa estrutura significa na prática?
Você tem um padrão clássico e altamente escalável. O fluxo de dados da aplicação sempre caminha de forma isolada:
1. A Interface Visual fica no `src/app` e `src/components`.
2. Quando uma ação ocorre, a página chama um Serviço em `src/lib/services`.
3. O Serviço valida tudo e se comunica com o Banco através da camada DAL (Data Access Layer) em `src/lib/store`.
4. Tudo é enviado para o Firebase, sob a vigilância forte do `firestore.rules`.

É uma das arquiteturas mais sólidas para sistemas "Client-Heavy".
