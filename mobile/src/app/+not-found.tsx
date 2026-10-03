import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { Button, EmptyState } from '@/components/ui';
import { useLanguage } from '@/lib/language';
import { space } from '@/lib/theme';

/** A deep link to a page that does not exist — send the person back to the bazaar. */
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, padding: space.lg }}>
      <Stack.Screen options={{ title: '' }} />
      <EmptyState
        emoji="🧭"
        title={t.detail.notFound}
        action={<Button title={t.tabs.market} icon="storefront-outline" onPress={() => router.replace('/')} />}
      />
    </View>
  );
}
