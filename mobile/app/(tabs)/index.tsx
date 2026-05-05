import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  Layout, 
  SlideInRight 
} from 'react-native-reanimated';
import { useAuthContext } from '../../lib/auth-provider';
import { firestore } from '../../lib/firebase';
import { getScientificDashboardData } from '@web/lib/store/performance';
import { getSystemSettings } from '@web/lib/store/system';
import { ScientificDashboard, SystemSettings } from '@web/lib/types';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const SPACING = 12;
const PEEK_SIZE = (SCREEN_WIDTH - CARD_WIDTH) / 2;

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<ScientificDashboard | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [statsData, settingsData] = await Promise.all([
        getScientificDashboardData(firestore, user.id),
        getSystemSettings(firestore)
      ]);
      setStats(statsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // Lógica do Carrossel Automático Ciclico
  useEffect(() => {
    if (!loading && settings?.dashboard?.widgets) {
      const activeWidgets = settings.dashboard.widgets.filter(w => w.enabled && w.id !== 'kpis' && w.id !== 'broadcast_alerts');
      
      if (activeWidgets.length > 0) {
        const interval = setInterval(() => {
          let nextIndex = currentIndex + 1;
          if (nextIndex >= activeWidgets.length) {
            nextIndex = 0;
          }
          
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          setCurrentIndex(nextIndex);
        }, 3000); // 1s de transição + 2s de pausa

        return () => clearInterval(interval);
      }
    }
  }, [loading, currentIndex, settings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading || !stats || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const activeWidgets = settings?.dashboard?.widgets
    .filter(w => w.enabled && w.id !== 'kpis' && w.id !== 'broadcast_alerts')
    .sort((a, b) => a.order - b.order) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Animado */}
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
          <View style={styles.brandingRow}>
            <View style={styles.logoBadge}>
              <Feather name="award" size={18} color="#fff" />
            </View>
            <Text style={styles.brandingText}>APROVA<Text style={{fontWeight: '900', color: '#0f172a'}}>CONCURSOS</Text></Text>
          </View>
          
          <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.missionCard}>
            <View style={styles.missionBadge}>
              <Text style={styles.missionBadgeText}>🚀 PRÓXIMA MISSÃO</Text>
            </View>
            <Text style={styles.missionTitle}>{stats.proximaMissao.titulo}</Text>
            <Text style={styles.missionDesc} numberOfLines={1}>{stats.proximaMissao.descricao}</Text>
            
            <TouchableOpacity 
              style={styles.missionButton}
              onPress={() => router.push('/questions')}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.missionButtonText}>EXECUTAR AGORA</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Blocos KPI Animados */}
        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.kpiGrid}>
          <KPIBlock label="ACERTO" value={`${stats.taxaAcerto}%`} color="#10b981" />
          <KPIBlock label="RISCO" value={stats.risco} color={stats.risco === 'ALTO' ? '#ef4444' : '#3b82f6'} />
          <KPIBlock label="STREAK" value={`${user.studyStreak || 0}d`} color="#f59e0b" icon="flame" />
          <KPIBlock label="XP TOTAL" value={user.xp || 0} color="#6366f1" />
        </Animated.View>

        {/* Carrossel de Comando Animado */}
        <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.carouselContainer}>
          <Text style={styles.sectionTitle}>CENTRO DE COMANDO</Text>
          <FlatList
            ref={flatListRef}
            data={activeWidgets}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            snapToInterval={CARD_WIDTH + SPACING}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: PEEK_SIZE,
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING));
              setCurrentIndex(index);
            }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WidgetCard type={item.id} stats={stats} router={router} />
            )}
          />
        </Animated.View>

        {/* Rodapé de Progresso Animado */}
        <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.statusFooter}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.levelLabel}>NÍVEL {user.level || 1}</Text>
              <Text style={styles.questonsLabel}>{stats.totalQuestoes} Questões no Banco</Text>
            </View>
            <Text style={styles.xpNextLabel}>{1000 - ((user.xp || 0) % 1000)} XP PARA SUBIR</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View 
              layout={Layout.springify()}
              style={[styles.progressFill, { width: `${((user.xp || 0) % 1000) / 10}%` }]} 
            />
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KPIBlock({ label, value, color, icon }: { label: string, value: string | number, color: string, icon?: string }) {
  return (
    <View style={styles.kpiBlock}>
      <Text style={styles.kpiLabel}>
        {icon === 'flame' && <Feather name="trending-up" size={10} color="#94a3b8" />} {label}
      </Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function WidgetCard({ type, stats, router }: { type: string, stats: ScientificDashboard, router: any }) {
  let content;
  
  if (type === 'active_courses') {
    content = (
      <View style={styles.widgetInner}>
        <View style={styles.widgetHeader}>
          <Feather name="map" size={20} color="#3b82f6" />
          <Text style={styles.widgetTitle}>MAPA DO EDITAL</Text>
        </View>
        <View style={styles.coursesList}>
          {stats.coursesProgress.slice(0, 2).map((c, i) => (
            <View key={i} style={styles.courseItem}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.coursePercent}>{c.percentage}%</Text>
              </View>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgressFill, { width: `${c.percentage}%` }]} />
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.widgetAction} onPress={() => router.push('/courses')}>
          <Text style={styles.widgetActionText}>CONTINUAR JORNADA</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (type === 'errors') {
    content = (
      <View style={[styles.widgetInner, { borderColor: '#fee2e2', backgroundColor: '#fef2f2' }]}>
        <View style={styles.widgetHeader}>
          <Feather name="alert-triangle" size={20} color="#ef4444" />
          <Text style={[styles.widgetTitle, { color: '#b91c1c' }]}>SUPRESSÃO DE ERROS</Text>
        </View>
        <View style={styles.errorList}>
          {stats.topErros.slice(0, 2).map((e: any, i: number) => (
            <View key={i} style={styles.errorItem}>
              <Text style={styles.errorTopic} numberOfLines={1}>{e.topic}</Text>
              <View style={styles.errorBadge}><Text style={styles.errorBadgeText}>{e.errorCount}</Text></View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.widgetAction, { backgroundColor: '#ef4444' }]} onPress={() => router.push('/questions')}>
          <Text style={styles.widgetActionText}>MODO REVANCHE</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (type === 'simulado') {
    content = (
      <View style={[styles.widgetInner, { borderColor: '#e2e8f0', borderWidth: 3 }]}>
        <View style={styles.widgetHeader}>
          <Feather name="target" size={20} color="#0f172a" />
          <Text style={styles.widgetTitle}>PROJEÇÃO DE SIMULADO</Text>
        </View>
        <View style={styles.simuladoMain}>
          <Text style={styles.simuladoNota}>{stats.simulado.notaAtual.toFixed(1)}<Text style={{fontSize: 14, color: '#94a3b8'}}>/10</Text></Text>
          <Text style={[styles.simuladoStatus, { color: stats.simulado.notaAtual >= 7 ? '#10b981' : '#ef4444' }]}>
            {stats.simulado.notaAtual >= 7 ? 'APROVADO' : 'RISCO'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.widgetAction, { backgroundColor: '#0f172a' }]} onPress={() => router.push('/questions')}>
          <Text style={styles.widgetActionText}>ENFRENTAR BOSS</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    content = (
      <View style={styles.widgetInner}>
        <View style={styles.widgetHeader}>
          <Feather name="layers" size={20} color="#3b82f6" />
          <Text style={styles.widgetTitle}>{type.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="activity" size={40} color="#f1f5f9" />
        </View>
        <TouchableOpacity style={styles.widgetAction} onPress={() => router.push('/questions')}>
          <Text style={styles.widgetActionText}>ACESSAR MÓDULO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.widgetCard, { width: CARD_WIDTH, marginRight: SPACING }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  logoBadge: {
    backgroundColor: '#3b82f6',
    padding: 6,
    borderRadius: 8,
    transform: [{ rotate: '3deg' }],
  },
  brandingText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#3b82f6',
    letterSpacing: -1,
  },
  missionCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  missionBadge: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  missionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  missionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  missionDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 20,
  },
  missionButton: {
    backgroundColor: '#3b82f6',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 2,
  },
  missionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  kpiBlock: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  carouselContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  widgetCard: {
    height: 260,
  },
  widgetInner: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    fontStyle: 'italic',
  },
  coursesList: {
    flex: 1,
    gap: 16,
  },
  courseItem: {
    gap: 6,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  courseTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  coursePercent: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3b82f6',
  },
  miniProgressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  errorList: {
    flex: 1,
    gap: 10,
  },
  errorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorTopic: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
    flex: 1,
  },
  errorBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  errorBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  simuladoMain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simuladoNota: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0f172a',
    fontStyle: 'italic',
    letterSpacing: -2,
  },
  simuladoStatus: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  widgetAction: {
    backgroundColor: '#0f172a',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  widgetActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  statusFooter: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  levelLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  questonsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  xpNextLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  }
});
