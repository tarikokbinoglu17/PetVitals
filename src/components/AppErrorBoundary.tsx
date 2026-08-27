import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import type { SupportedLocale } from "../lib/globalization";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ language: SupportedLocale }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("PetVitals UI crash", error.message);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const copy = {
      tr: [
        "PetVitals bu ekranı açamadı.",
        "Verileriniz silinmedi. Ekranı güvenli şekilde yeniden yükleyebilirsiniz.",
        "Tekrar dene",
      ],
      en: [
        "PetVitals could not open this screen.",
        "Your data was not deleted. You can safely reload the screen.",
        "Try again",
      ],
      de: [
        "PetVitals konnte diesen Bildschirm nicht öffnen.",
        "Ihre Daten wurden nicht gelöscht. Sie können den Bildschirm sicher neu laden.",
        "Erneut versuchen",
      ],
      es: [
        "PetVitals no pudo abrir esta pantalla.",
        "Tus datos no se han eliminado. Puedes volver a cargar la pantalla de forma segura.",
        "Intentar de nuevo",
      ],
      ja: [
        "この画面を開けませんでした。",
        "データは削除されていません。安全に画面を再読み込みできます。",
        "もう一度試す",
      ],
    }[this.props.language];
    return (
      <View style={styles.page} accessibilityRole="alert">
        <Text style={styles.title}>{copy[0]}</Text>
        <Text style={styles.text}>{copy[1]}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ hasError: false })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy[2]}</Text>
        </Pressable>
      </View>
    );
  }
}

export function AppErrorBoundary({ children }: React.PropsWithChildren) {
  const { language } = usePreferences();
  return <ErrorBoundary language={language}>{children}</ErrorBoundary>;
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 13,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { color: colors.white, fontWeight: "900" },
});
