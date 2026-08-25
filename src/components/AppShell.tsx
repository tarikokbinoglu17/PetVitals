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

const tabs: { key: TabName; label: string; icon: string }[] = [
  { key: 'home', label: 'Bugün', icon: '⌂' },
  { key: 'pets', label: 'Dostlarım', icon: '🐾' },
  { key: 'health', label: 'Sağlık', icon: '♥' },
  { key: 'life', label: 'Yaşam', icon: '◉' },
  { key: 'nearby', label: 'Yakınımda', icon: '⌖' },
  { key: 'platform', label: 'PetVitals+', icon: '✦' },
  { key: 'profile', label: 'Profil', icon: '' },
];

export function AppShell({ demoMode, userId }: { demoMode: boolean; userId?: string }) {
  const [tab, setTab] = useState<TabName>('home');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { pets, records, loading, error, addPet, addVaccine, savingPet, savingVaccine } = usePetData({ demoMode, userId });
  const selectedPet = selectedPetId ? pets.find(pet => pet.id === selectedPetId) : undefined;

  function scrollToTop() {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }

  function selectTab(nextTab: TabName) {
    setTab(nextTab);
    if (nextTab !== 'pets') setSelectedPetId(null);
    scrollToTop();
  }

  const screen = (() => {
    if (tab === 'profile') return <ProfileScreen />;
    if (loading) return <View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.stateText}>Bilgileriniz yükleniyor…</Text></View>;
    if (error) return <View style={styles.state}><Text style={styles.errorTitle}>Bilgiler yüklenemedi</Text><Text style={styles.stateText}>{error}</Text></View>;
    if (tab === 'life') return <LifeScreen demoMode={demoMode} pets={pets} userId={userId} />;
    if (tab === 'nearby') return <NearMeScreen pets={pets} userId={demoMode ? undefined : userId} />;
    if (tab === 'pets') {
      return selectedPet ? (
        <PetDetailScreen
          onBack={() => {
            setSelectedPetId(null);
            scrollToTop();
          }}
          pet={selectedPet}
          records={records}
        />
      ) : (
        <PetsScreen
          onAddPet={addPet}
          onSelectPet={pet => {
            setSelectedPetId(pet.id);
            scrollToTop();
          }}
          pets={pets}
          savingPet={savingPet}
        />
      );
    }
    if (tab === 'health') return <HealthScreen onAddVaccine={addVaccine} pets={pets} records={records} savingVaccine={savingVaccine} />;
    if (tab === 'platform') return <PlatformScreen demoMode={demoMode} pets={pets} records={records} userId={userId} />;
    return <HomeScreen demoMode={demoMode} pets={pets} records={records} userId={userId} />;
  })();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        {screen}
      </ScrollView>
      <View style={styles.tabs}>
        {tabs.map(item => {
          const selected = tab === item.key;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => selectTab(item.key)}
              style={styles.tab}
            >
              {item.key === 'profile' ? (
                <View accessible={false} style={styles.profileIcon}>
                  <View style={[styles.profileHead, selected && styles.profilePartActive]} />
                  <View style={[styles.profileBody, selected && styles.profilePartActive]} />
                </View>
              ) : (
                <Text style={[styles.icon, selected && styles.active]}>{item.icon}</Text>
              )}
              <Text style={[styles.label, selected && styles.active]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 25 },
  state: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 420, padding: 32 },
  stateText: { color: colors.muted, lineHeight: 21, marginTop: 12, textAlign: 'center' },
  errorTitle: { color: colors.danger, fontSize: 18, fontWeight: '800' },
  tabs: { ...shadow, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 10, paddingTop: 9 },
  tab: { alignItems: 'center', flex: 1, gap: 3, minWidth: 0 },
  icon: { color: colors.muted, fontSize: 17 },
  profileIcon: { alignItems: 'center', height: 20, justifyContent: 'center', width: 20 },
  profileHead: { backgroundColor: colors.muted, borderRadius: 4, height: 7, width: 7 },
  profileBody: { backgroundColor: colors.muted, borderTopLeftRadius: 7, borderTopRightRadius: 7, height: 7, marginTop: 2, width: 15 },
  profilePartActive: { backgroundColor: colors.primary },
  label: { color: colors.muted, fontSize: 7, fontWeight: '700' },
  active: { color: colors.primary },
});
