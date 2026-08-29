import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePetData } from '../hooks/usePetData';
import type { TabName } from '../types';
import { colors, shadow } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { PetsScreen } from '../screens/PetsScreen';
import { PetDetailScreen } from '../screens/PetDetailScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { LifeScreen } from '../screens/LifeScreen';
import { NearMeScreen } from '../screens/NearMeScreen';
import { PlatformScreen } from '../screens/PlatformScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { usePreferences } from '../context/PreferencesContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SubscriptionGate } from './SubscriptionGate';
import { FaunviaIntelligencePanel } from './FaunviaIntelligencePanel';

const tabCopy = {
  tr: ['Bugün', 'Dostlarım', 'Sağlık', 'Yaşam', 'Yakınımda', 'Faunvia+', 'Profil'],
  en: ['Today', 'My Pets', 'Health', 'Life', 'Nearby', 'Faunvia+', 'Profile'],
  de: ['Heute', 'Tiere', 'Gesundheit', 'Leben', 'In der Nähe', 'Faunvia+', 'Profil'],
  es: ['Hoy', 'Mascotas', 'Salud', 'Vida', 'Cerca', 'Faunvia+', 'Perfil'],
  ja: ['今日', 'ペット', '健康', '生活', '周辺', 'Faunvia+', 'プロフィール'],
} as const;
const statusCopy = {
  tr: { checking: 'Üyelik durumunuz kontrol ediliyor…', loading: 'Bilgileriniz yükleniyor…', failed: 'Bilgiler yüklenemedi', trial: (days:number) => `Premium deneme · ${days} gün kaldı` },
  en: { checking: 'Checking your membership…', loading: 'Loading your information…', failed: 'Could not load information', trial: (days:number) => `Premium trial · ${days} days left` },
  de: { checking: 'Mitgliedschaft wird geprüft…', loading: 'Daten werden geladen…', failed: 'Daten konnten nicht geladen werden', trial: (days:number) => `Premium-Test · ${days} Tage übrig` },
  es: { checking: 'Comprobando tu membresía…', loading: 'Cargando tu información…', failed: 'No se pudo cargar la información', trial: (days:number) => `Prueba Premium · quedan ${days} días` },
  ja: { checking: 'メンバーシップを確認しています…', loading: '情報を読み込んでいます…', failed: '情報を読み込めませんでした', trial: (days:number) => `Premium無料体験 · 残り${days}日` },
} as const;
const tabKeys: { key: TabName; icon: string }[] = [
  { key: 'home', icon: '⌂' }, { key: 'pets', icon: '🐾' }, { key: 'health', icon: '♥' }, { key: 'life', icon: '◉' }, { key: 'nearby', icon: '⌖' }, { key: 'platform', icon: '✦' }, { key: 'profile', icon: '' },
];

export function AppShell({ demoMode, userId }: { demoMode: boolean; userId?: string }) {
  const { language } = usePreferences();
  const { accessState, trialDaysRemaining } = useSubscription();
  const tabs = tabKeys.map((item, index) => ({ ...item, label: tabCopy[language][index] }));
  const [tab, setTab] = useState<TabName>('home');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { pets, records, loading, error, addPet, updatePet, deletePet, addVaccine, deleteRecord, savingPet, savingVaccine } = usePetData({ demoMode, userId });
  const selectedPet = selectedPetId ? pets.find(pet => pet.id === selectedPetId) : undefined;
  const copy = statusCopy[language];

  if (accessState === 'loading') return <SafeAreaView style={styles.safe}><View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.stateText}>{copy.checking}</Text></View></SafeAreaView>;
  if (accessState === 'expired') return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}><SubscriptionGate /></SafeAreaView>;

  function scrollToTop() { scrollRef.current?.scrollTo({ animated: false, y: 0 }); }
  function selectTab(nextTab: TabName) { setTab(nextTab); if (nextTab !== 'pets') setSelectedPetId(null); scrollToTop(); }

  const screen = (() => {
    if (tab === 'profile') return <ProfileScreen />;
    if (loading) return <View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.stateText}>{copy.loading}</Text></View>;
    if (error) return <View style={styles.state}><Text style={styles.errorTitle}>{copy.failed}</Text><Text style={styles.stateText}>{error}</Text></View>;
    if (tab === 'life') return <LifeScreen demoMode={demoMode} pets={pets} userId={userId} />;
    if (tab === 'nearby') return <NearMeScreen pets={pets} userId={demoMode ? undefined : userId} />;
    if (tab === 'pets') {
      return selectedPet ? <PetDetailScreen
        onBack={() => { setSelectedPetId(null); scrollToTop(); }}
        onDeletePet={() => deletePet(selectedPet.id)}
        onDeleteRecord={deleteRecord}
        onUpdatePet={draft => updatePet(selectedPet.id, draft)}
        pet={selectedPet}
        records={records}
        savingPet={savingPet}
      /> : <PetsScreen onAddPet={addPet} onSelectPet={pet => { setSelectedPetId(pet.id); scrollToTop(); }} pets={pets} savingPet={savingPet} />;
    }
    if (tab === 'health') return <HealthScreen onAddVaccine={addVaccine} pets={pets} records={records} savingVaccine={savingVaccine} />;
    if (tab === 'platform') return <PlatformScreen demoMode={demoMode} pets={pets} records={records} userId={userId} />;
    return <><FaunviaIntelligencePanel demoMode={demoMode} pets={pets} records={records} userId={userId} /><HomeScreen demoMode={demoMode} pets={pets} records={records} userId={userId} /></>;
  })();

  return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
    {accessState === 'trial' ? <View style={styles.trialBanner}><Text style={styles.trialText}>{copy.trial(trialDaysRemaining)}</Text></View> : null}
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" ref={scrollRef}>{screen}</ScrollView>
    <View style={styles.tabs}>{tabs.map(item => { const selected = tab === item.key; return <Pressable accessibilityLabel={item.label} accessibilityRole="tab" accessibilityState={{ selected }} key={item.key} onPress={() => selectTab(item.key)} style={styles.tab}>{item.key === 'profile' ? <View accessible={false} style={styles.profileIcon}><View style={[styles.profileHead, selected && styles.profilePartActive]} /><View style={[styles.profileBody, selected && styles.profilePartActive]} /></View> : <Text style={[styles.icon, selected && styles.active]}>{item.icon}</Text>}<Text style={[styles.label, selected && styles.active]}>{item.label}</Text></Pressable>; })}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, trialBanner: { alignItems: 'center', backgroundColor: colors.primarySoft, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 7 }, trialText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' }, scroll: { flexGrow: 1, paddingBottom: 25 }, state: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 420, padding: 32 }, stateText: { color: colors.muted, lineHeight: 21, marginTop: 12, textAlign: 'center' }, errorTitle: { color: colors.danger, fontSize: 18, fontWeight: '800' }, tabs: { ...shadow, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 12, paddingTop: 11 }, tab: { alignItems: 'center', flex: 1, gap: 4, minHeight: 46, minWidth: 0, justifyContent: 'center' }, icon: { color: colors.muted, fontSize: 19 }, profileIcon: { alignItems: 'center', height: 22, justifyContent: 'center', width: 22 }, profileHead: { backgroundColor: colors.muted, borderRadius: 4, height: 8, width: 8 }, profileBody: { backgroundColor: colors.muted, borderTopLeftRadius: 8, borderTopRightRadius: 8, height: 8, marginTop: 2, width: 17 }, profilePartActive: { backgroundColor: colors.primary }, label: { color: colors.muted, fontSize: 8, fontWeight: '700' }, active: { color: colors.primary },
});
