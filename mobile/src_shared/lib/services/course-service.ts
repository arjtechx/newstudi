import { Course, ContentBlock, BlockType } from '../types';
import { getCourses, saveCourse, deleteCourse } from '../store/courses';
import { Firestore } from 'firebase/firestore';

// Contador Atômico para IDs Únicos Absolutos
let globalIdCounter = 0;
export const generateSecureId = (prefix: string) => {
  globalIdCounter++;
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${r}-${globalIdCounter}`;
};

/**
 * CourseService
 * 
 * Camada de serviço responsável por:
 * 1. Conectar a UI aos repositórios de dados (store)
 * 2. Aplicar regras de negócio e validações
 * 3. Gerenciar as operações puras de estado do Editor de Cursos
 */
export class CourseService {
  // --- Camada de Integração de Dados ---
  
  static async getAll(firestore: Firestore) {
    return await getCourses(firestore);
  }

  static async save(firestore: Firestore, course: Partial<Course>, adminUser?: any) {
    if (!course.title) {
      throw new Error('Título do curso é obrigatório.');
    }
    
    const courseToSave: Partial<Course> = {
      ...course,
      status: course.status || 'draft',
      createdAt: course.createdAt || Date.now(),
    };

    return await saveCourse(firestore, courseToSave, adminUser);
  }

  static async delete(firestore: Firestore, id: string, adminUser?: any) {
    if (!id) throw new Error('ID do curso inválido.');
    return await deleteCourse(firestore, id, adminUser);
  }

  // --- Camada de Lógica de Edição (Estado Imutável) ---

  static addModule(course: Partial<Course>): Partial<Course> {
    const modules = course.modules ? [...course.modules] : [];
    modules.push({ id: generateSecureId('mod'), title: 'Novo Módulo', lessons: [] });
    return { ...course, modules };
  }

  static addLesson(course: Partial<Course>, modIdx: number): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    if (!newMods[modIdx]) return course;
    
    newMods[modIdx].lessons.push({
      id: generateSecureId('l'),
      title: 'Nova Lição',
      blocks: [],
      type: 'reading',
      estimatedTime: 15
    });
    return { ...course, modules: newMods };
  }

  static addBlock(course: Partial<Course>, modIdx: number, lessonIdx: number, type: BlockType, insertIdx?: number): Partial<Course> {
    const id = generateSecureId('b');
    const newBlock: ContentBlock = {
      id,
      type,
      value: type === 'image' ? 'https://picsum.photos/seed/concursos/800/400' : 
             type === 'video' ? 'https://www.youtube.com/watch?v=VIDEO_ID' : 
             type === 'audio' ? 'https://docs.google.com/uc?export=download&id=ID_DO_ARQUIVO' :
             type === 'slides' ? 'https://docs.google.com/presentation/d/ID/edit' : '',
      metadata: type === 'quiz' ? {
        alternatives: ['A', 'B', 'C', 'D'],
        correct: 0,
        explanation: 'Justificativa...'
      } : (type === 'h1' || type === 'p') ? {
        fontSize: type === 'h1' ? '2xl' : 'base',
        fontWeight: type === 'h1' ? 'black' : 'normal',
        fontFamily: 'sans',
        textColor: type === 'h1' ? 'primary' : 'default'
      } : type === 'table' ? {
        headers: ['Condição', 'Resultado'],
        rows: [{ cells: ['V', 'V'] }]
      } : undefined
    };
    
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    if (newMods[modIdx]?.lessons[lessonIdx]) {
      if (insertIdx !== undefined) {
        newMods[modIdx].lessons[lessonIdx].blocks.splice(insertIdx, 0, newBlock);
      } else {
        newMods[modIdx].lessons[lessonIdx].blocks.push(newBlock);
      }
    }
    return { ...course, modules: newMods };
  }

  static updateBlockValue(course: Partial<Course>, modIdx: number, lessonIdx: number, blockIdx: number, value: string): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    if (newMods[modIdx]?.lessons[lessonIdx]?.blocks[blockIdx]) {
      newMods[modIdx].lessons[lessonIdx].blocks[blockIdx].value = value;
    }
    return { ...course, modules: newMods };
  }

  static updateBlockMeta(course: Partial<Course>, modIdx: number, lessonIdx: number, blockIdx: number, key: string, value: any): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    const block = newMods[modIdx]?.lessons[lessonIdx]?.blocks[blockIdx];
    if (block) {
      if (!block.metadata) block.metadata = {};
      block.metadata[key] = value;
    }
    return { ...course, modules: newMods };
  }

  static moveBlock(course: Partial<Course>, modIdx: number, lessonIdx: number, blockIdx: number, dir: 'up' | 'down'): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    const blocks = newMods[modIdx]?.lessons[lessonIdx]?.blocks;
    if (!blocks) return course;
    const target = dir === 'up' ? blockIdx - 1 : blockIdx + 1;
    if (target < 0 || target >= blocks.length) return course;
    [blocks[blockIdx], blocks[target]] = [blocks[target], blocks[blockIdx]];
    return { ...course, modules: newMods };
  }

  static removeBlock(course: Partial<Course>, modIdx: number, lessonIdx: number, blockIdx: number): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    newMods[modIdx]?.lessons[lessonIdx]?.blocks.splice(blockIdx, 1);
    return { ...course, modules: newMods };
  }

  static removeModule(course: Partial<Course>, modIdx: number): Partial<Course> {
    const newMods = course.modules?.filter((_, i) => i !== modIdx);
    return { ...course, modules: newMods };
  }

  static removeLesson(course: Partial<Course>, modIdx: number, lessonIdx: number): Partial<Course> {
    const newMods = JSON.parse(JSON.stringify(course.modules || []));
    if (newMods[modIdx]?.lessons) {
      newMods[modIdx].lessons.splice(lessonIdx, 1);
    }
    return { ...course, modules: newMods };
  }
}
