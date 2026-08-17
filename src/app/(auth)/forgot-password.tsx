import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { sendPasswordResetEmail } from '@/services/supabase/auth.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isValidEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setErrorMessage(t('auth.errors.invalidEmail'));
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(email);
      setSent(true);
    } catch {
      setErrorMessage(t('auth.errors.genericReset'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.forgotPassword.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('auth.forgotPassword.subtitle')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t('auth.forgotPassword.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!sent}
        />
        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}
        {sent ? (
          <Text style={[styles.successText, { color: colors.success }]}>
            {t('auth.forgotPassword.submit')} ✓
          </Text>
        ) : (
          <Button
            label={t('auth.forgotPassword.submit')}
            onPress={handleSubmit}
            loading={submitting}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Link href="/" style={{ color: colors.primary, fontWeight: '600' }}>
          {t('auth.forgotPassword.backToSignIn')}
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
  successText: { fontSize: 14, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
