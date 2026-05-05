import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { firestore } from '../../lib/firebase';
import { CourseService } from '@web/lib/services/course-service';
import { CourseCard } from '../../components/ui/CourseCard';
import { Course, ScientificDashboard } from '@web/lib/types';
import { useAuthContext } from '../../lib/auth-provider';
import { getScientificDashboardData } from '@web/lib/store/performance';

export default function CoursesScreen() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<ScientificDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [all, statsData] = await Promise.all([
        CourseService.getAll(firestore),
        getScientificDashboardData(firestore, user.id)
      ]);
      setCourses(isAdmin ? all : all.filter(c => c.status === 'published'));
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [isAdmin, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [isAdmin, user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando mapas táticos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <CourseCard course={item} />}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Explorar Mapa 🗺️</Text>
                <Text style={styles.headerCount}>{courses.length} rotas disponíveis</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity style={styles.addButton}>
                  <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Widget Mapa do Edital (Progresso) */}
            {stats && stats.coursesProgress.length > 0 && (
              <View style={styles.progressWidget}>
                <View style={styles.widgetHeader}>
                  <Feather name="trending-up" size={18} color="#3b82f6" />
                  <Text style={styles.widgetTitle}>MAPA DO EDITAL</Text>
                </View>
                <View style={styles.progressList}>
                  {stats.coursesProgress.slice(0, 3).map((c, i) => (
                    <View key={i} style={styles.progressItem}>
                      <View style={styles.progressTextRow}>
                        <Text style={styles.progressName} numberOfLines={1}>{c.title}</Text>
                        <Text style={styles.progressValue}>{c.percentage}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${c.percentage}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Nenhuma rota publicada ainda.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc' },
  loadingText: { color: '#64748b', fontSize: 14 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 16,
    marginTop: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  headerCount: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  
  progressWidget: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 1,
  },
  progressList: {
    gap: 16,
  },
  progressItem: {
    gap: 6,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },

  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
});
