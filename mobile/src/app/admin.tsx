/**
 * The founder's admin panel, in the pocket: numbers, buyer reports, and posting
 * for a grower who phoned — while standing in that grower's field.
 * The backend re-checks ADMIN_IDS on every request; hiding this screen is UX,
 * not security.
 */
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ListingForm, { type ListingFormResult } from '@/components/ListingForm';
import { Banner, Button, Card, Chip, EmptyState, Loading, SectionTitle } from '@/components/ui';
import * as api from '@/lib/api';
import { categoryLabel } from '@/lib/catalog';
import { formatDate } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { useDashboard, useReports } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/lib/theme';
import type { Report } from '@/lib/types';

type Tab = 'stats' | 'reports' | 'add';

export default function AdminScreen() {
  const { t, lang } = useLanguage();
  const { token, session } = useSession();
  const [tab, setTab] = useState<Tab>('stats');

  if (!token || !session?.isAdmin) {
    return <EmptyState emoji="🔒" title={t.admin.notAdmin} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label={`📊 ${t.admin.title}`} selected={tab === 'stats'} onPress={() => setTab('stats')} />
          <Chip label={`🚩 ${t.admin.reports}`} selected={tab === 'reports'} onPress={() => setTab('reports')} />
          <Chip label={`➕ ${t.admin.addForSeller}`} selected={tab === 'add'} onPress={() => setTab('add')} />
        </ScrollView>
        {tab === 'stats' ? <Stats /> : null}
        {tab === 'reports' ? <Reports /> : null}
        {tab === 'add' ? <AddForSeller lang={lang} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stats() {
  const { t, lang } = useLanguage();
  const dashboard = useDashboard();
  if (dashboard.isPending) return <Loading />;
  if (!dashboard.data) return <Banner tone="error" text={t.common.offline} />;
  const d = dashboard.data;
  const cards: [number, string][] = [
    [d.totals.listings, t.admin.listings],
    [d.totals.active, t.admin.active],
    [d.totals.sold, t.admin.sold],
    [d.totals.users, t.admin.users],
    [d.totals.contacts, t.admin.contacts],
    [d.totals.contactsWeek, t.admin.contactsWeek],
    [d.totals.listingsWeek, t.admin.listingsWeek],
    [d.totals.openReports, t.admin.openReports],
  ];
  const max = Math.max(1, ...d.byCategory.map((r) => r.count));
  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.grid}>
        {cards.map(([value, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Card style={{ gap: space.sm }}>
        <SectionTitle>{t.detail.category}</SectionTitle>
        {d.byCategory.map((row) => (
          <View key={row.key} style={{ gap: 4 }}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>{categoryLabel(row.key, lang)}</Text>
              <Text style={styles.barCount}>{row.count}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: `${Math.round((row.count / max) * 100)}%` }]} />
            </View>
          </View>
        ))}
      </Card>
      {d.topListings.length ? (
        <Card style={{ gap: space.sm }}>
          <SectionTitle>{t.admin.topListings}</SectionTitle>
          {d.topListings.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/mahsulot/${item.id}`)} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.barCount}>👁 {item.views}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function Reports() {
  const { t } = useLanguage();
  const { token } = useSession();
  const reports = useReports();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);

  async function act(report: Report, action: 'resolve' | 'sold' | 'delete') {
    if (!token) return;
    setBusy(report.id);
    try {
      if (action === 'sold') await api.updateListing(token, String(report.listingId), { status: 'sold' }, 'uz');
      if (action === 'delete') await api.deleteAnyListing(token, String(report.listingId));
      // Deleting a listing deletes its reports with it (ON DELETE CASCADE).
      if (action !== 'delete') await api.resolveReport(token, report.id);
      await queryClient.invalidateQueries();
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : t.common.error);
    }
    setBusy(null);
  }

  if (reports.isPending) return <Loading />;
  if (!reports.data?.length) return <EmptyState emoji="🌿" title={t.admin.reportsEmpty} />;
  return (
    <View style={{ gap: space.md }}>
      {reports.data.map((report) => (
        <Card key={report.id} style={{ gap: space.sm, borderColor: colors.red200 }}>
          <Text style={styles.reason}>
            🚩 {t.report.reasons[report.reason] ?? report.reason} · {formatDate(report.createdAt, t.months)}
          </Text>
          <Pressable onPress={() => router.push(`/mahsulot/${report.listingId}`)}>
            <Text style={styles.reportTitle}>
              #{report.listingId} · {report.listingTitle ?? t.admin.listingGone}
            </Text>
          </Pressable>
          {report.note ? <Text style={styles.note}>{report.note}</Text> : null}
          <View style={styles.actions}>
            <Button small variant="ghost" icon="checkmark" title={t.admin.resolve} loading={busy === report.id} onPress={() => void act(report, 'resolve')} />
            <Button small variant="ghost" icon="checkmark-done" title={t.admin.markSold} onPress={() => void act(report, 'sold')} />
            <Button
              small
              variant="danger"
              icon="trash-outline"
              title={t.common.delete}
              onPress={() =>
                Alert.alert(t.cabinet.confirmDelete(report.listingTitle ?? ''), undefined, [
                  { text: t.common.cancel, style: 'cancel' },
                  { text: t.common.delete, style: 'destructive', onPress: () => void act(report, 'delete') },
                ])
              }
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

function AddForSeller({ lang }: { lang: 'uz' | 'ru' }) {
  const { t } = useLanguage();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function submit(values: ListingFormResult, photo: api.LocalPhoto | null) {
    if (!token || !values.sellerPhone) return;
    setError(null);
    try {
      if (photo) {
        const uploaded = await api.uploadPhoto(token, photo);
        values.photoUrl = uploaded.photoUrl;
        values.photoFileId = uploaded.photoFileId;
      }
      const listing = await api.createAdminListing(
        token,
        { ...values, sellerPhone: values.sellerPhone },
        lang,
      );
      await queryClient.invalidateQueries();
      setFormKey((k) => k + 1);
      Alert.alert(t.form.created, listing.productName, [
        { text: t.form.viewListing, onPress: () => router.push(`/mahsulot/${listing.id}`) },
        { text: t.common.done, style: 'cancel' },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  return <ListingForm key={formKey} mode="admin" submitLabel={t.form.submit} error={error} onSubmit={submit} />;
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sand200,
    padding: space.md,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary700 },
  statLabel: { fontSize: 12, color: colors.muted },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, minHeight: 28, alignItems: 'center' },
  barLabel: { flex: 1, fontSize: 14, color: colors.ink },
  barCount: { fontSize: 13, fontWeight: '700', color: colors.muted },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.sand200, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  reason: { fontSize: 13, fontWeight: '700', color: colors.red },
  reportTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  note: { fontSize: 14, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
