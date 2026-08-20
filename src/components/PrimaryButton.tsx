import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function PrimaryButton({ title, onPress, loading = false, variant = 'primary' }: { title: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'secondary' }) {
  return (
    <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} /> : <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', minHeight: 54, paddingHorizontal: 20 },
  secondary: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.8 },
  text: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondaryText: { color: colors.primaryDark },
});

