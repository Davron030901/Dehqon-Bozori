/** Edit any field of a listing — the owner's, or anyone's for an admin. */
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import ListingForm, { type ListingFormResult } from '@/components/ListingForm';
import LoginPanel from '@/components/LoginPanel';
import { Banner, ErrorState, Loading } from '@/components/ui';
import * as api from '@/lib/api';
import { quantityNumber } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { useSession } from '@/lib/session';
import { space } from '@/lib/theme';
import type { Listing } from '@/lib/types';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { token, session } = useSession();
  const queryClient = useQueryClient();
  const [listing, setListing] = useState<Listing | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id || !token) return;
    // Opening the edit form is not a buyer viewing the listing: no view counted.
    api
      .fetchListing(id, lang, false)
      .then((row) => {
        const mine = row.seller?.id === session?.seller.id || session?.isAdmin;
        setListing(row);
        setState(mine ? 'ready' : 'missing');
      })
      .catch((err) => setState(err instanceof api.ApiError && err.status === 404 ? 'missing' : 'error'));
  }, [id, token, lang, session, attempt]);

  async function submit(values: ListingFormResult, photo: api.LocalPhoto | null) {
    if (!token || !listing) return;
    setError(null);
    try {
      if (photo) {
        const uploaded = await api.uploadPhoto(token, photo);
        values.photoUrl = uploaded.photoUrl;
        values.photoFileId = uploaded.photoFileId;
      }
      await api.updateListing(token, listing.id, values, lang);
      await queryClient.invalidateQueries();
      Alert.alert(t.edit.saved);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  if (!token) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <LoginPanel intro={t.auth.needed} />
      </ScrollView>
    );
  }
  if (state === 'loading') return <Loading label={t.common.loading} />;
  if (state === 'error') {
    return (
      <ErrorState
        message={t.common.offline}
        retryLabel={t.common.retry}
        onRetry={() => {
          setState('loading');
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (state === 'missing' || !listing) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <Banner tone="error" text={t.edit.notYours} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <ListingForm
          mode="edit"
          initialPhotoUrl={listing.photoUrl}
          initial={{
            productName: listing.productName,
            category: listing.category,
            price: String(listing.price),
            unit: listing.unit,
            quantity: String(quantityNumber(listing.quantity) ?? ''),
            region: listing.region,
            district: listing.district,
            harvestDate: listing.harvestDate ?? '',
            description: listing.description ?? '',
            phone: listing.phone ?? '',
            telegramUsername: listing.telegramUsername ?? '',
            whatsappNumber: listing.whatsappNumber ?? '',
          }}
          submitLabel={t.common.save}
          error={error}
          onSubmit={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
