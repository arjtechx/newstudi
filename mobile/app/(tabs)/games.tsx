import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type GameMode = {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconType: 'feather' | 'material';
  color: string[];
  xp: number;
};

const MODES: GameMode[] = [
  {
    id: 'flashcards',
    title: 'Flashcards de Elite',
    description: 'Memorização rápida por repetição espaçada.',
    icon: 'layers',
    iconType: 'feather',
    color: ['#3b82f6', '#2563eb'],
    xp: 50,
  },
  {
    id: 'drag_drop',
    title: 'Missão Arraste',
    description: 'Associe os conceitos corretamente para vencer.',
    icon: 'gesture-tap-hold',
    iconType: 'material',
    color: ['#8b5cf6', '#7c3aed'],
    xp: 80,
  },
  {
    id: 'quiz',
    title: 'Duelo de Questões',
    description: 'Responda contra o relógio e ganhe bônus.',
    icon: 'timer-outline',
    iconType: 'material',
    color: ['#f59e0b', '#d97706'],
    xp: 100,
  },
  {
    id: 'rank',
    title: 'Ranking Global',
    description: 'Veja sua posição entre os melhores operadores.',
    icon: 'trending-up',
    iconType: 'feather',
    color: ['#10b981', '#059669'],
    xp: 0,
  },
];

export default function GamesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Geral');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Gamificado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Centro de</Text>
            <Text style={styles.userName}>TREINAMENTO 🎮</Text>
          </View>
          <View style={styles.xpBadge}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fbbf24" />
            <Text style={styles.xpText}>1.250 XP</Text>
          </View>
        </View>

        {/* Categorias de Treino */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {['Geral', 'Direito', 'Português', 'Raciocínio'].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Modos de Jogo */}
        <View style={styles.modesGrid}>
          {MODES.map((mode) => (
            <TouchableOpacity key={mode.id} style={styles.modeCard} activeOpacity={0.9}>
              <LinearGradient
                colors={mode.color}
                style={styles.modeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modeIconBox}>
                  {mode.iconType === 'feather' ? (
                    <Feather name={mode.icon as any} size={28} color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name={mode.icon as any} size={28} color="#fff" />
                  )}
                </View>
                <View style={styles.modeInfo}>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  <Text style={styles.modeDesc}>{mode.description}</Text>
                  {mode.xp > 0 && (
                    <View style={styles.modeXp}>
                      <Text style={styles.modeXpText}>+{mode.xp} XP</Text>
                    </View>
                  )}
                </View>
                <View style={styles.playBtn}>
                  <Feather name="play" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner Desafio do Dia */}
        <TouchableOpacity style={styles.challengeCard}>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeLabel}>DESAFIO DIÁRIO</Text>
            <Text style={styles.challengeTitle}>Maratona 24h: Direito Adm.</Text>
            <View style={styles.challengeStats}>
              <Feather name="users" size={12} color="#94a3b8" />
              <Text style={styles.challengeUsers}>450 operando agora</Text>
            </View>
          </View>
          <View style={styles.challengeAction}>
            <Text style={styles.challengeActionText}>ACEITAR</Text>
          </View>
        </TouchableOpacity>

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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  xpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  categories: {
    marginBottom: 24,
  },
  categoryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  categoryTextActive: {
    color: '#fff',
  },
  modesGrid: {
    gap: 16,
  },
  modeCard: {
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modeGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  modeIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  modeDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeXp: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modeXpText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '900',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeCard: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeLabel: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  challengeTitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeUsers: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  challengeAction: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  challengeActionText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '900',
  }
});
