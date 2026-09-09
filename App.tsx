import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AppShell } from "./src/components/AppShell";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { PublicPetTagScreen } from "./src/screens/PublicPetTagScreen";
import { colors } from "./src/theme";
import { PreferencesProvider } from "./src/context/PreferencesContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";

export function Root() {
  const { user, demoMode, loading } = useAuth();
  if (loading && !demoMode)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (!user && !demoMode) return <AuthScreen />;

  const userKey = demoMode ? "demo" : user?.id || "demo";
  return (
    <SubscriptionProvider key={userKey} userKey={userKey}>
      <AppShell demoMode={demoMode} userId={demoMode ? undefined : user?.id} />
    </SubscriptionProvider>
  );
}

export default function App() {
  const tagToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tag") : null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PreferencesProvider>
        <AppErrorBoundary>
          {tagToken !== null ? <PublicPetTagScreen token={tagToken} /> : <AuthProvider>
            <Root />
          </AuthProvider>}
        </AppErrorBoundary>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
