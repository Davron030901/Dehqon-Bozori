/** One listing: photo, price, facts, the seller, and the buttons that matter — call, Telegram, WhatsApp. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ContactButtons from '@/components/ContactButtons';
import FavoriteButton from '@/components/FavoriteButton';
import ListingCard from '@/components/ListingCard';
import ReportSheet from '@/components/ReportSheet';
import { Badge, Card, EmptyState, ErrorState, Loading, SectionTitle } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDate, formatPrice, initial } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { shareListing } from '@/lib/links';
import { useListing, useSimilar } from '@/lib/queries';
import { colors, radius, space } from '@/lib/theme';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const listing = useListing(id);
  const similar = useSimilar(listing.data);
  const [reporting, setReporting] = useState(false);

  if (listing.isPending) return <Loading label={t.common.loading} />;
  if (listing.isError || !listing.data) {
    const missing = listing.error instanceof ApiError && listing.error.status === 404;
    return missing ? (
      <EmptyState emoji="🔍" title={t.detail.notFound} />
    ) : (
      <ErrorState message={t.common.offline} retryLabel={t.common.retry} onRetry={() => void listing.refetch()} />
    );
  }

  const l = listing.data;
  const price = `${formatPrice(l.price)} ${t.common.currency}/${l.unitLabel}`;
  const facts: [string, string][] = [
    [t.detail.price, price],
    ...(l.quantity ? ([[t.detail.quantity, l.quantity]] as [string, string][]) : []),
    ...(l.harvestDate ? ([[t.detail.harvest, formatDate(l.harvestDate, t.months)]] as [string, string][]) : []),
    [t.detail.category, `${l.categoryEmoji} ${l.categoryLabel}`],
    [t.detail.location, [l.districtLabel, l.regionLabel].filter(Boolean).join(', ')],
    [t.detail.posted, `${formatDate(l.createdAt, t.months)} · ${t.detail.views(l.views)}`],
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.detail.share}
                hitSlop={8}
                onPress={() => void shareListing(l.id, t.detail.shareText(l.productName, price))}
              >
                <Ionicons name="share-social-outline" size={22} color={colors.primary700} />
              </Pressable>
              <FavoriteButton listingId={l.id} size={24} plain />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.media}>
          {l.photoUrl ? (
            <Image source={{ uri: l.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Text style={styles.emoji}>{l.categoryEmoji}</Text>
          )}
        </View>

        <Card style={styles.gap}>
          <View style={styles.badges}>
            {l.isSoldOut ? <Badge label={t.feed.sold} tone="sold" /> : null}
            {!l.isSoldOut && l.isNewToday ? <Badge label={t.feed.listedToday} tone="today" /> : null}
          </View>
          <Text style={styles.title}>{l.productName}</Text>
          <Text style={styles.price}>
            {formatPrice(l.price)}
            <Text style={styles.unit}>
              {' '}
              {t.common.currency}/{l.unitLabel}
            </Text>
          </Text>
          {l.description ? <Text style={styles.description}>{l.description}</Text> : null}
          <View style={styles.facts}>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {l.seller ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/dehqon/${l.seller!.id}`)}
            style={({ pressed }) => [styles.seller, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial(l.seller.fullName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerLabel}>{t.detail.seller}</Text>
              <Text style={styles.sellerName} numberOfLines={1}>
                {l.seller.fullName}
              </Text>
              <Text style={styles.sellerLink}>{t.detail.sellerPage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        <Card style={styles.gap}>
          <SectionTitle>{t.detail.contactTitle}</SectionTitle>
          <ContactButtons
            listingId={l.id}
            phone={l.phone}
            telegram={l.telegramUsername}
            whatsapp={l.whatsappNumber}
          />
          <Text style={styles.note}>{t.detail.contactNote}</Text>
          <Pressable accessibilityRole="button" onPress={() => setReporting(true)} style={styles.report}>
            <Ionicons name="flag-outline" size={15} color={colors.muted} />
            <Text style={styles.reportText}>{t.detail.report}</Text>
          </Pressable>
        </Card>

        {similar.data?.length ? (
          <View style={styles.gap}>
            <SectionTitle>{t.detail.similar}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {similar.data.map((item) => (
                <View key={item.id} style={{ width: 170 }}>
                  <ListingCard listing={item} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
      <ReportSheet listingId={l.id} visible={reporting} onClose={() => setReporting(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  gap: { gap: space.md },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  media: {
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 96 },
  badges: { flexDirection: 'row', gap: space.sm },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  price: { fontSize: 28, fontWeight: '800', color: colors.primary700 },
  unit: { fontSize: 15, fontWeight: '600', color: colors.muted },
  description: { fontSize: 16, lineHeight: 23, color: colors.ink },
  facts: { gap: 10, marginTop: space.sm },
  fact: { flexDirection: 'row', gap: space.md },
  factLabel: { width: 110, fontSize: 15, color: colors.muted },
  factValue: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sand200,
    backgroundColor: colors.sand100,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.primary700 },
  sellerLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  sellerName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  sellerLink: { fontSize: 13, fontWeight: '700', color: colors.primary700, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 19, color: colors.muted },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: 4 },
  reportText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
