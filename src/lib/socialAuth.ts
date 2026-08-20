import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type SocialProvider = 'apple' | 'google';
export type SocialAuthResult = { error?: string; message?: string };

const appleAuthEnabled = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true';
const googleAuthEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

WebBrowser.maybeCompleteAuthSession();

function providerIsEnabled(provider: SocialProvider) {
  return provider === 'apple' ? appleAuthEnabled : googleAuthEnabled;
}

function pendingConfigurationMessage(provider: SocialProvider) {
  if (provider === 'apple') {
    return 'Apple ile giriş uygulamaya eklendi. Apple Developer üyeliği ve Supabase sağlayıcı ayarı tamamlandığında etkinleşecek.';
  }

  return 'Google ile giriş uygulamaya eklendi. Google OAuth bilgileri Supabase’e bağlandığında etkinleşecek.';
}

async function createSessionFromUrl(url: string): Promise<SocialAuthResult> {
  if (!supabase) return { error: 'Supabase ayarları eksik.' };

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { error: errorCode };

  if (typeof params.code === 'string') {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    return error ? { error: error.message } : {};
  }

  const accessToken = typeof params.access_token === 'string' ? params.access_token : undefined;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

  if (!accessToken || !refreshToken) {
    return { error: 'Giriş tamamlandı ancak güvenli oturum bilgisi alınamadı.' };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return error ? { error: error.message } : {};
}

async function signInWithGoogle(): Promise<SocialAuthResult> {
  if (!supabase) return { error: 'Supabase ayarları eksik. Demo modu ile devam edebilirsiniz.' };

  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: 'Google giriş adresi oluşturulamadı.' };

  const response = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (response.type !== 'success') return {};
  return createSessionFromUrl(response.url);
}

async function signInWithApple(): Promise<SocialAuthResult> {
  if (!supabase) return { error: 'Supabase ayarları eksik. Demo modu ile devam edebilirsiniz.' };
  if (Platform.OS !== 'ios') return { message: 'Apple ile giriş iPhone sürümünde kullanılacak.' };

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) return { error: 'Apple ile giriş bu cihazda kullanılamıyor.' };

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) return { error: 'Apple kimlik bilgisi alınamadı.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { error: error.message };

    const givenName = credential.fullName?.givenName ?? undefined;
    const middleName = credential.fullName?.middleName ?? undefined;
    const familyName = credential.fullName?.familyName ?? undefined;
    const fullName = [givenName, middleName, familyName].filter(Boolean).join(' ');

    if (fullName) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName,
          family_name: familyName,
        },
      });
      if (updateError) return { error: updateError.message };
    }

    return {};
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return {};
    return { error: error instanceof Error ? error.message : 'Apple ile giriş tamamlanamadı.' };
  }
}

export async function signInWithSocialProvider(provider: SocialProvider): Promise<SocialAuthResult> {
  if (!providerIsEnabled(provider)) return { message: pendingConfigurationMessage(provider) };
  return provider === 'apple' ? signInWithApple() : signInWithGoogle();
}
