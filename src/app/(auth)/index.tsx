import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { SupabaseConnectionStatus } from '@/components/system/SupabaseConnectionStatus';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isValidEmail } from '@/utils/validation';

export default function SignInScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setErrorMessage(t('auth.errors.invalidEmail'));
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setErrorMessage(t('auth.errors.genericSignIn'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <SupabaseConnectionStatus />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.signIn.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('auth.signIn.subtitle')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t('auth.signIn.emailLabel')}
          placeholder={t('auth.signIn.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label={t('auth.signIn.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}
        <Link href="/forgot-password" style={[styles.link, { color: colors.primary }]}>
          {t('auth.signIn.forgotPassword')}
        </Link>
        <Button label={t('auth.signIn.submit')} onPress={handleSubmit} loading={submitting} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.textMuted }}>{t('auth.signIn.noAccount')} </Text>
        <Link href="/sign-up" style={{ color: colors.primary, fontWeight: '600' }}>
          {t('auth.signIn.createAccount')}
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 32, gap: 6 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15 },
  form: { gap: 16 },
  errorText: { fontSize: 13 },
  link: { fontSize: 14, textAlign: 'right' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
