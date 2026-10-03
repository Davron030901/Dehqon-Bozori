/**
 * E'lon berish. A listing needs an owner, so the seller signs in once with
 * Telegram; the profile then pre-fills the region, phone and Telegram handle.
 */
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import ListingForm, { type ListingFormResult } from '@/components/ListingForm';
import LoginPanel from '@/components/LoginPanel';
import { Button, Card, EmptyState, Subtitle } from '@/components/ui';
import * as api from '@/lib/api';
import { useLanguage } from '@/lib/language';
import { useSession } from '@/lib/session';
import { space } from '@/lib/theme';
import type { Listing } from '@/lib/types';

export default function SellScreen() {
  const { t, lang } = useLanguage();
  const { token, session } = useSession();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function submit(values: ListingFormResult, photo: api.LocalPhoto | null) {
    if (!token) return;
    setError(null);
    try {
      if (photo) {
        const uploaded = await api.uploadPhoto(token, photo);
        values.photoUrl = uploaded.photoUrl;
        values.photoFileId = uploaded.photoFileId;
      }
      const listing = await api.createListing(token, values, lang);
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      await queryClient.invalidateQueries({ queryKey: ['mine'] });
      await queryClient.invalidateQueries({ queryKey: ['facets'] });
      setCreated(listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Subtitle>{t.form.newSubtitle}</Subtitle>
        <LoginPanel intro={t.auth.needed} />
      </ScrollView>
    );
  }

  if (created) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <EmptyState emoji="✅" title={t.form.created} body={t.form.createdBody} />
          <View style={{ gap: space.sm }}>
            <Button title={t.form.viewListing} icon="eye" onPress={() => router.push(`/mahsulot/${created.id}`)} />
            <Button
              title={t.form.addAnother}
              icon="add"
              variant="ghost"
              onPress={() => {
                setCreated(null);
                setFormKey((k) => k + 1);
              }}
            />
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Subtitle>{t.form.newSubtitle}</Subtitle>
        <ListingForm
          key={formKey}
          mode="create"
          initial={{
            region: session?.seller.region || 'samarkand',
            phone: session?.seller.phone ?? '',
            telegramUsername: session?.seller.telegramUsername ?? '',
          }}
          submitLabel={t.form.submit}
          error={error}
          onSubmit={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
});
