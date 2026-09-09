import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { tagCopy } from '../lib/petTagCopy';
import { buildPetTagUrl, isValidContactPhone } from '../lib/petIdentity';
import { loadPetTag, savePetTag, setPetTagEnabled } from '../lib/petTags';
import type { PetTag } from '../lib/petTags';
import type { Pet } from '../types';
import { FinderCard } from '../screens/PublicPetTagScreen';
import { colors } from '../theme';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

export function PetTagPanel({ pet }: { pet: Pet }) {
  const { demoMode, user } = useAuth();
  const { language } = usePreferences();
  const c = tagCopy[language];
  const [tag, setTag] = useState<PetTag | null>(null);
  const [phone, setPhone] = useState(demoMode ? '+12025550123' : '');
  const [contactName, setContactName] = useState('');
  const [note, setNote] = useState('');
  const [lost, setLost] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState<keyof Omit<typeof c, 'steps'> | ''>('');
  const [showHelp, setShowHelp] = useState(false);
  const [preview, setPreview] = useState(false);
  const qr = useRef<{ toDataURL: (callback: (data: string) => void, options?: { width: number; height: number }) => void } | null>(null);
  const url = tag?.token && !demoMode ? buildPetTagUrl(tag.token) : '';
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadFailed(false);
    void loadPetTag(pet.id, demoMode, user?.id).then(value => {
      if (!active) return;
      setTag(value);
      if (value) { setPhone(value.contact_phone); setContactName(value.contact_name); setNote(value.finder_message); setLost(value.lost_mode); setConsent(true); }
    }).catch(() => { if (active) setLoadFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pet.id, demoMode, user?.id, attempt]);

  const save = async () => {
    if (!isValidContactPhone(phone)) { setFeedback('phoneError'); return; }
    if (!consent) { setFeedback('consentError'); return; }
    setBusy(true); setFeedback('');
    try {
      setTag(await savePetTag(pet.id, { contact_phone: phone, contact_name: contactName, finder_message: note, lost_mode: lost }, demoMode, user?.id, tag));
      setFeedback('saved');
    } catch { setFeedback('error'); }
    finally { setBusy(false); }
  };
  const toggle = async () => {
    if (!tag) return;
    setBusy(true); setFeedback(''); setPreview(false);
    try { setTag(await setPetTagEnabled(tag, !tag.enabled, demoMode, user?.id)); }
    catch { setFeedback('error'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!url) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(url); setFeedback('copied'); }
      else setFeedback('copyHelp');
    } catch { setFeedback('copyHelp'); }
  };
  const saveQr = async () => {
    if (!qr.current || !url) return;
    setBusy(true); setFeedback('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('QR_TIMEOUT')), 8000);
        qr.current!.toDataURL(value => { clearTimeout(timer); resolve(value); }, { width: 920, height: 920 });
      });
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a'); link.href = `data:image/png;base64,${data}`; link.download = 'PetCookieGo-QR.png';
        document.body.appendChild(link); link.click(); link.remove();
      } else {
        const file = await Print.printToFileAsync({ html: `<html><head><meta charset="utf-8"></head><body style="text-align:center;padding:32px;font-family:sans-serif"><h1>PetCookieGo</h1><img width="300" height="300" src="data:image/png;base64,${data}"></body></html>` });
        if (!(await Sharing.isAvailableAsync())) throw new Error('SHARING_UNAVAILABLE');
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: '.pdf' });
      }
    } catch { setFeedback('error'); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>{c.title}</Text>
    <Text style={styles.body}>{c.intro}</Text>
    {demoMode ? <Text style={styles.notice}>{c.demo}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHelp }} onPress={() => setShowHelp(v => !v)} style={styles.secondary}><Text style={styles.secondaryText}>{c.how} {showHelp ? '−' : '+'}</Text></Pressable>
    {showHelp ? <View style={styles.instructions}>{c.steps.map((step, i) => <Text style={styles.body} key={i}>{i + 1}. {step}</Text>)}</View> : null}
    {loading ? <><ActivityIndicator color={colors.primary} /><Text style={styles.body}>{c.loading}</Text></> : loadFailed ? <><Text accessibilityRole="alert" style={styles.body}>{c.loadError}</Text><PrimaryButton title={c.retry} onPress={() => setAttempt(v => v + 1)} /></> : <>
      {tag ? <Text style={styles.status}>{tag.enabled ? c.active : c.paused}</Text> : null}
      <FormField label={c.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={25} autoComplete="tel" placeholder="+90…" />
      <FormField label={c.contactName} value={contactName} onChangeText={setContactName} maxLength={80} />
      <FormField label={c.note} value={note} onChangeText={setNote} maxLength={400} multiline />
      <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.label}>{c.lost}</Text><Text style={styles.small}>{c.lostHelp}</Text></View><Switch accessibilityLabel={c.lost} value={lost} onValueChange={setLost} disabled={busy} /></View>
      <View style={styles.switchRow}><Switch accessibilityLabel={c.consent} value={consent} onValueChange={setConsent} disabled={busy} /><Text style={[styles.small, styles.switchCopy]}>{c.consent}</Text></View>
      <PrimaryButton loading={busy} onPress={() => void save()} title={tag ? c.save : c.create} />
      {tag ? <>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void toggle()} style={styles.secondary}><Text style={styles.secondaryText}>{tag.enabled ? c.pause : c.resume}</Text></Pressable>
        {url && tag.enabled ? <>
          <View style={styles.qr}><QRCode value={url} size={190} quietZone={20} ecl="M" color="#000000" backgroundColor="#FFFFFF" getRef={(ref: typeof qr.current) => { qr.current = ref; }} /></View>
          <Text style={styles.small}>{c.newLink}</Text>
          <Text selectable style={styles.link}>{url}</Text>
          <Pressable accessibilityRole="button" onPress={() => void copy()} style={styles.secondary}><Text style={styles.secondaryText}>{c.copy}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void saveQr()} style={styles.secondary}><Text style={styles.secondaryText}>{c.qr}</Text></Pressable>
          <Text style={styles.small}>{c.qrHelp}</Text>
        </> : null}
        {tag.enabled ? <Pressable accessibilityRole="button" onPress={() => { if (url) { void Linking.openURL(url).catch(() => setFeedback('error')); } else setPreview(v => !v); }} style={styles.secondary}><Text style={styles.secondaryText}>{preview ? c.close : c.preview}</Text></Pressable> : null}
        {preview && demoMode && tag.enabled ? <FinderCard demo data={{ name: pet.name, species: pet.species, breed: pet.breed, contactName: tag.contact_name, contactPhone: tag.contact_phone, finderMessage: tag.finder_message, lostMode: tag.lost_mode }} /> : null}
      </> : null}
    </>}
    {feedback ? <Text accessibilityRole="alert" style={styles.body}>{c[feedback]}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 24, padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, gap: 14 },
  title: { fontSize: 22, color: colors.text, fontWeight: '900' },
  body: { fontSize: 16, lineHeight: 24, color: colors.text }, small: { fontSize: 14, lineHeight: 21, color: colors.muted },
  label: { fontSize: 16, color: colors.text, fontWeight: '700', marginBottom: 5 },
  notice: { fontSize: 14, lineHeight: 21, color: colors.primaryDark, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 12 },
  status: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, switchCopy: { flex: 1, minWidth: 0 },
  secondary: { padding: 14, minHeight: 48, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  instructions: { gap: 16 }, qr: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  link: { fontSize: 14, lineHeight: 22, color: colors.primaryDark },
});
