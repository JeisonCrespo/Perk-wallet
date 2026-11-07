import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: isDark ? '#062B20' : '#083E31' },
        headerTintColor: '#F0FDF4',
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: isDark ? '#062B20' : '#072E23',
          borderTopColor: isDark ? '#144637' : '#0E4032',
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#34D399',
        tabBarInactiveTintColor: '#6EE7B788',
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
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
