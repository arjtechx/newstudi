import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthContext } from '../../lib/auth-provider';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useAuthContext();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Encerrar Sessão",
      "Deseja realmente sair do sistema?",
      [
        { text: "CANCELAR", style: "cancel" },
        { 
          text: "SAIR", 
          style: "destructive", 
          onPress: async () => {
            console.log('[Logout] Iniciando processo...');
            try {
              await signOut(auth);
              console.log('[Logout] Firebase deslogado com sucesso');
              router.replace('/login');
            } catch (error) {
              console.error('[Logout] Erro crítico:', error);
              Alert.alert("Erro", "Falha ao encerrar sessão.");
            }
          }
        }
      ]
    );
  };

  const xp = user?.xp || 0;
  const level = user?.level || Math.floor(xp / 1000) + 1;
  const nextLevelXp = level * 1000;
  const progressPercent = Math.min((xp / nextLevelXp) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Feather name="settings" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'EU'}
                </Text>
              </View>
            )}
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lvl {level}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Estudante Concurseiro'}</Text>
          <View style={styles.roleContainer}>
            <View style={[styles.roleBadge, { backgroundColor: user?.role === 'admin' ? '#ef4444' : '#3b82f6' }]}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'COMANDO CENTRAL' : 'OPERADOR TÁTICO'}
              </Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{user?.email || 'email@estudante.com'}</Text>
        </View>

        <View style={styles.gamificationSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.sectionTitle}>Progresso de XP</Text>
            <Text style={styles.xpValue}>{xp} / {nextLevelXp}</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressTip}>Faltam {nextLevelXp - xp} XP para o próximo nível!</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#eff6ff' }]}>
              <Feather name="book-open" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statNumber}>{user?.completedLessons?.length || 0}</Text>
            <Text style={styles.statLabel}>Aulas Lidas</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="check-circle" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Quizzes Certos</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          <Text style={styles.sectionTitle}>Preferências Operacionais</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Feather name="cpu" size={20} color="#3b82f6" />
            <Text style={styles.menuText}>Configurações do Sistema</Text>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="bell" size={20} color="#475569" />
            <Text style={styles.menuText}>Notificações</Text>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="shield" size={20} color="#475569" />
            <Text style={styles.menuText}>Segurança e Privacidade</Text>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { marginTop: 24, borderColor: '#fee2e2', backgroundColor: '#fff' }]} 
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Encerrar Sessão</Text>
            <Feather name="chevron-right" size={20} color="#fee2e2" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginTop: 10
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  
  profileCard: { alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: '800' },
  levelBadge: { position: 'absolute', bottom: -5, right: -10, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#f8fafc' },
  levelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  roleContainer: { marginTop: 6, marginBottom: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  userEmail: { fontSize: 14, color: '#64748b' },

  gamificationSection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, marginHorizontal: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  xpValue: { fontSize: 16, fontWeight: '800', color: '#3b82f6' },
  progressBarContainer: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 6 },
  progressTip: { fontSize: 13, color: '#64748b', textAlign: 'center' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statNumber: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },

  menuList: { marginTop: 10, paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  menuText: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600', color: '#334155' }
});
