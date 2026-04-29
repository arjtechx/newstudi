
# Guia de Estrutura de Curso em JSON para o AprovaConcursos

Este documento detalha o formato JSON exato para criar e importar cursos na plataforma AprovaConcursos. Use esta estrutura como um template para gerar conteúdo com qualquer ferramenta ou IA, garantindo uma importação sem erros.

## Visão Geral da Estrutura

Um curso é um array de objetos, onde cada objeto representa um curso completo. A estrutura principal é hierárquica:

`Curso` > `Módulos` > `Lições` > `Blocos de Conteúdo`

```json
[
  {
    "id": "course-unique-id-123",
    "title": "Nome do Curso",
    "description": "Descrição do curso.",
    "category": "Categoria do Curso",
    "status": "published", 
    "thumbnail": "https://url.da/imagem.jpg",
    "modules": [
      {
        "id": "module-unique-id-456",
        "title": "Nome do Módulo",
        "lessons": [
          {
            "id": "lesson-unique-id-789",
            "title": "Nome da Lição",
            "type": "reading",
            "estimatedTime": 15,
            "blocks": [
              // ... Blocos de Conteúdo aqui ...
            ]
          }
        ]
      }
    ]
  }
]
```
**Importante**: Para importar, você pode fornecer um array com um ou mais objetos de curso.

---

## Detalhamento dos Objetos

### 1. Objeto `Course` (Curso)

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Sim | Identificador único para o curso (ex: `curso-direito-const-01`). |
| `title` | `string` | Sim | O título principal do curso. |
| `description` | `string` | Sim | Uma breve descrição sobre o que o curso aborda. |
| `category` | `string` | Sim | A categoria do curso (ex: "Carreiras Policiais", "Direito Administrativo"). |
| `status` | `string` | Não | `"published"` para visível ao aluno ou `"draft"` para rascunho (padrão). |
| `thumbnail` | `string` | Sim | URL de uma imagem de capa para o curso (ex: 600x400 pixels). |
| `modules` | `Array<Module>` | Sim | Uma lista contendo todos os módulos do curso. |
| `createdAt` | `number` | Não | Timestamp da criação (gerado automaticamente se não for fornecido). |

### 2. Objeto `Module` (Módulo)

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Sim | Identificador único para o módulo (ex: `mod-artigo-5`). |
| `title` | `string` | Sim | O título do módulo. |
| `lessons` | `Array<Lesson>` | Sim | Uma lista contendo todas as lições do módulo. |

### 3. Objeto `Lesson` (Lição)

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Sim | Identificador único para a lição (ex: `lesson-inciso-IV`). |
| `title` | `string` | Sim | O título da lição. |
| `blocks` | `Array<ContentBlock>` | Sim | A lista de blocos de conteúdo que formam a lição. |
| `type` | `string` | Sim | Tipo da lição. Use `"reading"` para padrão. |
| `estimatedTime` | `number` | Sim | Tempo estimado em minutos para concluir a lição. |

### 4. Objeto `ContentBlock` (Bloco de Conteúdo)

Este é o elemento fundamental. Cada bloco tem um `type` que define como seu `value` e `metadata` serão interpretados.

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Sim | Identificador único para o bloco (ex: `block-xyz-123`). |
| `type` | `string` | Sim | O tipo do bloco. Veja a referência de tipos abaixo. |
| `value` | `string` | Sim | O conteúdo principal do bloco. |
| `metadata`| `object`| Não | Dados adicionais, dependendo do `type` do bloco. |

---

## Referência Completa dos Tipos de Bloco (`BlockType`)

Aqui estão todos os tipos de blocos disponíveis no "Canvas Wix-Flow".

### Blocos de Texto

#### `h1` - Título de Seção
- **`value`**: O texto do título.
- **`metadata`**: Opcional, para estilização.
  - `fontSize`: `string` - "xs", "sm", "base", "lg", "xl", "2xl" (padrão), "3xl", "4xl"
  - `fontWeight`: `string` - "normal", "medium", "semibold", "bold", "black" (padrão)
  - `fontFamily`: `string` - "sans" (padrão), "serif", "mono", "display"
  - `textColor`: `string` - "default", "primary" (padrão), "accent", "success", "warning", "danger", "muted"

_Exemplo:_
```json
{
  "id": "block-title-1",
  "type": "h1",
  "value": "Princípios Fundamentais",
  "metadata": {
    "fontSize": "3xl",
    "fontWeight": "black",
    "textColor": "primary"
  }
}
```

#### `p` - Parágrafo
- **`value`**: O corpo do texto. Pode conter quebras de linha (`\n`).
- **`metadata`**: Idêntico ao `h1`, com valores padrão diferentes (`fontSize: "base"`, `fontWeight: "normal"`, `textColor: "default"`).

_Exemplo:_
```json
{
  "id": "block-p-1",
  "type": "p",
  "value": "O Art. 5º da Constituição Federal é a pedra angular dos direitos e garantias individuais no Brasil.\nEle estabelece a igualdade de todos perante a lei."
}
```

### Blocos de Mídia

#### `image` / `video` / `audio` / `slides`
- **`value`**: A URL completa para o recurso.
  - **`image`**: URL de uma imagem (JPG, PNG, GIF).
  - **`video`**: URL de um vídeo do YouTube ou Google Drive.
  - **`audio`**: URL de um arquivo de áudio (MP3). Use o link de download direto do Google Drive.
  - **`slides`**: URL de uma apresentação do Google Slides.

_Exemplo:_
```json
{
  "id": "block-video-1",
  "type": "video",
  "value": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Blocos de Destaque (Callouts)

#### `law` - Artigo de Lei
- **`value`**: O texto do artigo de lei ou citação.

#### `tip` - Dica
- **`value`**: O texto da dica.

#### `warning` - Alerta de Pegadinha
- **`value`**: O texto do alerta.

#### `example` - Exemplo Prático
- **`value`**: A descrição do cenário prático.

_Exemplo:_
```json
{
  "id": "block-tip-1",
  "type": "tip",
  "value": "A banca examinadora frequentemente troca 'requisição administrativa' por 'desapropriação' em cenários de perigo iminente. Fique atento!"
}
```

### Blocos Especiais

#### `math` - Fórmula Matemática / Raciocínio Lógico
- **`value`**: A expressão lógica ou matemática. (ex: `P ∧ Q → ¬R`)

#### `table` - Tabela de Dados
- **`value`**: Pode ser uma string vazia `""`.
- **`metadata`**: **Obrigatório**.
  - `headers`: `Array<string>` - Uma lista com os nomes das colunas.
  - `rows`: `Array<object>` - Uma lista de objetos de linha. Cada objeto deve ter uma propriedade "cells" que é uma lista de strings (as células).

_Exemplo (`Tabela Verdade do 'E'`):_
```json
{
  "id": "block-table-1",
  "type": "table",
  "value": "",
  "metadata": {
    "headers": ["P", "Q", "P ∧ Q"],
    "rows": [
      { "cells": ["V", "V", "V"] },
      { "cells": ["V", "F", "F"] },
      { "cells": ["F", "V", "F"] },
      { "cells": ["F", "F", "F"] }
    ]
  }
}
```

#### `quiz` - Questão de Fixação
- **`value`**: O enunciado da questão.
- **`metadata`**: **Obrigatório**.
  - `alternatives`: `Array<string>` - Uma lista com o texto das alternativas.
  - `correct`: `number` - O índice (começando do zero) da alternativa correta.
  - `explanation`: `string` - A justificativa detalhada para a resposta correta.

_Exemplo:_
```json
{
  "id": "block-quiz-1",
  "type": "quiz",
  "value": "De acordo com o Art. 5º da CF/88, a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, SALVO em caso de:",
  "metadata": {
    "alternatives": [
      "Flagrante delito ou desastre, ou para prestar socorro, ou, a qualquer hora, por determinação judicial.",
      "Flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.",
      "Apenas para prestar socorro ou em caso de desastre natural.",
      "Apenas por determinação judicial, seja dia ou noite."
    ],
    "correct": 1,
    "explanation": "A inviolabilidade do domicílio é relativa. A exceção correta permite a entrada sem consentimento em caso de flagrante delito, desastre, para prestar socorro (a qualquer hora), ou, e somente durante o dia, por determinação judicial."
  }
}
```

---

## Estrutura de Questões em JSON

Para importar questões, utilize o seguinte formato:

```json
[
  {
    "id": "q-001",
    "materia": "Direito Constitucional",
    "assunto": "Artigo 5º",
    "enunciado": "A casa é asilo inviolável do indivíduo...",
    "alternativas": ["A", "B", "C", "D"],
    "correta": 1,
    "explicacao": "Conforme o texto da CF...",
    "nivelDificuldade": "Médio",
    "tags": ["cf88", "direitos-individuais", "casa-asilo"]
  }
]
```
_Nota: Se as tags não forem fornecidas, o sistema usará a matéria e o assunto como tags automáticas._
