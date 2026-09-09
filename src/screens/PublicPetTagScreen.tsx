import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../context/PreferencesContext';
import type { PublicPetTag } from '../lib/petTags';
import { tagCopy } from '../lib/petTagCopy';
import { isValidContactPhone, TAG_TOKEN_PATTERN } from '../lib/petIdentity';
import { petSpeciesFromDatabase } from "../lib/petSpecies";
import { t } from '../lib/i18n';
import type { SupportedLocale } from '../lib/globalization';
import { colors } from '../theme';

const languages: [SupportedLocale, string][] = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['ja', '日本語']];

export function FinderCard({ data, demo = false }: { data: PublicPetTag; demo?: boolean }) {
  const { language } = usePreferences();
  const c = tagCopy[language];
  const [linkError, setLinkError] = useState(false);
  const canContact = !demo && isValidContactPhone(data.contactPhone);
  const contact = async (scheme: 'tel' | 'sms') => {
    try { await Linking.openURL(`${scheme}:${data.contactPhone}`); }
    catch { setLinkError(true); }
  };
  return <View style={styles.card}>
    {demo ? <Text style={styles.notice}>{c.demoPreview}</Text> : null}
    {data.lostMode ? <Text style={styles.lost}>{c.lostBanner}</Text> : null}
    <Text style={styles.eyebrow}>{c.found}</Text>
    <Text accessibilityRole="header" style={styles.name}>{data.name}</Text>
    <Text style={styles.body}>{t(language, petSpeciesFromDatabase(data.species))}{data.breed ? ` · ${data.breed}` : ''}</Text>
    <Text style={styles.body}>{c.finderHelp}</Text>
    {data.finderMessage ? <Text style={styles.note}>{data.finderMessage}</Text> : null}
    {data.contactName ? <Text style={styles.contactName}>{data.contactName}</Text> : null}
    <Text selectable style={styles.body}>{data.contactPhone}</Text>
    <Pressable accessibilityRole="button" disabled={!canContact} onPress={() => void contact('tel')} style={[styles.button, !canContact && styles.disabled]}><Text style={styles.buttonText}>{c.call}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={!canContact} onPress={() => void contact('sms')} style={[styles.secondary, !canContact && styles.disabled]}><Text style={styles.secondaryText}>{c.message}</Text></Pressable>
    {demo ? <Text style={styles.small}>{c.noContact}</Text> : null}
    {linkError ? <Text accessibilityRole="alert" style={styles.body}>{data.contactPhone}</Text> : null}
    <Text style={styles.small}>{c.privacy}</Text>
  </View>;
}

export function PublicPetTagScreen({ token }: { token: string }) {
  const { language, setLanguage } = usePreferences();
  const c = tagCopy[language];
  const [data, setData] = useState<PublicPetTag | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setState('loading'); setData(null);
    if (!TAG_TOKEN_PATTERN.test(token)) { setState('missing'); clearTimeout(timeout); return; }
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    if (!base) { setState('error'); clearTimeout(timeout); return; }
    void fetch(`${base}/functions/v1/public-pet-tag?token=${encodeURIComponent(token)}`, {
      signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
    }).then(async response => {
      if (response.status === 404) { if (active) setState('missing'); return; }
      if (!response.ok) throw new Error('UNAVAILABLE');
      const result = await response.json();
      if (typeof result.name !== 'string' || typeof result.species !== 'string' || typeof result.breed !== 'string' || typeof result.contactName !== 'string' || typeof result.contactPhone !== 'string' || !isValidContactPhone(result.contactPhone) || typeof result.finderMessage !== 'string' || typeof result.lostMode !== 'boolean') throw new Error('INVALID_RESPONSE');
      if (active) { setData(result); setState('ready'); }
    }).catch(() => { if (active) setState('error'); }).finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [token, attempt]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'PetCookieGo';
    for (const [name, content] of [['robots', 'noindex, nofollow'], ['referrer', 'no-referrer']]) {
      const meta = document.createElement('meta'); meta.name = name; meta.content = content; document.head.appendChild(meta);
    }
  }, []);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Text accessibilityRole="header" style={styles.brand}>PetCookieGo</Text>
    <View style={styles.languages}>{languages.map(([code, label]) => <Pressable key={code} accessibilityRole="button" accessibilityState={{ selected: code === language }} onPress={() => void setLanguage(code)} style={[styles.language, code === language && styles.languageActive]}><Text style={styles.languageText}>{label}</Text></Pressable>)}</View>
    {state === 'loading' ? <View style={styles.card}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>{c.loading}</Text></View> : null}
    {data && state === 'ready' ? <FinderCard data={data} /> : null}
    {state === 'missing' || state === 'error' ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.body}>{state === 'missing' ? c.missing : c.network}</Text><Pressable accessibilityRole="button" onPress={() => setAttempt(a => a + 1)} style={styles.button}><Text style={styles.buttonText}>{c.retry}</Text></Pressable></View> : null}
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://tarikokbinoglu17.github.io/PetVitals/')} style={styles.secondary}><Text style={styles.secondaryText}>{c.back}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 20, width: '100%', maxWidth: 620, alignSelf: 'center', gap: 18 },
  brand: { color: colors.primaryDark, fontSize: 26, fontWeight: '900' },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  language: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 44 },
  languageActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  languageText: { fontSize: 14, color: colors.text },
  card: { padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, gap: 14 },
  eyebrow: { color: colors.muted, fontSize: 16 }, name: { color: colors.text, fontSize: 32, fontWeight: '900' },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 }, small: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  contactName: { color: colors.text, fontSize: 20, fontWeight: '700' },
  note: { color: colors.text, fontSize: 16, lineHeight: 24, backgroundColor: colors.background, padding: 14, borderRadius: 12 },
  notice: { color: colors.primaryDark, fontSize: 14, lineHeight: 21, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 10 },
  lost: { color: '#FFFFFF', backgroundColor: '#B42318', padding: 16, fontSize: 20, fontWeight: '800', borderRadius: 12 },
  button: { backgroundColor: colors.primary, padding: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  secondary: { borderWidth: 1, borderColor: colors.primary, padding: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  secondaryText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700', textAlign: 'center' }, disabled: { opacity: 0.45 },
});
