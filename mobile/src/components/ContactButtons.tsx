import { View } from 'react-native';

import { useLanguage } from '@/lib/language';
import { contact } from '@/lib/links';
import { space } from '@/lib/theme';

import { Banner, Button } from './ui';

/**
 * Call / Telegram / WhatsApp. There is no in-app chat on purpose: the deal
 * happens the way village trade already happens, on the phone.
 */
export default function ContactButtons({
  listingId,
  phone,
  telegram,
  whatsapp,
}: {
  listingId?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
}) {
  const { t } = useLanguage();
  if (!phone && !telegram && !whatsapp) return <Banner text={t.detail.noContact} />;
  return (
    <View style={{ gap: space.sm }}>
      {phone ? (
        <Button
          title={`${t.detail.call}  ${phone}`}
          icon="call"
          onPress={() => contact(listingId, 'call', phone, t.detail.cannotOpen)}
        />
      ) : null}
      {telegram ? (
        <Button
          title={`${t.detail.telegram}  @${telegram.replace(/^@/, '')}`}
          icon="paper-plane"
          variant="telegram"
          onPress={() => contact(listingId, 'telegram', telegram, t.detail.cannotOpen)}
        />
      ) : null}
      {whatsapp ? (
        <Button
          title={t.detail.whatsapp}
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() => contact(listingId, 'whatsapp', whatsapp, t.detail.cannotOpen)}
        />
      ) : null}
    </View>
  );
}
