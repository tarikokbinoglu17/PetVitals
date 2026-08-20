import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import type { SocialProvider } from '../lib/socialAuth';
import { colors } from '../theme';

export function AuthScreen() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const { signIn, signInWithSocial, signUp, enterDemo } = useAuth();

  const submit = async () => {
    setError('');
    if (register && name.trim().length < 2) return setError('Adınız en az 2 karakter olmalı.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Geçerli bir e-posta adresi girin.');
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalı.');
    setBusy(true);
    const result = register ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.message) Alert.alert('Kayıt tamamlandı', result.message);
  };

  const submitSocial = async (provider: SocialProvider) => {
    setError('');
    setSocialBusy(provider);
    const result = await signInWithSocial(provider);
    setSocialBusy(null);
    if (result.error) setError(result.error);
    if (result.message) Alert.alert('Giriş seçeneği hazır', result.message);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><Text style={styles.logoIcon}>🐾</Text></View>
        <Text style={styles.brand}>PetVitals</Text>
        <Text style={styles.tagline}>Dostunuzun sağlığı, her zaman yanınızda.</Text>
        <View style={styles.card}>
          <Text style={styles.title}>{register ? 'Hesap oluştur' : 'Tekrar hoş geldiniz'}</Text>
          <Text style={styles.subtitle}>{register ? 'Evcil dostlarınızı takip etmeye başlayın.' : 'Bilgilerinize ulaşmak için giriş yapın.'}</Text>
          <SocialAuthButtons busyProvider={socialBusy} disabled={busy} onPress={submitSocial} />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya e-posta ile</Text>
            <View style={styles.dividerLine} />
          </View>
          {register ? <FormField autoCapitalize="words" label="Ad soyad" onChangeText={setName} placeholder="Adınız Soyadınız" value={name} /> : null}
          <FormField autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="E-posta" onChangeText={setEmail} placeholder="ornek@eposta.com" value={email} />
          <FormField autoCapitalize="none" autoComplete={register ? 'new-password' : 'current-password'} label="Şifre" onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry value={password} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton loading={busy} onPress={submit} title={register ? 'Kayıt ol' : 'Giriş yap'} />
          <Pressable onPress={() => { setRegister(!register); setError(''); }} style={styles.switch}>
            <Text style={styles.switchText}>{register ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={enterDemo}><Text style={styles.demo}>Uygulamayı demo verileriyle incele →</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  logo: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primarySoft, borderRadius: 28, height: 72, justifyContent: 'center', width: 72 }, logoIcon: { fontSize: 34 },
  brand: { color: colors.primaryDark, fontSize: 34, fontWeight: '900', marginTop: 12, textAlign: 'center' }, tagline: { color: colors.muted, fontSize: 15, marginBottom: 28, marginTop: 5, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22 }, title: { color: colors.text, fontSize: 23, fontWeight: '800' }, subtitle: { color: colors.muted, lineHeight: 20, marginBottom: 22, marginTop: 6 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 10, marginVertical: 18 }, dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 }, dividerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 }, switch: { alignItems: 'center', padding: 14 }, switchText: { color: colors.primary, fontWeight: '700' }, demo: { color: colors.muted, fontWeight: '700', marginTop: 22, textAlign: 'center' },
});
