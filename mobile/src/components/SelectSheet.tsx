/**
 * A tappable field that opens a full list in a bottom sheet — for regions,
 * districts, units and sorting. Native pickers differ wildly between Android
 * versions and cannot show counts; this one looks the same everywhere.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/lib/theme';

import type { IconName } from './ui';

export interface SelectOption {
  key: string;
  label: string;
  count?: number;
  /** Small grey prefix, e.g. 🏙 for cities. */
  hint?: string;
}

export default function SelectSheet({
  title,
  value,
  options,
  onChange,
  placeholder,
  icon,
  compact = false,
  invalid = false,
}: {
  title: string;
  value: string;
  options: SelectOption[];
  onChange: (key: string) => void;
  placeholder: string;
  icon?: IconName;
  compact?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.key === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setOpen(true)}
        style={[styles.field, compact && styles.compact, invalid && { borderColor: colors.red }]}
      >
        {icon ? <Ionicons name={icon} size={16} color={colors.muted} /> : null}
        <Text style={[styles.value, !current && { color: colors.muted }]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.key || '__none'}
            initialNumToRender={20}
            renderItem={({ item }) => {
              const selected = item.key === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item.key);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.sand100 }]}
                >
                  <Text style={[styles.optionText, selected && styles.optionSelected]} numberOfLines={1}>
                    {item.hint ? `${item.hint} ` : ''}
                    {item.label}
                  </Text>
                  {item.count ? <Text style={styles.count}>{item.count}</Text> : null}
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.sand200,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  compact: { minHeight: 42, borderRadius: radius.sm, paddingHorizontal: 10, flex: 1 },
  value: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,42,36,0.35)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.sand300,
    marginBottom: space.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sand200,
  },
  optionText: { flex: 1, fontSize: 16, color: colors.ink },
  optionSelected: { fontWeight: '800', color: colors.primary700 },
  count: { fontSize: 13, color: colors.muted },
});
