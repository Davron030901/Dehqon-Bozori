import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { useFavorites } from '@/lib/favorites';
import { useLanguage } from '@/lib/language';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { ids } = useFavorites();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.sand200 },
        headerStyle: { backgroundColor: colors.sand },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.ink },
        sceneStyle: { backgroundColor: colors.sand },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.market,
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saqlangan"
        options={{
          title: t.tabs.saved,
          headerTitle: t.favorites.title,
          tabBarBadge: ids.length ? ids.length : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.harvest, fontSize: 11 },
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sotish"
        options={{
          title: t.tabs.sell,
          headerTitle: t.form.newTitle,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 6} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kabinet"
        options={{
          title: t.tabs.cabinet,
          headerTitle: t.cabinet.title,
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t.tabs.profile,
          headerTitle: t.profile.title,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
