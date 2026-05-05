import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tasks = [
  "Inicializando módulos do sistema...",
  "Carregando banco de questões...",
  "Estabelecendo conexão segura...",
  "Sincronizando perfil tático...",
  "Preparando ambiente de estudos..."
];

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Loader rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 5) + 2;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const taskIndex = Math.floor((progress / 100) * tasks.length);
    setCurrentTask(Math.min(taskIndex, tasks.length - 1));
  }, [progress]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background Decor */}
      <View style={styles.bgDecor} />
      
      <View style={styles.content}>
        
        {/* Logo Animation */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoInner}>
            <Ionicons name="book" size={80} color="#3b82f6" />
          </View>
        </Animated.View>

        {/* Titles */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            CARREGANDO <Text style={{ color: '#3b82f6' }}>SISTEMA...</Text>
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>APROVACONCURSOS V1.0</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.card}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>PROGRESSO</Text>
            <Text style={styles.progressPercent}>{Math.min(100, Math.round(progress))}%</Text>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.divider} />

          <View style={styles.tasksContainer}>
            {tasks.map((task, index) => {
              const isCompleted = index < currentTask || progress >= 100;
              const isActive = index === currentTask && progress < 100;

              return (
                <View key={index} style={styles.taskItem}>
                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  ) : isActive ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="sync" size={18} color="#3b82f6" />
                    </Animated.View>
                  ) : (
                    <View style={styles.taskDot} />
                  )}
                  <Text style={[
                    styles.taskText,
                    isCompleted && styles.taskTextDone,
                    isActive && styles.taskTextActive
                  ]}>
                    {task}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgDecor: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  content: {
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    gap: 32,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {},
  titleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0f172a',
    letterSpacing: -1,
  },
  versionBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3b82f6',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  tasksContainer: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  taskText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  taskTextDone: {
    color: '#10b981',
    opacity: 0.8,
  },
  taskTextActive: {
    color: '#3b82f6',
  }
});
