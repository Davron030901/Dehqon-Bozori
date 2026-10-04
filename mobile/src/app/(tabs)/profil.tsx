/** Profile, language and app info. Guests can switch language and sign in here. */
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import LoginPanel from '@/components/LoginPanel';
import SelectSheet from '@/components/SelectSheet';
import { Banner, Button, Card, Chip, Field, Input, SectionTitle } from '@/components/ui';
import * as api from '@/lib/api';
import { REGION_ORDER, regionLabel } from '@/lib/catalog';
import { API_URL, BOT_USERNAME, SITE_URL } from '@/lib/config';
import { isValidPhone } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { openUrl } from '@/lib/links';
import { useSession } from '@/lib/session';
import { colors, space } from '@/lib/theme';
import type { Lang, SessionInfo } from '@/lib/types';

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const { token, session, verifying, refresh } = useSession();

  function chooseLanguage(next: Lang) {
    setLang(next);
    // The bot should speak the language the app speaks.
    if (token) api.updateProfile(token, { language: next }).catch(() => undefined);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.gap}>
          <SectionTitle>{t.profile.language}</SectionTitle>
          <View style={styles.row}>
            <Chip label="🇺🇿 O‘zbekcha" selected={lang === 'uz'} onPress={() => chooseLanguage('uz')} />
            <Chip label="🇷🇺 Русский" selected={lang === 'ru'} onPress={() => chooseLanguage('ru')} />
          </View>
        </Card>

        {verifying ? (
          <Card style={styles.gap}>
            <Text style={styles.muted}>{t.auth.verifying}</Text>
            <Button title={t.common.retry} icon="refresh" variant="ghost" onPress={() => void refresh()} />
          </Card>
        ) : token && session ? (
          // Keyed by the account, so the form starts from the profile as loaded
          // and never has to copy props into state after the fact.
          <ProfileForm key={session.seller.id} session={session} token={token} />
        ) : (
          <>
            <Card style={styles.gap}>
              <SectionTitle>{t.profile.guest}</SectionTitle>
              <Text style={styles.muted}>{t.profile.guestBody}</Text>
            </Card>
            <LoginPanel />
          </>
        )}

        <Card style={styles.gap}>
          <Text style={styles.brand}>🌿 {t.common.appName}</Text>
          <Text style={styles.muted}>{t.profile.about}</Text>
          <Button title={t.profile.openSite} icon="globe-outline" variant="ghost" onPress={() => openUrl(SITE_URL, t.detail.cannotOpen)} />
          {BOT_USERNAME ? (
            <Button
              title={t.profile.openBot}
              icon="paper-plane-outline"
              variant="ghost"
              onPress={() => openUrl(`https://t.me/${BOT_USERNAME}`, t.detail.cannotOpen)}
            />
          ) : null}
          <Text style={styles.small}>{t.profile.version(Constants.expoConfig?.version ?? '1.0.0')}</Text>
          <Text style={styles.small}>
            {t.profile.server}: {API_URL || 'demo'}
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileForm({ session, token }: { session: SessionInfo; token: string }) {
  const { t, lang } = useLanguage();
  const { signOut, refresh } = useSession();
  const [fullName, setFullName] = useState(session.seller.fullName ?? '');
  const [phone, setPhone] = useState(session.seller.phone ?? '');
  const [region, setRegion] = useState(session.seller.region || 'samarkand');
  const [village, setVillage] = useState(session.seller.village ?? '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    if (phone.trim() && !isValidPhone(phone)) {
      setNotice({ tone: 'error', text: t.form.invalidPhone });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.updateProfile(token, { fullName: fullName.trim(), phone: phone.trim(), region, village: village.trim() });
      await refresh();
      setNotice({ tone: 'success', text: t.profile.saved });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : t.common.error });
    }
    setSaving(false);
  }

  function confirmLogout() {
    Alert.alert(t.profile.logoutConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.profile.logout, style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Card style={styles.gap}>
      <SectionTitle>{t.profile.title}</SectionTitle>
      <Field label={t.profile.name}>
        <Input value={fullName} onChangeText={setFullName} />
      </Field>
      <Field label={t.profile.phone}>
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+998 90 123 45 67" />
      </Field>
      <Field label={t.profile.region}>
        <SelectSheet
          title={t.profile.region}
          value={region}
          placeholder={t.profile.region}
          options={REGION_ORDER.map((key) => ({ key, label: regionLabel(key, lang) }))}
          onChange={setRegion}
        />
      </Field>
      <Field label={t.profile.village}>
        <Input value={village} onChangeText={setVillage} />
      </Field>
      {notice ? <Banner tone={notice.tone} text={notice.text} /> : null}
      <Button title={t.common.save} icon="save-outline" loading={saving} onPress={() => void save()} />
      {session.isAdmin ? (
        <Button title={t.profile.admin} icon="shield-checkmark-outline" variant="subtle" onPress={() => router.push('/admin')} />
      ) : null}
      <Button title={t.profile.logout} icon="log-out-outline" variant="danger" onPress={confirmLogout} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  gap: { gap: space.md },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.primary700 },
  muted: { fontSize: 14, lineHeight: 20, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
});
