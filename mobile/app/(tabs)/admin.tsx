import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function AdminHub() {
  const router = useRouter();

  const adminModules = [
    {
      id: 'courses',
      title: 'GERENCIAR CURSOS',
      desc: 'Adicionar, editar ou remover matérias e aulas.',
      icon: 'book-open',
      color: '#3b82f6',
      route: '/(tabs)/courses' // Por enquanto redireciona para a lista, mas no futuro pode ser uma tela de edição
    },
    {
      id: 'questions',
      title: 'BANCO DE QUESTÕES',
      desc: 'Cadastro massivo e edição de gabaritos.',
      icon: 'help-circle',
      color: '#10b981',
      route: '/(tabs)/questions'
    },
    {
      id: 'users',
      title: 'CONTROLE DE ACESSO',
      desc: 'Gerenciar alunos, permissões e streaks.',
      icon: 'users',
      color: '#6366f1',
    },
    {
      id: 'settings',
      title: 'CONFIGURAÇÕES DO APP',
      desc: 'Manutenção tática e alertas globais.',
      icon: 'settings',
      color: '#f59e0b',
    },
    {
      id: 'stats',
      title: 'MÉTRICAS GERAIS',
      desc: 'Visualizar performance de toda a base.',
      icon: 'bar-chart-2',
      color: '#ec4899',
    },
    {
      id: 'import',
      title: 'IMPORTAÇÃO PDF/AI',
      desc: 'Gerar questões automaticamente via IA.',
      icon: 'cpu',
      color: '#8b5cf6',
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header ADM */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PROTOCOLO DE COMANDO</Text>
          </View>
          <Text style={styles.title}>PAINEL <Text style={{color: '#3b82f6'}}>ADMINISTRATIVO</Text></Text>
          <Text style={styles.subtitle}>Gerencie o ecossistema AprovaConcursos Mobile.</Text>
        </View>

        {/* Grid de Módulos */}
        <View style={styles.grid}>
          {adminModules.map((module) => (
            <TouchableOpacity 
              key={module.id} 
              style={styles.card}
              onPress={() => {
                if (module.route) {
                  router.push(module.route as any);
                } else {
                  Alert.alert('Módulo em Desenvolvimento', 'Este módulo administrativo está sendo portado da versão web.');
                }
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: module.color + '20' }]}>
                <Feather name={module.icon as any} size={24} color={module.color} />
              </View>
              <Text style={styles.cardTitle}>{module.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{module.desc}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={[styles.statusText, { color: module.color }]}>ATIVO</Text>
                <Feather name="arrow-right" size={14} color={module.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Protocolos de Sistema */}
        <Text style={styles.sectionTitle}>SISTEMA E PROTOCOLOS</Text>
        
        <TouchableOpacity 
          style={styles.adminCard}
          onPress={() => router.push('/setup')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
            <Feather name="shield" size={24} color="#d97706" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Prontidão Operacional</Text>
            <Text style={styles.cardDesc}>Configuração assistida e diagnóstico de chaves.</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminCard}>
          <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
            <Feather name="settings" size={24} color="#475569" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Variáveis de Ambiente</Text>
            <Text style={styles.cardDesc}>Ajustar chaves de API e conexões externas.</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Alerta de Sistema */}
        <View style={styles.systemAlert}>
          <Feather name="alert-circle" size={20} color="#94a3b8" />
          <Text style={styles.systemAlertText}>
            ALTERAÇÕES REALIZADAS AQUI IMPACTAM TODA A BASE DE DADOS EM TEMPO REAL.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    backgroundColor: '#0f172a',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0f172a',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    width: '47%',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    lineHeight: 14,
    marginBottom: 12,
    height: 28,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  systemAlert: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    alignItems: 'center',
  },
  systemAlertText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    lineHeight: 14,
  }
});
