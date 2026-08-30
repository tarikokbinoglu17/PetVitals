import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { deleteCurrentAccount, exportUserData } from "../lib/privacy";
import { isSupabaseConfigured } from "../lib/supabase";
import { colors } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import type { SupportedLocale, UnitSystem } from "../lib/globalization";
import { t } from "../lib/i18n";

const PUBLIC_SITE = "https://tarikokbinoglu17.github.io/Pawly";

const copy = {
  tr: {
    demoUser: "Demo Kullanıcı",
    user: "Pawly Kullanıcısı",
    exportReal: "Veri dışa aktarma gerçek hesapta kullanılabilir.",
    exportFail: "Veriler dışa aktarılamadı. Lütfen tekrar deneyin.",
    deleteReal: "Hesap silme gerçek hesapta kullanılabilir.",
    deleteTitle: "Hesabı kalıcı olarak sil?",
    deleteBody:
      "Pawly hesabınız ve hesabınıza bağlı veriler silinecek. Bu işlem geri alınamaz.",
    cancel: "Vazgeç",
    delete: "Hesabı sil",
    deleteFail: "Hesap silinemedi. Lütfen tekrar deneyin.",
    secure: "Oturumunuz güvenli biçimde saklanıyor.",
    demo: "Demo modu etkin.",
    demoTitle: "Demo",
    privacy:
      "Pawly verilerinizi dışa aktarabilir veya hesabınızı uygulama içinden kalıcı olarak silebilirsiniz.",
    export: "Verilerimi dışa aktar",
    deleteForever: "Hesabımı kalıcı olarak sil",
    metric: "Metrik · kg",
    imperial: "İngiliz · lb",
    exportTitle: "Pawly veri dışa aktarımı",
  },
  en: {
    demoUser: "Demo User",
    user: "Pawly User",
    exportReal: "Data export is available for real accounts.",
    exportFail: "Data could not be exported. Please try again.",
    deleteReal: "Account deletion is available for real accounts.",
    deleteTitle: "Delete account permanently?",
    deleteBody:
      "Your Pawly account and related data will be deleted permanently. This cannot be undone.",
    cancel: "Cancel",
    delete: "Delete account",
    deleteFail: "Account could not be deleted. Please try again.",
    secure: "Your session is stored securely.",
    demo: "Demo mode is active.",
    demoTitle: "Demo",
    privacy:
      "You can export your Pawly data or permanently delete your account from the app.",
    export: "Export my data",
    deleteForever: "Delete my account permanently",
    metric: "Metric · kg",
    imperial: "Imperial · lb",
    exportTitle: "Pawly data export",
  },
  de: {
    demoUser: "Demo-Benutzer",
    user: "Pawly-Benutzer",
    exportReal: "Der Datenexport ist für echte Konten verfügbar.",
    exportFail:
      "Daten konnten nicht exportiert werden. Bitte erneut versuchen.",
    deleteReal: "Die Kontolöschung ist für echte Konten verfügbar.",
    deleteTitle: "Konto dauerhaft löschen?",
    deleteBody:
      "Ihr Pawly-Konto und die zugehörigen Daten werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
    cancel: "Abbrechen",
    delete: "Konto löschen",
    deleteFail: "Konto konnte nicht gelöscht werden. Bitte erneut versuchen.",
    secure: "Ihre Sitzung wird sicher gespeichert.",
    demo: "Demo-Modus ist aktiv.",
    demoTitle: "Demo",
    privacy:
      "Sie können Ihre Pawly-Daten exportieren oder Ihr Konto in der App dauerhaft löschen.",
    export: "Meine Daten exportieren",
    deleteForever: "Mein Konto dauerhaft löschen",
    metric: "Metrisch · kg",
    imperial: "Imperial · lb",
    exportTitle: "Pawly-Datenexport",
  },
  es: {
    demoUser: "Usuario demo",
    user: "Usuario de Pawly",
    exportReal: "La exportación de datos está disponible para cuentas reales.",
    exportFail: "No se pudieron exportar los datos. Inténtalo de nuevo.",
    deleteReal: "La eliminación de cuenta está disponible para cuentas reales.",
    deleteTitle: "¿Eliminar la cuenta permanentemente?",
    deleteBody:
      "Tu cuenta de Pawly y los datos relacionados se eliminarán de forma permanente. Esta acción no se puede deshacer.",
    cancel: "Cancelar",
    delete: "Eliminar cuenta",
    deleteFail: "No se pudo eliminar la cuenta. Inténtalo de nuevo.",
    secure: "Tu sesión se almacena de forma segura.",
    demo: "El modo demo está activo.",
    demoTitle: "Demo",
    privacy:
      "Puedes exportar tus datos de Pawly o eliminar permanentemente tu cuenta desde la app.",
    export: "Exportar mis datos",
    deleteForever: "Eliminar mi cuenta permanentemente",
    metric: "Métrico · kg",
    imperial: "Imperial · lb",
    exportTitle: "Exportación de datos de Pawly",
  },
  ja: {
    demoUser: "デモユーザー",
    user: "Pawlyユーザー",
    exportReal: "データの書き出しは実アカウントで利用できます。",
    exportFail: "データを書き出せませんでした。もう一度お試しください。",
    deleteReal: "アカウント削除は実アカウントで利用できます。",
    deleteTitle: "アカウントを完全に削除しますか？",
    deleteBody:
      "Pawlyアカウントと関連データは完全に削除されます。この操作は元に戻せません。",
    cancel: "キャンセル",
    delete: "アカウントを削除",
    deleteFail: "アカウントを削除できませんでした。もう一度お試しください。",
    secure: "セッションは安全に保存されています。",
    demo: "デモモードが有効です。",
    demoTitle: "デモ",
    privacy:
      "アプリ内でPawlyデータを書き出したり、アカウントを完全に削除できます。",
    export: "データを書き出す",
    deleteForever: "アカウントを完全に削除",
    metric: "メートル法 · kg",
    imperial: "ヤード・ポンド法 · lb",
    exportTitle: "Pawlyデータの書き出し",
  },
} as const;

export function ProfileScreen() {
  const { user, demoMode, signOut } = useAuth();
  const { language, unitSystem, setLanguage, setUnitSystem } = usePreferences();
  const c = copy[language];
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const name =
    user?.user_metadata?.full_name || (demoMode ? c.demoUser : c.user);
  const hasLiveSession = Boolean(
    user?.id && !demoMode && isSupabaseConfigured,
  );

  const handleExport = async () => {
    if (!user?.id || demoMode) {
      setMessage(c.exportReal);
      return;
    }
    setBusy("export");
    setMessage(null);
    try {
      const data = await exportUserData(user.id);
      await Share.share({ message: data, title: c.exportTitle });
    } catch {
      setMessage(c.exportFail);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    if (!user?.id || demoMode) {
      setMessage(c.deleteReal);
      return;
    }
    Alert.alert(c.deleteTitle, c.deleteBody, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          setMessage(null);
          try {
            await deleteCurrentAccount();
          } catch {
            setMessage(c.deleteFail);
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>{t(language, "Profil")}</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {String(name).charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{user?.email || "demo@pawly.app"}</Text>
      <View style={styles.status}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: hasLiveSession ? colors.primary : colors.accent,
            },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>
            {hasLiveSession ? "Supabase" : c.demoTitle}
          </Text>
          <Text style={styles.statusText}>
            {hasLiveSession ? c.secure : c.demo}
          </Text>
        </View>
      </View>
      <View style={styles.menu}>
        <Text style={styles.menuText}>
          🔔 {t(language, "Bildirim tercihleri")}
        </Text>
        <Pressable
          onPress={() =>
            void Linking.openURL(`${PUBLIC_SITE}/privacy.html?lang=${language}`)
          }
        >
          <Text style={styles.menuText}>
            🔒 {t(language, "Gizlilik Politikası")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            void Linking.openURL(
              `${PUBLIC_SITE}/account-deletion.html?lang=${language}`,
            )
          }
        >
          <Text style={styles.menuText}>
            🗑️ {t(language, "Hesap ve Veri Silme")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPreferences((value) => !value)}
        >
          <View style={styles.menuRow}>
            <Text style={[styles.menuText, styles.menuTextFlexible]}>
              🌍 {t(language, "Dil ve ölçü birimleri")}
            </Text>
            <Text style={styles.menuValue}>
              {language.toUpperCase()} · {unitSystem === "metric" ? "kg" : "lb"}{" "}
              {showPreferences ? "⌃" : "⌄"}
            </Text>
          </View>
        </Pressable>
        {showPreferences ? (
          <View style={styles.preferences}>
            <Text style={styles.preferenceTitle}>
              {t(language, "Uygulama dili")}
            </Text>
            <View style={styles.options}>
              {(
                [
                  ["tr", "Türkçe"],
                  ["en", "English"],
                  ["de", "Deutsch"],
                  ["es", "Español"],
                  ["ja", "日本語"],
                ] as [SupportedLocale, string][]
              ).map(([value, label]) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: language === value }}
                  key={value}
                  onPress={() => void setLanguage(value)}
                  style={[
                    styles.option,
                    language === value && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      language === value && styles.optionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.preferenceTitle}>
              {t(language, "Ölçü birimleri")}
            </Text>
            <View style={styles.options}>
              {(
                [
                  ["metric", c.metric],
                  ["imperial", c.imperial],
                ] as [UnitSystem, string][]
              ).map(([value, label]) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: unitSystem === value }}
                  key={value}
                  onPress={() => void setUnitSystem(value)}
                  style={[
                    styles.option,
                    unitSystem === value && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      unitSystem === value && styles.optionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.savedText}>
              {t(language, "Seçiminiz otomatik kaydedilir.")}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={() =>
            void Linking.openURL(`${PUBLIC_SITE}/support.html?lang=${language}`)
          }
        >
          <Text style={styles.menuText}>
            ❓ {t(language, "Yardım ve destek")}
          </Text>
        </Pressable>
      </View>
      <View style={styles.privacyBox}>
        <Text style={styles.privacyTitle}>
          {t(language, "Verileriniz sizin kontrolünüzde")}
        </Text>
        <Text style={styles.privacyText}>{c.privacy}</Text>
        <Pressable
          disabled={busy !== null}
          onPress={handleExport}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            {busy === "export" ? "…" : c.export}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy !== null}
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>
            {busy === "delete" ? "…" : c.deleteForever}
          </Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      <PrimaryButton
        onPress={signOut}
        title={t(language, "Oturumu kapat")}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    marginTop: 28,
    width: 88,
  },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: "900" },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 13,
    textAlign: "center",
  },
  email: { color: colors.muted, marginTop: 4, textAlign: "center" },
  status: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    marginTop: 26,
    padding: 17,
  },
  dot: { borderRadius: 6, height: 12, marginTop: 4, width: 12 },
  statusTitle: { color: colors.text, fontWeight: "800" },
  statusText: { color: colors.muted, lineHeight: 19, marginTop: 4 },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: 14,
    marginTop: 14,
    paddingHorizontal: 17,
  },
  menuText: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    color: colors.text,
    fontWeight: "600",
    paddingVertical: 17,
  },
  menuRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  menuTextFlexible: { borderBottomWidth: 0, flex: 1 },
  menuValue: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  preferences: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 17,
  },
  preferenceTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 9,
    marginTop: 13,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  optionTextSelected: { color: colors.white },
  savedText: { color: colors.muted, fontSize: 11, marginTop: 13 },
  privacyBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 22,
    padding: 17,
  },
  privacyTitle: { color: colors.text, fontWeight: "900" },
  privacyText: { color: colors.muted, lineHeight: 19, marginTop: 5 },
  linkButton: { paddingVertical: 14 },
  linkText: { color: colors.primary, fontWeight: "800" },
  deleteButton: { paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: "800" },
  message: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
