import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { firestore } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Course, ContentBlock } from '@web/lib/types';

const { width } = Dimensions.get('window');

// Renderizador Nativo de Blocos
const BlockRenderer = ({ block }: { block: ContentBlock }) => {
  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3':
      return <Text style={styles.blockHeading}>{block.value}</Text>;
    case 'p':
    case 'reading':
      return <Text style={styles.blockParagraph}>{block.value}</Text>;
    case 'image':
      return (
        <View style={styles.blockImagePlaceholder}>
          <Feather name="image" size={32} color="#94a3b8" />
          <Text style={styles.blockImageText}>Imagem: {block.value}</Text>
        </View>
      );
    case 'video':
      return (
        <View style={styles.blockVideoPlaceholder}>
          <Feather name="play-circle" size={40} color="#fff" />
          <Text style={styles.blockVideoText}>Vídeo (Integração Nativa Necessária)</Text>
        </View>
      );
    case 'quiz':
      return (
        <View style={styles.blockQuiz}>
          <Text style={styles.quizQuestion}>{block.value}</Text>
          {block.metadata?.alternatives?.map((alt: string, i: number) => (
            <TouchableOpacity key={i} style={styles.quizAlternative}>
              <View style={styles.quizRadio} />
              <Text style={styles.quizAltText}>{alt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    default:
      return <Text style={styles.blockUnsupported}>Bloco "{block.type}" não suportado ainda.</Text>;
  }
};

export default function LessonViewerScreen() {
  const { courseId, modIdx, lessonIdx } = useLocalSearchParams();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      const docRef = doc(firestore, 'courses', courseId as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setCourse({ id: snapshot.id, ...snapshot.data() } as Course);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (!course) {
    return <View style={styles.center}><Text>Carregando Aula...</Text></View>;
  }

  const mIdx = parseInt(modIdx as string, 10);
  const lIdx = parseInt(lessonIdx as string, 10);
  const lesson = course.modules?.[mIdx]?.lessons?.[lIdx];

  if (!lesson) {
    return <View style={styles.center}><Text>Aula não encontrada.</Text></View>;
  }

  return (
    <View style={styles.wrapper}>
      {/* Header Fixo Nativo */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="x" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        
        {lesson.blocks?.map((block) => (
          <View key={block.id} style={styles.blockWrapper}>
            <BlockRenderer block={block} />
          </View>
        ))}

        <TouchableOpacity style={styles.completeBtn} onPress={() => router.back()}>
          <Text style={styles.completeBtnText}>Concluir Aula</Text>
          <Feather name="check" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'center' },
  container: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lessonTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 24 },
  blockWrapper: { marginBottom: 20 },
  
  // Tipos de Blocos
  blockHeading: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginTop: 10 },
  blockParagraph: { fontSize: 17, color: '#334155', lineHeight: 26 },
  blockImagePlaceholder: { width: '100%', height: 200, backgroundColor: '#f8fafc', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  blockImageText: { color: '#94a3b8', marginTop: 8, fontSize: 12 },
  blockVideoPlaceholder: { width: '100%', height: width * 0.56, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  blockVideoText: { color: '#94a3b8', marginTop: 12, fontSize: 12 },
  blockUnsupported: { padding: 12, backgroundColor: '#fef08a', borderRadius: 8, color: '#854d0e', fontSize: 14 },
  
  // Quiz
  blockQuiz: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  quizQuestion: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  quizAlternative: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  quizRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 12 },
  quizAltText: { fontSize: 16, color: '#475569', flex: 1 },

  completeBtn: { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 40 },
  completeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', marginRight: 8 }
});
