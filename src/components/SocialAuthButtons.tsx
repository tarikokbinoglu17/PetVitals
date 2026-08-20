import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialProvider } from '../lib/socialAuth';
import { colors } from '../theme';

type Props = {
  busyProvider: SocialProvider | null;
  disabled?: boolean;
  onPress: (provider: SocialProvider) => void;
};

export function SocialAuthButtons({ busyProvider, disabled = false, onPress }: Props) {
  const blocked = disabled || busyProvider !== null;

  return (
    <View style={styles.group}>
      {Platform.OS === 'ios' ? (
        <View pointerEvents={blocked ? 'none' : 'auto'} style={[styles.appleWrapper, blocked && styles.disabled]}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            cornerRadius={14}
            onPress={() => onPress('apple')}
            style={styles.nativeAppleButton}
          />
          {busyProvider === 'apple' ? <View pointerEvents="none" style={styles.appleLoading}><ActivityIndicator color={colors.white} /></View> : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={blocked}
          onPress={() => onPress('apple')}
          style={({ pressed }) => [styles.button, styles.appleButton, blocked && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.appleMark}></Text>
          <Text style={styles.appleText}>Apple ile devam et</Text>
          {busyProvider === 'apple' ? <ActivityIndicator color={colors.white} /> : <View style={styles.trailingSpace} />}
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={blocked}
        onPress={() => onPress('google')}
        style={({ pressed }) => [styles.button, styles.googleButton, blocked && styles.disabled, pressed && styles.pressed]}
      >
        <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
        <Text style={styles.googleText}>Google ile devam et</Text>
        {busyProvider === 'google' ? <ActivityIndicator color={colors.primary} /> : <View style={styles.trailingSpace} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  button: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 16 },
  appleButton: { backgroundColor: '#000000' },
  appleMark: { color: colors.white, fontSize: 24, lineHeight: 26, width: 24 },
  appleText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  appleWrapper: { borderRadius: 14, height: 50, overflow: 'hidden' },
  nativeAppleButton: { height: 50, width: '100%' },
  appleLoading: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.72)', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  googleButton: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  googleMark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  googleMarkText: { color: '#4285F4', fontSize: 15, fontWeight: '900' },
  googleText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  trailingSpace: { width: 24 },
  disabled: { opacity: 0.62 },
  pressed: { opacity: 0.78 },
});
