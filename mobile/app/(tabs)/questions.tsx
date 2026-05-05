import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { firestore } from '../../lib/firebase';
import { getQuestions } from '@web/lib/store/questions';
import { getScientificDashboardData } from '@web/lib/store/performance';
import { Question, ScientificDashboard } from '@web/lib/types';
import { useAuthContext } from '../../lib/auth-provider';

const DIFFICULTY_COLORS: Record<string, string> = {
  'Fácil': '#10b981',
  'Médio': '#f59e0b',
  'Difícil': '#ef4444',
  'Hardcore': '#7c3aed',
};

export default function QuestionsScreen() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filtered, setFiltered] = useState<Question[]>([]);
  const [stats, setStats] = useState<ScientificDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [questionsData, statsData] = await Promise.all([
        getQuestions(firestore),
        getScientificDashboardData(firestore, user.id)
      ]);
      setQuestions(questionsData);
      setFiltered(questionsData);
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) {
      setFiltered(questions);
    } else {
      setFiltered(
        questions.filter(
          item =>
            item.enunciado?.toLowerCase().includes(q) ||
            item.materia?.toLowerCase().includes(q) ||
            item.assunto?.toLowerCase().includes(q),
        ),
      );
    }
  }, [search, questions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando banco de questões...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Question }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[item.nivelDificuldade] + '22' }]}>
          <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[item.nivelDificuldade] }]}>
            {item.nivelDificuldade}
          </Text>
        </View>
        <Text style={styles.materia}>{item.materia}</Text>
      </View>

      <Text style={styles.enunciado} numberOfLines={3}>
        {item.enunciado}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.assunto}>{item.assunto}</Text>
        {item.banca && <Text style={styles.banca}>{item.banca} {item.ano ? `· ${item.ano}` : ''}</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Questões 📝</Text>
                <Text style={styles.headerCount}>{filtered.length} alvos detectados</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity style={styles.addButton}>
                  <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Widget de Supressão de Erros */}
            {stats && stats.topErros.length > 0 && (
              <View style={styles.errorWidget}>
                <View style={styles.widgetHeader}>
                  <Feather name="alert-triangle" size={18} color="#ef4444" />
                  <Text style={styles.widgetTitle}>PONTOS A MELHORAR</Text>
                </View>
                <View style={styles.errorList}>
                  {stats.topErros.map((e: any, i: number) => (
                    <TouchableOpacity key={i} style={styles.errorItem} onPress={() => setSearch(e.topic)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.errorTopic} numberOfLines={1}>{e.topic}</Text>
                        <Text style={styles.errorSub}>Toque para treinar este alvo</Text>
                      </View>
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorBadgeText}>{e.errorCount} ERROS</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search */}
            <View style={styles.searchBox}>
              <Feather name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrar por matéria ou assunto..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {search ? 'Nenhum alvo encontrado com este critério.' : 'Nenhuma questão disponível no banco.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc' },
  loadingText: { color: '#64748b', fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  headerCount: { fontSize: 14, color: '#64748b', fontWeight: '600' },
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

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

  errorWidget: {
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991b1b',
    letterSpacing: 1,
  },
  errorList: {
    gap: 8,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorTopic: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  errorSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  errorBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  errorBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  diffText: { fontSize: 11, fontWeight: '700' },
  materia: { fontSize: 12, color: '#475569', fontWeight: '600', flex: 1 },
  enunciado: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  assunto: { fontSize: 12, color: '#94a3b8', flex: 1 },
  banca: { fontSize: 12, color: '#94a3b8' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
});
