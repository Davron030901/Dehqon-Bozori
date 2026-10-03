import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useFavorites } from '@/lib/favorites';
import { useLanguage } from '@/lib/language';
import { colors } from '@/lib/theme';

/** ♡ on a card or in a header. Every heart shares one store. */
export default function FavoriteButton({
  listingId,
  size = 20,
  plain = false,
}: {
  listingId: string;
  size?: number;
  /** No white disc — for a header bar rather than a photo. */
  plain?: boolean;
}) {
  const { isSaved, toggle } = useFavorites();
  const { t } = useLanguage();
  const saved = isSaved(listingId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t.detail.saved : t.detail.save}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => toggle(listingId)}
      style={plain ? styles.plain : styles.button}
    >
      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={size} color={saved ? colors.red : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
