import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('home.title')}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{t('home.emptyFeed')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 15, textAlign: 'center' },
});
