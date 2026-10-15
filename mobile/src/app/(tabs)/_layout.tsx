import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { fonts, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type IconProps = { color: ColorValue; focused: boolean; size: number };

function TabIcon({ name, focusedName, color, focused, size }: IconProps & { name: IconName; focusedName: IconName }) {
  return <Ionicons name={focused ? focusedName : name} color={color} size={size} />;
}

function icon(name: IconName, focusedName: IconName) {
  return function renderTabIcon(p: IconProps) {
    return <TabIcon {...p} name={name} focusedName={focusedName} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
        headerTitleAlign: 'left',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Le mie scatole',
          tabBarLabel: 'Scatole',
          tabBarButtonTestID: 'tab-boxes',
          tabBarIcon: icon('cube-outline', 'cube'),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scansiona QR',
          tabBarLabel: 'Scansiona',
          tabBarButtonTestID: 'tab-scan',
          tabBarIcon: icon('qr-code-outline', 'qr-code'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Cerca',
          tabBarLabel: 'Cerca',
          tabBarButtonTestID: 'tab-search',
          tabBarIcon: icon('search-outline', 'search'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarLabel: 'Profilo',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: icon('person-circle-outline', 'person-circle'),
        }}
      />
    </Tabs>
  );
}
