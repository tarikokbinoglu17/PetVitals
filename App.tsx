import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AppShell } from "./src/components/AppShell";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { colors } from "./src/theme";
import { PreferencesProvider } from "./src/context/PreferencesContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";

function Root() {
  const { user, demoMode, loading } = useAuth();
  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (!user && !demoMode) return <AuthScreen />;

  const userKey = user?.id || "demo";
  return (
    <SubscriptionProvider userKey={userKey}>
      <AppShell demoMode={demoMode} userId={user?.id} />
    </SubscriptionProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PreferencesProvider>
        <AppErrorBoundary>
          <AuthProvider>
            <Root />
          </AuthProvider>
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
