import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FavoritesProvider } from '@/lib/favorites';
import { LanguageProvider, useLanguage } from '@/lib/language';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

// React Query's "window focus" on a phone is the app coming to the foreground:
// a trader who switches back from a phone call sees fresh listings.
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <SessionProvider>
            <FavoritesProvider>
              <SplashGate>
                <StatusBar style="dark" />
                <Navigator />
              </SplashGate>
            </FavoritesProvider>
          </SessionProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** Keep the splash up until the language and the stored session are known. */
function SplashGate({ children }: { children: ReactNode }) {
  const { ready } = useLanguage();
  const { loading } = useSession();
  const done = ready && !loading;
  useEffect(() => {
    if (done) void SplashScreen.hideAsync();
  }, [done]);
  return done ? <>{children}</> : null;
}

function Navigator() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary700,
        headerTitleStyle: { fontWeight: '800' },
        headerStyle: { backgroundColor: colors.sand },
        headerShadowVisible: false,
        headerBackTitle: t.common.back,
        contentStyle: { backgroundColor: colors.sand },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="mahsulot/[id]" options={{ title: '' }} />
      <Stack.Screen name="dehqon/[id]" options={{ title: t.seller.title }} />
      <Stack.Screen name="tahrirlash/[id]" options={{ title: t.edit.title }} />
      <Stack.Screen name="admin" options={{ title: t.admin.title }} />
    </Stack>
  );
}
