/**
 * One form for every way a listing is written from the phone: a seller posting
 * (`create`), fixing a typo (`edit`), and the founder posting for a grower who
 * phoned (`admin`). Same eleven categories and seven units as the bot and the
 * website, same validation as the website's form.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocalPhoto } from '@/lib/api';
import { CATEGORIES, CATEGORY_ORDER, REGION_ORDER, UNITS, UNIT_ORDER, regionLabel } from '@/lib/catalog';
import { districtsOf, isValidDistrict } from '@/lib/districts';
import { formatDate, isoDay, isValidPhone } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { pickPhoto } from '@/lib/photo';
import { colors, radius, space } from '@/lib/theme';
import type { CategoryKey, NewListingInput, UnitKey } from '@/lib/types';

import SelectSheet from './SelectSheet';
import { Banner, Button, Chip, Field, Input } from './ui';

export interface ListingFormValues {
  productName: string;
  category: CategoryKey;
  price: string;
  unit: UnitKey;
  quantity: string;
  region: string;
  district: string;
  harvestDate: string;
  description: string;
  phone: string;
  telegramUsername: string;
  whatsappNumber: string;
  sellerPhone: string;
  sellerName: string;
}

export const EMPTY_FORM: ListingFormValues = {
  productName: '',
  category: 'vegetables',
  price: '',
  unit: 'kg',
  quantity: '',
  region: 'samarkand',
  district: '',
  harvestDate: '',
  description: '',
  phone: '',
  telegramUsername: '',
  whatsappNumber: '',
  sellerPhone: '',
  sellerName: '',
};

export type ListingFormResult = NewListingInput & { sellerPhone?: string; sellerName?: string };

type Errors = Partial<Record<keyof ListingFormValues | 'contacts', string>>;

export default function ListingForm({
  mode,
  initial,
  initialPhotoUrl,
  submitLabel,
  onSubmit,
  error,
}: {
  mode: 'create' | 'edit' | 'admin';
  initial?: Partial<ListingFormValues>;
  initialPhotoUrl?: string;
  submitLabel: string;
  onSubmit: (values: ListingFormResult, photo: LocalPhoto | null) => Promise<void>;
  error?: string | null;
}) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState<ListingFormValues>(() => {
    const merged = { ...EMPTY_FORM, ...initial };
    // A remembered district only makes sense inside the remembered region.
    if (merged.district && !isValidDistrict(merged.district, merged.region)) merged.district = '';
    return merged;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, contacts: undefined }));
  }

  /** A new region makes the old district wrong — clear it rather than submit Urgut under Fergana. */
  function changeRegion(region: string) {
    setForm((current) => ({ ...current, region, district: '' }));
    setErrors((current) => ({ ...current, district: undefined }));
  }

  async function choosePhoto(source: 'camera' | 'library') {
    setPreparing(true);
    const result = await pickPhoto(source);
    setPreparing(false);
    if (result.ok) setPhoto(result.photo);
    else if (result.reason === 'denied') Alert.alert(t.form.permissionDenied);
    else if (result.reason === 'failed') Alert.alert(t.common.error);
  }

  function validate(): boolean {
    const next: Errors = {};
    if (form.productName.trim().length < 2) next.productName = t.form.minLength(2);
    const price = Number(form.price.replace(/\s/g, '').replace(',', '.'));
    if (!form.price.trim()) next.price = t.form.required;
    else if (!Number.isFinite(price) || price <= 0) next.price = t.form.invalidPrice;
    if (form.quantity.trim()) {
      const quantity = Number(form.quantity.replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity < 0) next.quantity = t.form.invalidNumber;
    }
    if (mode !== 'admin' && !form.district) next.district = t.form.required;
    for (const key of ['phone', 'whatsappNumber', 'sellerPhone'] as const) {
      if (form[key].trim() && !isValidPhone(form[key])) next[key] = t.form.invalidPhone;
    }
    if (mode === 'admin') {
      if (!form.sellerPhone.trim()) next.sellerPhone = t.form.required;
    } else if (!form.phone.trim() && !form.telegramUsername.trim() && !form.whatsappNumber.trim()) {
      next.contacts = t.form.atLeastOneContact;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    const quantity = Number(form.quantity.replace(',', '.'));
    try {
      await onSubmit(
        {
          productName: form.productName.trim(),
          category: form.category,
          price: Number(form.price.replace(/\s/g, '').replace(',', '.')),
          unit: form.unit,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
          region: form.region,
          district: form.district || undefined,
          harvestDate: form.harvestDate || undefined,
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          telegramUsername: form.telegramUsername.trim().replace(/^@/, '') || undefined,
          whatsappNumber: form.whatsappNumber.trim() || undefined,
          sellerPhone: form.sellerPhone.trim() || undefined,
          sellerName: form.sellerName.trim() || undefined,
        },
        photo,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const unit = UNITS[form.unit][lang];
  const shownPhoto = photo?.uri ?? initialPhotoUrl;
  const today = isoDay(0);
  const yesterday = isoDay(1);

  return (
    <View style={styles.form}>
      {mode === 'admin' ? (
        <View style={styles.group}>
          <Text style={styles.hint}>{t.form.sellerHint}</Text>
          <Field label={t.form.sellerPhone} error={errors.sellerPhone} required>
            <Input
              value={form.sellerPhone}
              onChangeText={(v) => update('sellerPhone', v)}
              placeholder="+998 90 123 45 67"
              keyboardType="phone-pad"
              invalid={Boolean(errors.sellerPhone)}
            />
          </Field>
          <Field label={t.form.sellerName} optionalLabel={t.common.optional}>
            <Input value={form.sellerName} onChangeText={(v) => update('sellerName', v)} />
          </Field>
        </View>
      ) : null}

      {/* photo ------------------------------------------------------------ */}
      <Field label={t.form.photo} optionalLabel={t.common.optional}>
        <View style={styles.photoBox}>
          {shownPhoto ? (
            <Image source={{ uri: shownPhoto }} style={styles.photo} contentFit="cover" />
          ) : (
            <Text style={styles.photoEmoji}>{CATEGORIES[form.category].emoji}</Text>
          )}
          {preparing ? (
            <View style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>{t.form.preparingPhoto}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.row}>
          <Button title={t.form.camera} icon="camera" variant="subtle" small style={styles.flex} onPress={() => void choosePhoto('camera')} />
          <Button title={t.form.gallery} icon="images" variant="subtle" small style={styles.flex} onPress={() => void choosePhoto('library')} />
        </View>
        {photo ? (
          <Pressable onPress={() => setPhoto(null)} accessibilityRole="button">
            <Text style={styles.link}>{t.form.removePhoto}</Text>
          </Pressable>
        ) : null}
      </Field>

      {/* product ----------------------------------------------------------- */}
      <Field label={t.form.title} error={errors.productName} required>
        <Input
          value={form.productName}
          onChangeText={(v) => update('productName', v)}
          placeholder={t.form.titlePlaceholder}
          maxLength={100}
          invalid={Boolean(errors.productName)}
        />
      </Field>

      <Field label={t.form.category} required>
        <View style={styles.wrap}>
          {CATEGORY_ORDER.map((key) => (
            <Chip
              key={key}
              label={`${CATEGORIES[key].emoji} ${CATEGORIES[key][lang]}`}
              selected={form.category === key}
              onPress={() => update('category', key)}
            />
          ))}
        </View>
      </Field>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Field label={t.form.pricePer(unit)} error={errors.price} required>
            <Input
              value={form.price}
              onChangeText={(v) => update('price', v)}
              keyboardType="numeric"
              placeholder="8000"
              invalid={Boolean(errors.price)}
            />
          </Field>
        </View>
        <View style={{ width: 130 }}>
          <Field label={t.form.unit} required>
            <SelectSheet
              title={t.form.unit}
              value={form.unit}
              placeholder={unit}
              options={UNIT_ORDER.map((key) => ({ key, label: UNITS[key][lang] }))}
              onChange={(key) => update('unit', key as UnitKey)}
            />
          </Field>
        </View>
      </View>

      <Field label={t.form.quantity(unit)} error={errors.quantity} optionalLabel={t.common.optional}>
        <Input
          value={form.quantity}
          onChangeText={(v) => update('quantity', v)}
          keyboardType="numeric"
          placeholder="500"
        />
      </Field>

      <Field label={t.form.region} required>
        <SelectSheet
          title={t.form.region}
          value={form.region}
          placeholder={t.form.region}
          icon="location-outline"
          options={REGION_ORDER.map((key) => ({ key, label: regionLabel(key, lang) }))}
          onChange={changeRegion}
        />
      </Field>

      <Field
        label={t.form.district}
        error={errors.district}
        required={mode !== 'admin'}
        optionalLabel={t.common.optional}
      >
        <SelectSheet
          title={t.form.district}
          value={form.district}
          placeholder={t.form.chooseDistrict}
          icon="business-outline"
          invalid={Boolean(errors.district)}
          options={districtsOf(form.region).map((d) => ({
            key: d.key,
            label: d.label,
            hint: d.type === 'city' ? '🏙' : undefined,
          }))}
          onChange={(key) => update('district', key)}
        />
      </Field>

      <Field label={t.form.harvest} optionalLabel={t.common.optional}>
        <View style={styles.wrap}>
          <Chip label={t.form.harvestToday} selected={form.harvestDate === today} onPress={() => update('harvestDate', today)} />
          <Chip label={t.form.harvestYesterday} selected={form.harvestDate === yesterday} onPress={() => update('harvestDate', yesterday)} />
          <Chip label={t.form.harvestNone} selected={!form.harvestDate} onPress={() => update('harvestDate', '')} />
          {form.harvestDate && form.harvestDate !== today && form.harvestDate !== yesterday ? (
            <Chip label={formatDate(form.harvestDate, t.months)} selected onPress={() => undefined} />
          ) : null}
        </View>
      </Field>

      <Field label={t.form.description} optionalLabel={t.common.optional}>
        <Input
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder={t.form.descriptionPlaceholder}
          multiline
          maxLength={1000}
        />
      </Field>

      {/* contacts ---------------------------------------------------------- */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>
          {t.form.contacts}
          {mode !== 'admin' ? <Text style={{ color: colors.red }}> *</Text> : null}
        </Text>
        {mode !== 'admin' ? <Text style={styles.hint}>{t.form.contactsHint}</Text> : null}
        <Field label={t.form.phone} error={errors.phone}>
          <Input
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            keyboardType="phone-pad"
            placeholder="+998 90 123 45 67"
            invalid={Boolean(errors.phone)}
          />
        </Field>
        <Field label={t.form.telegram}>
          <Input
            value={form.telegramUsername}
            onChangeText={(v) => update('telegramUsername', v)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@username"
          />
        </Field>
        <Field label={t.form.whatsapp} error={errors.whatsappNumber}>
          <Input
            value={form.whatsappNumber}
            onChangeText={(v) => update('whatsappNumber', v)}
            keyboardType="phone-pad"
            placeholder="+998 90 123 45 67"
            invalid={Boolean(errors.whatsappNumber)}
          />
        </Field>
        {errors.contacts ? <Banner tone="error" text={errors.contacts} /> : null}
      </View>

      {error ? <Banner tone="error" text={error} /> : null}
      {Object.keys(errors).some((k) => errors[k as keyof Errors]) ? (
        <Banner tone="error" text={t.form.fixErrors} />
      ) : null}

      <Button
        title={submitting ? t.form.submitting : submitLabel}
        icon="checkmark-circle"
        loading={submitting}
        disabled={preparing}
        onPress={() => void submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  group: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sand200,
    backgroundColor: colors.white,
  },
  groupTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  photoBox: {
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoEmoji: { fontSize: 64 },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayText: { fontWeight: '700', color: colors.primary700 },
  link: { color: colors.red, fontWeight: '600', marginTop: 4 },
});
