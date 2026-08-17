import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { testSupabaseConnection } from '@/services/supabase/connectionTest.service';

type Status = 'checking' | 'connected' | 'error';

/**
 * Diagnostic banner for verifying Supabase connectivity end-to-end. Not a
 * normal app screen — tap it to re-run the check. Shown on the sign-in
 * screen since that's the first screen reached before any auth session
 * exists, which is also when this is most useful to check.
 */
export function SupabaseConnectionStatus() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [status, setStatus] = useState<Status>('checking');
  const [detail, setDetail] = useState('');

  const runTest = useCallback(() => {
    setStatus('checking');
    setDetail('');
    void testSupabaseConnection().then((result) => {
      setStatus(result.ok ? 'connected' : 'error');
      setDetail(result.detail);
    });
  }, []);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const backgroundColor =
    status === 'connected' ? colors.success : status === 'error' ? colors.danger : colors.surface;
  const textColor = status === 'checking' ? colors.text : '#FFFFFF';

  return (
    <Pressable
      onPress={runTest}
      style={[styles.banner, { backgroundColor, borderColor: colors.border }]}
    >
      {status === 'checking' ? <ActivityIndicator size="small" color={textColor} /> : null}
      <Text style={[styles.text, { color: textColor }]} numberOfLines={3}>
        {status === 'checking'
          ? t('system.connectionChecking')
          : status === 'connected'
            ? t('system.connectionOk')
            : `${t('system.connectionError')}: ${detail}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  text: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
