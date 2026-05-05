import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { auth, firestore } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { getSystemSettings } from '@web/lib/store/system';
import * as Updates from 'expo-updates';

type SettingItem = {
  icon: string;
  label: string;
  sublabel?: string;
  type: 'toggle' | 'nav' | 'action';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLoading?: boolean;
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [animationsOn, setAnimationsOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Sair da conta",
      "Deseja realmente encerrar sua sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Erro ao sair:', error);
            }
          }
        }
      ]
    );
  };

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert('Aviso', 'Atualizações manuais não funcionam em modo de desenvolvimento.');
      return;
    }

    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Melhorias Disponíveis',
          'Encontramos novas táticas e melhorias para o seu app. Deseja aplicar agora?',
          [
            { text: 'Depois', style: 'cancel' },
            { 
              text: 'Aplicar Agora', 
              onPress: async () => {
                setCheckingUpdate(true);
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        Alert.alert('Sistema Atualizado', 'Você já está utilizando a versão mais recente do Aprova Concursos.');
      }
    } catch (e) {
      Alert.alert('Erro de Conexão', 'Não foi possível verificar as atualizações agora. Tente novamente em breve.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getSystemSettings(firestore);
        if (s) {
          setSettings(s);
          setAnimationsOn(s.animations?.enabled ?? true);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const appVersion = '1.0.0';

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Aparência',
      items: [
        {
          icon: 'moon',
          label: 'Modo Escuro',
          sublabel: 'Tema de interface',
          type: 'toggle',
          value: darkMode,
          onToggle: setDarkMode,
        },
        {
          icon: 'zap',
          label: 'Animações',
          sublabel: animationsOn ? 'Ativadas' : 'Desativadas',
          type: 'toggle',
          value: animationsOn,
          onToggle: (v) => setAnimationsOn(v),
        },
      ],
    },
    {
      title: 'Notificações',
      items: [
        {
          icon: 'bell',
          label: 'Notificações push',
          sublabel: 'Alertas do sistema',
          type: 'toggle',
          value: notifications,
          onToggle: setNotifications,
        },
      ],
    },
    {
      title: 'Suporte Técnico',
      items: [
        {
          icon: 'download-cloud',
          label: 'Verificar Melhorias Táticas',
          sublabel: checkingUpdate ? 'Buscando no servidor...' : 'Buscar atualizações manuais',
          type: 'action',
          onPress: handleCheckUpdate,
          isLoading: checkingUpdate,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          icon: 'shield',
          label: 'Segurança e Privacidade',
          type: 'nav',
          onPress: () => {},
        },
        {
          icon: 'user',
          label: 'Editar Perfil',
          type: 'nav',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Sobre',
      items: [
        {
          icon: 'info',
          label: 'Versão do app',
          sublabel: `v${appVersion}`,
          type: 'nav',
        },
        {
          icon: 'file-text',
          label: 'Termos de Uso',
          type: 'nav',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações ⚙️</Text>
      </View>

      {settings?.maintenanceMode?.enabled && (
        <View style={styles.maintenanceBanner}>
          <Feather name="alert-triangle" size={16} color="#b45309" />
          <Text style={styles.maintenanceText}>
            {settings.maintenanceMode.message || 'Sistema em manutenção'}
          </Text>
        </View>
      )}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.item,
                  idx < section.items.length - 1 && styles.itemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={item.type === 'nav' || item.type === 'action' ? 0.6 : 1}
                disabled={item.type === 'toggle' || item.isLoading}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconBox}>
                    {item.isLoading ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Feather name={item.icon as any} size={18} color="#3b82f6" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {item.sublabel && (
                      <Text style={styles.itemSub}>{item.sublabel}</Text>
                    )}
                  </View>
                </View>

                {item.type === 'toggle' ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                    thumbColor={item.value ? '#3b82f6' : '#94a3b8'}
                  />
                ) : (
                  <Feather name="chevron-right" size={18} color="#cbd5e1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity 
        style={styles.logoutBtn} 
        activeOpacity={0.8}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  header: { paddingTop: 40, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },

  maintenanceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#fcd34d',
  },
  maintenanceText: { color: '#92400e', fontSize: 13, flex: 1 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },

  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  itemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#fecaca',
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
});
