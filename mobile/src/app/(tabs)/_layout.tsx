import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View, type ColorValue } from 'react-native';

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

/** Sottoinsieme delle props che il navigatore passa a `tabBarButton`. */
type TabButtonProps = {
  onPress?: ComponentProps<typeof Pressable>['onPress'];
  onLongPress?: ComponentProps<typeof Pressable>['onLongPress'];
  testID?: string;
  'aria-selected'?: boolean;
};

/** Pulsante centrale "Scatole": tondo 64 px, Kraft, in rilievo sopra la barra (CONTRACT v2.4). */
function BoxesTabButton({ onPress, onLongPress, testID, 'aria-selected': selected, label }: TabButtonProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.centerSlot} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!selected }}
        onPress={onPress}
        onLongPress={onLongPress ?? undefined}
        style={({ pressed }) => [
          styles.centerButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.surface,
            shadowColor: '#000',
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Ionicons name={selected ? 'cube' : 'cube-outline'} size={30} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, overflow: 'visible' },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
        headerTitleAlign: 'left',
      }}>
      <Tabs.Screen
        name="scan"
        options={{
          title: t('nav.scan'),
          tabBarLabel: t('tabs.scan'),
          tabBarButtonTestID: 'tab-scan',
          tabBarIcon: icon('qr-code-outline', 'qr-code'),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.boxes'),
          tabBarLabel: t('tabs.boxes'),
          tabBarAccessibilityLabel: t('tabs.boxes'),
          tabBarButtonTestID: 'tab-boxes',
          tabBarButton: (props) => <BoxesTabButton {...props} label={t('tabs.boxes')} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarLabel: t('tabs.profile'),
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: icon('person-circle-outline', 'person-circle'),
        }}
      />
    </Tabs>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  centerSlot: { flex: 1, alignItems: 'center', overflow: 'visible' },
  centerButton: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    marginTop: -SIZE / 3,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
});
