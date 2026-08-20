import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';

export function ProfileScreen() {
  const { user, demoMode, signOut } = useAuth();
  const name = user?.user_metadata?.full_name || (demoMode ? 'Demo Kullanıcı' : 'PetVitals Kullanıcısı');
  return <View style={styles.page}><Text style={styles.title}>Profil</Text><View style={styles.avatar}><Text style={styles.avatarText}>{String(name).charAt(0).toUpperCase()}</Text></View><Text style={styles.name}>{name}</Text><Text style={styles.email}>{user?.email || 'demo@petvitals.app'}</Text><View style={styles.status}><View style={[styles.dot, { backgroundColor: isSupabaseConfigured ? colors.primary : colors.accent }]} /><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{isSupabaseConfigured ? 'Supabase bağlı' : 'Demo modu'}</Text><Text style={styles.statusText}>{isSupabaseConfigured ? 'Oturumunuz güvenli biçimde saklanıyor.' : '.env ayarları eklendiğinde gerçek kimlik doğrulama etkinleşir.'}</Text></View></View><View style={styles.menu}><Text style={styles.menuText}>🔔  Bildirim tercihleri</Text><Text style={styles.menuText}>🔒  Gizlilik ve güvenlik</Text><Text style={styles.menuText}>❓  Yardım ve destek</Text></View><PrimaryButton onPress={signOut} title="Oturumu kapat" variant="secondary" /></View>;
}
const styles = StyleSheet.create({ page: { padding: 22 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, avatar: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderRadius: 44, height: 88, justifyContent: 'center', marginTop: 28, width: 88 }, avatarText: { color: colors.white, fontSize: 36, fontWeight: '900' }, name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 13, textAlign: 'center' }, email: { color: colors.muted, marginTop: 4, textAlign: 'center' }, status: { backgroundColor: colors.surface, borderRadius: 18, flexDirection: 'row', gap: 12, marginTop: 26, padding: 17 }, dot: { borderRadius: 6, height: 12, marginTop: 4, width: 12 }, statusTitle: { color: colors.text, fontWeight: '800' }, statusText: { color: colors.muted, lineHeight: 19, marginTop: 4 }, menu: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: 22, marginTop: 14, paddingHorizontal: 17 }, menuText: { borderBottomColor: colors.border, borderBottomWidth: 1, color: colors.text, fontWeight: '600', paddingVertical: 17 } });

