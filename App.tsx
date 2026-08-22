import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { AppShell } from './src/components/AppShell';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { colors } from './src/theme';

function Root() {
  const { user, demoMode, loading } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!user && !demoMode) return <AuthScreen />;
  return <AppShell demoMode={demoMode} userId={user?.id} />;
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><AppErrorBoundary><AuthProvider><Root /></AuthProvider></AppErrorBoundary></SafeAreaProvider>;
}

const styles = StyleSheet.create({ loading: { alignItems:'center', backgroundColor:colors.background, flex:1, justifyContent:'center' } });
