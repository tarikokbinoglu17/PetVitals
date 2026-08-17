import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';

interface ScreenContainerProps extends PropsWithChildren {
  scrollable?: boolean;
}

export function ScreenContainer({ children, scrollable = false }: ScreenContainerProps) {
  const colors = useThemeColors();
  const Content = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Content
          style={styles.flex}
          contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        >
          {children}
        </Content>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20 },
});
