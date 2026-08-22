import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentAccount, exportUserData } from '../lib/privacy';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';

export function ProfileScreen() {
  const { user, demoMode, signOut } = useAuth();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const name = user?.user_metadata?.full_name || (demoMode ? 'Demo Kullanıcı' : 'PetVitals Kullanıcısı');

  const handleExport = async () => {
    if (!user?.id || demoMode) {
      setMessage('Veri dışa aktarma gerçek hesapta kullanılabilir.');
      return;
    }
    setBusy('export');
    setMessage(null);
    try {
      const data = await exportUserData(user.id);
      await Share.share({ message: data, title: 'PetVitals veri dışa aktarma' });
    } catch {
      setMessage('Veriler dışa aktarılamadı. Lütfen tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    if (!user?.id || demoMode) {
      setMessage('Hesap silme gerçek hesapta kullanılabilir.');
      return;
    }
    Alert.alert(
      'Hesabı kalıcı olarak sil?',
      'PetVitals hesabınız ve hesabınıza bağlı veriler silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabı sil',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            setMessage(null);
            try {
              await deleteCurrentAccount();
            } catch {
              setMessage('Hesap silinemedi. Lütfen tekrar deneyin.');
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{String(name).charAt(0).toUpperCase()}</Text></View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{user?.email || 'demo@petvitals.app'}</Text>

      <View style={styles.status}>
        <View style={[styles.dot, { backgroundColor: isSupabaseConfigured ? colors.primary : colors.accent }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{isSupabaseConfigured ? 'Supabase bağlı' : 'Demo modu'}</Text>
          <Text style={styles.statusText}>{isSupabaseConfigured ? 'Oturumunuz güvenli biçimde saklanıyor.' : '.env ayarları eklendiğinde gerçek kimlik doğrulama etkinleşir.'}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <Text style={styles.menuText}>🔔  Bildirim tercihleri</Text>
        <Text style={styles.menuText}>🔒  Gizlilik ve güvenlik</Text>
        <Text style={styles.menuText}>🌍  Dil ve ölçü birimleri</Text>
        <Text style={styles.menuText}>❓  Yardım ve destek</Text>
      </View>

      <View style={styles.privacyBox}>
        <Text style={styles.privacyTitle}>Verileriniz sizin kontrolünüzde</Text>
        <Text style={styles.privacyText}>PetVitals verilerinizi dışa aktarabilir veya hesabınızı uygulama içinden kalıcı olarak silebilirsiniz.</Text>
        <Pressable disabled={busy !== null} onPress={handleExport} style={styles.linkButton}>
          <Text style={styles.linkText}>{busy === 'export' ? 'Hazırlanıyor…' : 'Verilerimi dışa aktar'}</Text>
        </Pressable>
        <Pressable disabled={busy !== null} onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{busy === 'delete' ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <PrimaryButton onPress={signOut} title="Oturumu kapat" variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  avatar: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderRadius: 44, height: 88, justifyContent: 'center', marginTop: 28, width: 88 },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: '900' },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 13, textAlign: 'center' },
  email: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  status: { backgroundColor: colors.surface, borderRadius: 18, flexDirection: 'row', gap: 12, marginTop: 26, padding: 17 },
  dot: { borderRadius: 6, height: 12, marginTop: 4, width: 12 },
  statusTitle: { color: colors.text, fontWeight: '800' },
  statusText: { color: colors.muted, lineHeight: 19, marginTop: 4 },
  menu: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: 14, marginTop: 14, paddingHorizontal: 17 },
  menuText: { borderBottomColor: colors.border, borderBottomWidth: 1, color: colors.text, fontWeight: '600', paddingVertical: 17 },
  privacyBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 22, padding: 17 },
  privacyTitle: { color: colors.text, fontWeight: '900' },
  privacyText: { color: colors.muted, lineHeight: 19, marginTop: 5 },
  linkButton: { paddingVertical: 14 },
  linkText: { color: colors.primary, fontWeight: '800' },
  deleteButton: { paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: '800' },
  message: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
