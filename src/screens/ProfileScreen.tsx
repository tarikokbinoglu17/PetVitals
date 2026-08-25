import React, { useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentAccount, exportUserData } from '../lib/privacy';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import type { SupportedLocale, UnitSystem } from '../lib/globalization';
import { t } from '../lib/i18n';

const PRIVACY_URL = 'https://html-preview.github.io/?url=https://github.com/tarikokbinoglu17/PetVitals/blob/main/privacy.html';
const DELETE_URL = 'https://html-preview.github.io/?url=https://github.com/tarikokbinoglu17/PetVitals/blob/main/account-deletion.html';
const SUPPORT_URL = 'https://html-preview.github.io/?url=https://github.com/tarikokbinoglu17/PetVitals/blob/main/support.html';

export function ProfileScreen() {
  const { user, demoMode, signOut } = useAuth();
  const { language, unitSystem, setLanguage, setUnitSystem } = usePreferences();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const name = user?.user_metadata?.full_name || (demoMode ? (language === 'tr' ? 'Demo Kullanıcı' : 'Demo User') : 'PetVitals User');

  const handleExport = async () => {
    if (!user?.id || demoMode) { setMessage(language === 'tr' ? 'Veri dışa aktarma gerçek hesapta kullanılabilir.' : 'Data export is available for real accounts.'); return; }
    setBusy('export'); setMessage(null);
    try { const data = await exportUserData(user.id); await Share.share({ message: data, title: 'PetVitals data export' }); }
    catch { setMessage(language === 'tr' ? 'Veriler dışa aktarılamadı. Lütfen tekrar deneyin.' : 'Data could not be exported. Please try again.'); }
    finally { setBusy(null); }
  };

  const handleDelete = () => {
    if (!user?.id || demoMode) { setMessage(language === 'tr' ? 'Hesap silme gerçek hesapta kullanılabilir.' : 'Account deletion is available for real accounts.'); return; }
    Alert.alert(language === 'tr' ? 'Hesabı kalıcı olarak sil?' : 'Delete account permanently?', language === 'tr' ? 'PetVitals hesabınız ve hesabınıza bağlı veriler silinecek. Bu işlem geri alınamaz.' : 'Your PetVitals account and related data will be deleted permanently.', [
      { text: language === 'tr' ? 'Vazgeç' : 'Cancel', style: 'cancel' },
      { text: language === 'tr' ? 'Hesabı sil' : 'Delete account', style: 'destructive', onPress: async () => { setBusy('delete'); setMessage(null); try { await deleteCurrentAccount(); } catch { setMessage(language === 'tr' ? 'Hesap silinemedi. Lütfen tekrar deneyin.' : 'Account could not be deleted.'); setBusy(null); } } },
    ]);
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>{t(language, 'Profil')}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{String(name).charAt(0).toUpperCase()}</Text></View>
      <Text style={styles.name}>{name}</Text><Text style={styles.email}>{user?.email || 'demo@petvitals.app'}</Text>
      <View style={styles.status}><View style={[styles.dot, { backgroundColor: isSupabaseConfigured ? colors.primary : colors.accent }]} /><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{isSupabaseConfigured ? 'Supabase' : 'Demo'}</Text><Text style={styles.statusText}>{isSupabaseConfigured ? (language === 'tr' ? 'Oturumunuz güvenli biçimde saklanıyor.' : 'Your session is stored securely.') : (language === 'tr' ? 'Demo modu etkin.' : 'Demo mode is active.')}</Text></View></View>
      <View style={styles.menu}>
        <Text style={styles.menuText}>🔔  {t(language, 'Bildirim tercihleri')}</Text>
        <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}><Text style={styles.menuText}>🔒  {t(language, 'Gizlilik Politikası')}</Text></Pressable>
        <Pressable onPress={() => void Linking.openURL(DELETE_URL)}><Text style={styles.menuText}>🗑️  {t(language, 'Hesap ve Veri Silme')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShowPreferences(value => !value)}><View style={styles.menuRow}><Text style={[styles.menuText, styles.menuTextFlexible]}>🌍  {t(language, 'Dil ve ölçü birimleri')}</Text><Text style={styles.menuValue}>{language.toUpperCase()} · {unitSystem === 'metric' ? 'kg' : 'lb'}  {showPreferences ? '⌃' : '⌄'}</Text></View></Pressable>
        {showPreferences ? <View style={styles.preferences}>
          <Text style={styles.preferenceTitle}>{t(language, 'Uygulama dili')}</Text>
          <View style={styles.options}>{([['tr','Türkçe'],['en','English'],['de','Deutsch'],['es','Español']] as [SupportedLocale,string][]).map(([value,label]) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: language === value }} key={value} onPress={() => void setLanguage(value)} style={[styles.option, language === value && styles.optionSelected]}><Text style={[styles.optionText, language === value && styles.optionTextSelected]}>{label}</Text></Pressable>)}</View>
          <Text style={styles.preferenceTitle}>{t(language, 'Ölçü birimleri')}</Text>
          <View style={styles.options}>{([['metric','Metric · kg'],['imperial','Imperial · lb']] as [UnitSystem,string][]).map(([value,label]) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: unitSystem === value }} key={value} onPress={() => void setUnitSystem(value)} style={[styles.option, unitSystem === value && styles.optionSelected]}><Text style={[styles.optionText, unitSystem === value && styles.optionTextSelected]}>{label}</Text></Pressable>)}</View>
          <Text style={styles.savedText}>{t(language, 'Seçiminiz otomatik kaydedilir.')}</Text>
        </View> : null}
        <Pressable onPress={() => void Linking.openURL(SUPPORT_URL)}><Text style={styles.menuText}>❓  {t(language, 'Yardım ve destek')}</Text></Pressable>
      </View>
      <View style={styles.privacyBox}><Text style={styles.privacyTitle}>{t(language, 'Verileriniz sizin kontrolünüzde')}</Text><Text style={styles.privacyText}>{language === 'tr' ? 'PetVitals verilerinizi dışa aktarabilir veya hesabınızı uygulama içinden kalıcı olarak silebilirsiniz.' : 'You can export your PetVitals data or permanently delete your account from the app.'}</Text><Pressable disabled={busy !== null} onPress={handleExport} style={styles.linkButton}><Text style={styles.linkText}>{busy === 'export' ? '…' : (language === 'tr' ? 'Verilerimi dışa aktar' : 'Export my data')}</Text></Pressable><Pressable disabled={busy !== null} onPress={handleDelete} style={styles.deleteButton}><Text style={styles.deleteText}>{busy === 'delete' ? '…' : (language === 'tr' ? 'Hesabımı kalıcı olarak sil' : 'Delete my account permanently')}</Text></Pressable>{message ? <Text style={styles.message}>{message}</Text> : null}</View>
      <PrimaryButton onPress={signOut} title={t(language, 'Oturumu kapat')} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({ page:{padding:22},title:{color:colors.text,fontSize:30,fontWeight:'900'},avatar:{alignItems:'center',alignSelf:'center',backgroundColor:colors.primary,borderRadius:44,height:88,justifyContent:'center',marginTop:28,width:88},avatarText:{color:colors.white,fontSize:36,fontWeight:'900'},name:{color:colors.text,fontSize:22,fontWeight:'800',marginTop:13,textAlign:'center'},email:{color:colors.muted,marginTop:4,textAlign:'center'},status:{backgroundColor:colors.surface,borderRadius:18,flexDirection:'row',gap:12,marginTop:26,padding:17},dot:{borderRadius:6,height:12,marginTop:4,width:12},statusTitle:{color:colors.text,fontWeight:'800'},statusText:{color:colors.muted,lineHeight:19,marginTop:4},menu:{backgroundColor:colors.surface,borderRadius:18,marginBottom:14,marginTop:14,paddingHorizontal:17},menuText:{borderBottomColor:colors.border,borderBottomWidth:1,color:colors.text,fontWeight:'600',paddingVertical:17},menuRow:{alignItems:'center',borderBottomColor:colors.border,borderBottomWidth:1,flexDirection:'row'},menuTextFlexible:{borderBottomWidth:0,flex:1},menuValue:{color:colors.primary,fontSize:12,fontWeight:'800'},preferences:{borderBottomColor:colors.border,borderBottomWidth:1,paddingBottom:17},preferenceTitle:{color:colors.text,fontSize:13,fontWeight:'900',marginBottom:9,marginTop:13},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{backgroundColor:colors.background,borderColor:colors.border,borderRadius:999,borderWidth:1,paddingHorizontal:12,paddingVertical:9},optionSelected:{backgroundColor:colors.primary,borderColor:colors.primary},optionText:{color:colors.text,fontSize:12,fontWeight:'800'},optionTextSelected:{color:colors.white},savedText:{color:colors.muted,fontSize:11,marginTop:13},privacyBox:{backgroundColor:colors.surface,borderColor:colors.border,borderRadius:18,borderWidth:1,marginBottom:22,padding:17},privacyTitle:{color:colors.text,fontWeight:'900'},privacyText:{color:colors.muted,lineHeight:19,marginTop:5},linkButton:{paddingVertical:14},linkText:{color:colors.primary,fontWeight:'800'},deleteButton:{paddingVertical:10},deleteText:{color:colors.danger,fontWeight:'800'},message:{color:colors.muted,fontSize:12,marginTop:8} });