import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { firestore } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Course } from '@web/lib/types';
import { useAuthContext } from '../../lib/auth-provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthContext();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMod, setExpandedMod] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const docRef = doc(firestore, 'courses', id as string);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.id ? { id: snapshot.id, ...snapshot.data() } : snapshot.data();
          setCourse(data as Course);
          // Expand first module by default
          if ((data as Course).modules?.length > 0) {
            setExpandedMod((data as Course).modules[0].id || 'mod0');
          }
        }
      } catch (error) {
        console.error("Erro ao carregar o curso:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCourse();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Rota não encontrada no banco.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>VOLTAR AO QG</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedLessons = user?.completedLessons || [];
  const totalLessons = course.modules?.reduce((acc, mod) => acc + mod.lessons.length, 0) || 0;
  const courseLessonsIds = course.modules?.flatMap(mod => mod.lessons.map(l => l.id)) || [];
  const courseCompleted = courseLessonsIds.filter(id => completedLessons.includes(id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((courseCompleted / totalLessons) * 100) : 0;

  return (
    <View style={styles.mainContainer}>
      {/* Background Header Decoration */}
      <View style={styles.headerDecoration} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ROTA DE ELITE</Text>
          </View>
          <Text style={styles.title}>{course.title}</Text>
          
          {/* Progress Gauge */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>PROGRESSO TÁTICO</Text>
              <Text style={styles.progressValue}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarLarge}>
              <View style={[styles.progressFillLarge, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressStats}>
              {courseCompleted} de {totalLessons} missões concluídas
            </Text>
          </View>
        </View>

        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>ETAPAS DO TREINAMENTO</Text>

          {course.modules?.map((mod, modIdx) => {
            const modId = mod.id || `mod${modIdx}`;
            const isExpanded = expandedMod === modId;
            const modLessonsIds = mod.lessons.map(l => l.id);
            const modCompleted = modLessonsIds.filter(id => completedLessons.includes(id)).length;
            const modProgress = mod.lessons.length > 0 ? (modCompleted / mod.lessons.length) : 0;

            return (
              <View key={modId} style={[styles.moduleCard, isExpanded && styles.moduleCardExpanded]}>
                <TouchableOpacity 
                  style={styles.moduleHeader} 
                  onPress={() => setExpandedMod(isExpanded ? null : modId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleHeaderLeft}>
                    <View style={[styles.modNumberCircle, { borderColor: modProgress === 1 ? '#10b981' : '#e2e8f0' }]}>
                      {modProgress === 1 ? (
                        <Ionicons name="checkmark-done" size={16} color="#10b981" />
                      ) : (
                        <Text style={styles.modNumberText}>{modIdx + 1}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{mod.title}</Text>
                      <Text style={styles.moduleSubtitle}>{mod.lessons.length} aulas · {modCompleted} concluídas</Text>
                    </View>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.lessonsList}>
                    {mod.lessons.map((lesson, lessonIdx) => {
                      const isLessonDone = completedLessons.includes(lesson.id);
                      return (
                        <TouchableOpacity 
                          key={lesson.id || lessonIdx} 
                          style={styles.lessonItem}
                          onPress={() => router.push({ 
                            pathname: '/study/lesson/[lessonId]', 
                            params: { courseId: course.id, lessonId: lesson.id, modIdx, lessonIdx } 
                          })}
                        >
                          <View style={[styles.lessonIndicator, isLessonDone && styles.lessonIndicatorDone]}>
                            {isLessonDone ? (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                              <View style={styles.dot} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.lessonTitle, isLessonDone && styles.lessonTitleDone]}>
                              {lesson.title}
                            </Text>
                            <Text style={styles.lessonType}>{lesson.type === 'video' ? 'VIDEOAULA' : 'LEITURA TÁTICA'}</Text>
                          </View>
                          <Feather name="play" size={14} color={isLessonDone ? "#10b981" : "#3b82f6"} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  backIcon: { marginTop: 60, marginLeft: 20, width: 40, height: 40, justifyContent: 'center' },
  headerInfo: { paddingHorizontal: 24, marginTop: 10 },
  badge: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 24 },
  
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  progressValue: { fontSize: 20, fontWeight: '900', color: '#0f172a', fontStyle: 'italic' },
  progressBarLarge: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  progressFillLarge: { height: '100%', backgroundColor: '#3b82f6' },
  progressStats: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 16, marginTop: 32, paddingHorizontal: 24 },
  modulesContainer: { marginTop: 10, paddingHorizontal: 20 },
  moduleCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  moduleCardExpanded: { borderColor: '#3b82f6', borderWidth: 2 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  moduleHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  modNumberCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  modNumberText: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  moduleTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  moduleSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  
  lessonsList: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 8 },
  lessonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  lessonIndicator: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  lessonIndicatorDone: { backgroundColor: '#10b981' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  lessonTitle: { fontSize: 14, color: '#334155', fontWeight: '700' },
  lessonTitleDone: { color: '#94a3b8', textDecorationLine: 'none' },
  lessonType: { fontSize: 10, color: '#94a3b8', fontWeight: '800', marginTop: 2 },

  empty: { fontSize: 16, color: '#94a3b8', marginBottom: 20, textAlign: 'center' },
  backBtn: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
});
