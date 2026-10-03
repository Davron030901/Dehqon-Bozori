/**
 * The app's small set of building blocks. Large tap targets (48 px+) and
 * high-contrast text throughout: many sellers are older, outdoors, on a cheap
 * phone in bright sun.
 */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadow, space } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// --------------------------------------------------------------------------- //
//  Button
// --------------------------------------------------------------------------- //
type Variant = 'primary' | 'ghost' | 'danger' | 'telegram' | 'whatsapp' | 'subtle';

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  ghost: { bg: colors.white, fg: colors.ink, border: colors.sand200 },
  danger: { bg: colors.white, fg: colors.red, border: colors.red200 },
  telegram: { bg: colors.telegram, fg: colors.white, border: colors.telegram },
  whatsapp: { bg: colors.whatsapp, fg: colors.white, border: colors.whatsapp },
  subtle: { bg: colors.primary50, fg: colors.primary700, border: colors.primary200 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  small = false,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// --------------------------------------------------------------------------- //
//  Chip
// --------------------------------------------------------------------------- //
export function Chip({
  label,
  selected,
  onPress,
  count,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {count ? (
        <Text style={[styles.chipCount, selected && styles.chipTextSelected]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

// --------------------------------------------------------------------------- //
//  Card, titles, badges
// --------------------------------------------------------------------------- //
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Badge({ label, tone }: { label: string; tone: 'today' | 'sold' | 'primary' }) {
  const bg = tone === 'today' ? colors.harvest : tone === 'sold' ? colors.muted : colors.primary100;
  const fg = tone === 'primary' ? colors.primary700 : colors.white;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Banner({
  text,
  tone = 'warn',
}: {
  text: string;
  tone?: 'warn' | 'error' | 'success';
}) {
  const palette =
    tone === 'error'
      ? { bg: colors.red50, border: colors.red200, fg: '#B91C1C' }
      : tone === 'success'
        ? { bg: colors.primary50, border: colors.primary200, fg: colors.primary700 }
        : { bg: '#FBF0E2', border: '#F1D2AA', fg: '#8A5316' };
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

// --------------------------------------------------------------------------- //
//  Form fields
// --------------------------------------------------------------------------- //
export function Field({
  label,
  error,
  required,
  optionalLabel,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.red }}> *</Text> : null}
        {!required && optionalLabel ? (
          <Text style={styles.optional}> ({optionalLabel})</Text>
        ) : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...rest}
      style={[styles.input, invalid && { borderColor: colors.red }, rest.multiline && styles.multiline, style]}
    />
  );
}

// --------------------------------------------------------------------------- //
//  States
// --------------------------------------------------------------------------- //
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      emoji="📡"
      title={message}
      action={<Button title={retryLabel} icon="refresh" variant="ghost" onPress={onRetry} />}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  buttonTextSmall: { fontSize: 14, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sand200,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: colors.white },
  chipCount: { fontSize: 12, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sand200,
    padding: space.lg,
    ...shadow,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 21 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: space.sm },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: space.md },
  bannerText: { fontSize: 14, lineHeight: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink },
  optional: { fontSize: 12, fontWeight: '400', color: colors.muted },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.sand200,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  error: { fontSize: 13, color: colors.red, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  muted: { color: colors.muted, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xl },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { marginTop: space.sm, fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  emptyBody: { marginTop: 6, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
