/** "Shikoyat qilish" — flag a listing for the founder. Anonymous, like everything a buyer does. */
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/lib/api';
import { useLanguage } from '@/lib/language';
import { useSession } from '@/lib/session';
import { colors, space } from '@/lib/theme';
import type { ReportReason } from '@/lib/types';

import { Banner, Button, Input } from './ui';

const REASONS: ReportReason[] = ['spam', 'fraud', 'wrong_price', 'sold', 'other'];

export default function ReportSheet({
  listingId,
  visible,
  onClose,
}: {
  listingId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { token } = useSession();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState('sending');
    setError(null);
    try {
      await api.reportListing(listingId, reason, note, token);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setState('idle');
    }
  }

  function close() {
    onClose();
    // Reset after the slide-out, so the sheet does not flash back to the form.
    setTimeout(() => {
      setState('idle');
      setNote('');
      setError(null);
    }, 300);
  }

  /** With the keyboard up, a tap outside means "hide the keyboard", not "throw my note away". */
  function tapOutside() {
    if (Keyboard.isVisible()) Keyboard.dismiss();
    else close();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      {/* The note field sits at the bottom; without this the iOS keyboard covers it and Submit. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={tapOutside} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={styles.title}>{t.report.title}</Text>
          {state === 'done' ? (
            <>
              <Banner tone="success" text={t.report.thanks} />
              <Button title={t.common.done} onPress={close} />
            </>
          ) : (
            <>
              {REASONS.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === key }}
                  onPress={() => setReason(key)}
                  style={styles.option}
                >
                  <View style={[styles.radio, reason === key && styles.radioOn]} />
                  <Text style={styles.optionText}>{t.report.reasons[key]}</Text>
                </Pressable>
              ))}
              <Input value={note} onChangeText={setNote} placeholder={t.report.note} multiline maxLength={500} />
              {error ? <Banner tone="error" text={error} /> : null}
              <View style={styles.row}>
                <Button title={t.common.cancel} variant="ghost" style={styles.flex} onPress={close} />
                <Button
                  title={t.report.submit}
                  variant="danger"
                  icon="flag"
                  style={styles.flex}
                  loading={state === 'sending'}
                  onPress={() => void submit()}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,42,36,0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: space.lg,
    gap: space.md,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sand300 },
  radioOn: { borderColor: colors.primary, borderWidth: 7 },
  optionText: { fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
