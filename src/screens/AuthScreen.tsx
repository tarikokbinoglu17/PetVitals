import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import type { SocialProvider } from "../lib/socialAuth";
import { t } from "../lib/i18n";
import { colors } from "../theme";

export function AuthScreen() {
  const { language } = usePreferences();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState("");
  const { signIn, signInWithSocial, signUp, enterDemo } = useAuth();

  const submit = async () => {
    setError("");
    if (register && name.trim().length < 2)
      return setError(
        language === "tr"
          ? "Adınız en az 2 karakter olmalı."
          : language === "de"
            ? "Der Name muss mindestens 2 Zeichen lang sein."
            : language === "es"
              ? "El nombre debe tener al menos 2 caracteres."
              : language === "ja"
                ? "名前は2文字以上で入力してください。"
                : "Name must be at least 2 characters.",
      );
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError(
        language === "tr"
          ? "Geçerli bir e-posta adresi girin."
          : language === "de"
            ? "Bitte geben Sie eine gültige E-Mail-Adresse ein."
            : language === "es"
              ? "Introduce un correo electrónico válido."
              : language === "ja"
                ? "有効なメールアドレスを入力してください。"
                : "Enter a valid email address.",
      );
    if (password.length < 6)
      return setError(
        language === "tr"
          ? "Şifre en az 6 karakter olmalı."
          : language === "de"
            ? "Das Passwort muss mindestens 6 Zeichen lang sein."
            : language === "es"
              ? "La contraseña debe tener al menos 6 caracteres."
              : language === "ja"
                ? "パスワードは6文字以上で入力してください。"
                : "Password must be at least 6 characters.",
      );
    setBusy(true);
    const result = register
      ? await signUp(name, email, password)
      : await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.message)
      Alert.alert(t(language, "Hesap oluştur"), result.message);
  };

  const submitSocial = async (provider: SocialProvider) => {
    setError("");
    setSocialBusy(provider);
    const result = await signInWithSocial(provider);
    setSocialBusy(null);
    if (result.error) setError(result.error);
    if (result.message) Alert.alert("PetSolea", result.message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🐾</Text>
        </View>
        <Text style={styles.brand}>PetSolea</Text>
        <Text style={styles.tagline}>
          {t(language, "Dostunuzun sağlığı, her zaman yanınızda.")}
        </Text>
        <View style={styles.card}>
          <Text style={styles.title}>
            {register
              ? t(language, "Hesap oluştur")
              : t(language, "Tekrar hoş geldiniz")}
          </Text>
          <Text style={styles.subtitle}>
            {register
              ? t(language, "Evcil dostlarınızı takip etmeye başlayın.")
              : t(language, "Bilgilerinize ulaşmak için giriş yapın.")}
          </Text>
          <SocialAuthButtons
            busyProvider={socialBusy}
            disabled={busy}
            onPress={submitSocial}
          />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {t(language, "veya e-posta ile")}
            </Text>
            <View style={styles.dividerLine} />
          </View>
          {register ? (
            <FormField
              autoCapitalize="words"
              label={t(language, "Ad soyad")}
              onChangeText={setName}
              placeholder={t(language, "Ad soyad")}
              value={name}
            />
          ) : null}
          <FormField
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label={t(language, "E-posta")}
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />
          <FormField
            autoCapitalize="none"
            autoComplete={register ? "new-password" : "current-password"}
            label={t(language, "Şifre")}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            value={password}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            loading={busy}
            onPress={submit}
            title={
              register ? t(language, "Kayıt ol") : t(language, "Giriş yap")
            }
          />
          <Pressable
            onPress={() => {
              setRegister(!register);
              setError("");
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {register
                ? t(language, "Zaten hesabınız var mı? Giriş yapın")
                : t(language, "Hesabınız yok mu? Kayıt olun")}
            </Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={enterDemo}>
          <Text style={styles.demo}>
            {t(language, "Uygulamayı demo verileriyle incele →")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 48,
  },
  logo: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logoIcon: { fontSize: 34 },
  brand: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  tagline: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 28,
    marginTop: 5,
    textAlign: "center",
  },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22 },
  title: { color: colors.text, fontSize: 23, fontWeight: "800" },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 22,
    marginTop: 6,
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  switch: { alignItems: "center", padding: 14 },
  switchText: { color: colors.primary, fontWeight: "700" },
  demo: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 22,
    textAlign: "center",
  },
});
