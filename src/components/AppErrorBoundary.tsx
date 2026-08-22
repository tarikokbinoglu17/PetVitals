import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('PetVitals UI crash', error.message);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.page} accessibilityRole="alert">
        <Text style={styles.title}>PetVitals bu ekranı açamadı.</Text>
        <Text style={styles.text}>Verileriniz silinmedi. Ekranı güvenli şekilde yeniden yükleyebilirsiniz.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ hasError: false })} style={styles.button}>
          <Text style={styles.buttonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.muted, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 13, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: colors.white, fontWeight: '900' },
});
