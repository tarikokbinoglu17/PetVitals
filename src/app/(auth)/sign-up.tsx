import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserRole } from '@/types/user';
import { isValidEmail, isValidPassword } from '@/utils/validation';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pet_owner');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setErrorMessage(t('auth.errors.invalidEmail'));
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMessage(t('auth.errors.passwordTooShort'));
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signUp({ email, password, fullName, role });
    } catch {
      setErrorMessage(t('auth.errors.genericSignUp'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.signUp.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('auth.signUp.subtitle')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t('auth.signUp.fullNameLabel')}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
        <TextField
          label={t('auth.signUp.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label={t('auth.signUp.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
        />

        <ChipSelector
          label={t('auth.signUp.roleLabel')}
          value={role}
          onChange={setRole}
          options={[
            { value: 'pet_owner', label: t('roles.pet_owner') },
            { value: 'veterinarian', label: t('roles.veterinarian') },
          ]}
        />

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}
        <Button label={t('auth.signUp.submit')} onPress={handleSubmit} loading={submitting} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.textMuted }}>{t('auth.signUp.haveAccount')} </Text>
        <Link href="/" style={{ color: colors.primary, fontWeight: '600' }}>
          {t('auth.signUp.signIn')}
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
