import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { user, signOut } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>
        {user ? (
          <View style={styles.info}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {user.fullName ?? user.email}
            </Text>
            <Text style={{ color: colors.textMuted }}>{user.email}</Text>
            <Text style={{ color: colors.textMuted }}>{t(`roles.${user.role}`)}</Text>
          </View>
        ) : null}
        <Button label={t('profile.signOut')} variant="secondary" onPress={() => void signOut()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  info: { alignItems: 'center', gap: 4 },
});
