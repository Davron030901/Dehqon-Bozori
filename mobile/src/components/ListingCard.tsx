import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { colors, radius, shadow, space } from '@/lib/theme';
import type { Listing } from '@/lib/types';

import FavoriteButton from './FavoriteButton';
import { Badge } from './ui';

/**
 * Two-column grids: a lone last card would stretch to full width, so odd lists
 * get an invisible spacer. Render cells with `GridCell`.
 */
export type GridItem = Listing | { id: '__spacer' };

export function padToEven(items: Listing[]): GridItem[] {
  return items.length % 2 ? [...items, { id: '__spacer' }] : items;
}

export function GridCell({ item }: { item: GridItem }) {
  if (!('productName' in item)) return <View style={{ flex: 1 }} />;
  return <ListingCard listing={item} />;
}

/** One listing in a two-column grid: photo (or the category emoji), price, place. */
export default function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const place = listing.districtLabel || listing.regionLabel;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${listing.productName}, ${formatPrice(listing.price)} ${t.common.currency}`}
        onPress={() => router.push(`/mahsulot/${listing.id}`)}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.media}>
          {listing.photoUrl ? (
            <Image
              source={{ uri: listing.photoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={listing.id}
            />
          ) : (
            <Text style={styles.emoji}>{listing.categoryEmoji}</Text>
          )}
          <View style={styles.badges}>
            {listing.isSoldOut ? (
              <Badge label={t.feed.sold} tone="sold" />
            ) : listing.isNewToday ? (
              <Badge label={t.feed.listedToday} tone="today" />
            ) : null}
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {listing.productName}
          </Text>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(listing.price)}
            <Text style={styles.unit}>
              {' '}
              {t.common.currency}/{listing.unitLabel}
            </Text>
          </Text>
          <Text style={styles.place} numberOfLines={1}>
            📍 {place}
          </Text>
        </View>
      </Pressable>
      <View style={styles.heart}>
        <FavoriteButton listingId={listing.id} size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sand200,
    overflow: 'hidden',
    ...shadow,
  },
  media: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 46 },
  badges: { position: 'absolute', left: 8, top: 8 },
  heart: { position: 'absolute', right: 6, top: 6 },
  body: { padding: space.md, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, minHeight: 38 },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary700 },
  unit: { fontSize: 12, fontWeight: '600', color: colors.muted },
  place: { fontSize: 12, color: colors.muted },
});
