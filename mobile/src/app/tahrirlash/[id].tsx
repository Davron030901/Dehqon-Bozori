/** Edit any field of a listing — the owner's, or anyone's for an admin. */
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import ListingForm, { type ListingFormResult } from '@/components/ListingForm';
import LoginPanel from '@/components/LoginPanel';
import { Banner, ErrorState, Loading } from '@/components/ui';
import * as api from '@/lib/api';
import { UNITS } from '@/lib/catalog';
import { editableQuantity } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { useSession } from '@/lib/session';
import { space } from '@/lib/theme';
import type { Listing } from '@/lib/types';

/** "500 kg" / "500 кг" on a kg listing -> "500"; "3 tonna" stays "3 tonna", not "3". */
function startQuantity(listing: Listing): string {
  const labels = UNITS[listing.unit] ? [UNITS[listing.unit].uz, UNITS[listing.unit].ru] : [];
  return editableQuantity(listing.quantity, labels);
}

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { token, session, verifying } = useSession();
  const queryClient = useQueryClient();
  const [listing, setListing] = useState<Listing | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ownership can only be judged once we know who this is.
    if (!id || !token || !session) return;
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
      // An untouched quantity under an unchanged unit is not sent: a bare "500"
      // from the bot must not turn into "500 kg" just because the price was
      // edited. A new unit re-sends it, so "500 kg" becomes "500 litr".
      const patch: Partial<ListingFormResult> = { ...values };
      if (values.unit === listing.unit && (values.quantity ?? '') === startQuantity(listing)) {
        delete patch.quantity;
      }
      await api.updateListing(token, listing.id, patch, lang);
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
  if (verifying) return <Loading label={t.auth.verifying} />;
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
            quantity: startQuantity(listing),
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
