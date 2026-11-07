import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Bancos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="recurring"
        options={{
          title: 'Control',
          headerTitle: 'Recurrentes, Préstamos y Metas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Presupuesto',
          headerTitle: 'Gráficas y Presupuesto Mensual',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Ajustes',
          headerTitle: 'Ajustes y Categorías',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
