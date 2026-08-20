import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabName } from '../types';
import { colors, shadow } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { PetsScreen } from '../screens/PetsScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const tabs: { key: TabName; label: string; icon: string }[] = [{ key: 'home', label: 'Ana sayfa', icon: '⌂' }, { key: 'pets', label: 'Dostlarım', icon: '🐾' }, { key: 'health', label: 'Sağlık', icon: '♥' }, { key: 'profile', label: 'Profil', icon: '☺' }];
const screens = { home: HomeScreen, pets: PetsScreen, health: HealthScreen, profile: ProfileScreen };
export function AppShell() { const [tab, setTab] = useState<TabName>('home'); const Screen = screens[tab]; return <SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}><Screen /></ScrollView><View style={styles.tabs}>{tabs.map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} key={item.key} onPress={() => setTab(item.key)} style={styles.tab}><Text style={[styles.icon, tab === item.key && styles.active]}>{item.icon}</Text><Text style={[styles.label, tab === item.key && styles.active]}>{item.label}</Text></Pressable>)}</View></SafeAreaView>; }
const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 25 }, tabs: { ...shadow, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 10, paddingTop: 9 }, tab: { alignItems: 'center', flex: 1, gap: 3 }, icon: { color: colors.muted, fontSize: 21 }, label: { color: colors.muted, fontSize: 10, fontWeight: '700' }, active: { color: colors.primary } });

