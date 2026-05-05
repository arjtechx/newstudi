import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Course } from '@web/lib/types';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export function CourseCard({ course }: { course: Partial<Course> }) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => router.push(`/study/${course.id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{course.title}</Text>
        <Feather name="chevron-right" size={20} color="#94a3b8" />
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {course.description || 'Sem descrição no momento.'}
      </Text>
      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {course.status === 'published' ? 'Publicado' : 'Rascunho'}
          </Text>
        </View>
        <Text style={styles.modulesText}>
          {course.modules?.length || 0} Módulos
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modulesText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  }
});
