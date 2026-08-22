import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { scanPetDocument } from '../lib/ai';
import type { Pet } from '../types';
import { colors } from '../theme';

export function DocumentScannerPanel({ pet, onClose }: { pet: Pet; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const pickAndScan = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Belge seçmek için fotoğraf erişimi gerekli.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      base64: true,
      quality: 0.75,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.base64) {
      setError('Belge okunamadı. Lütfen yeniden seçin.');
      return;
    }
    setLoading(true);
    try {
      const mime = asset.mimeType || 'image/jpeg';
      const response = await scanPetDocument(pet.id, `data:${mime};base64,${asset.base64}`);
      setResult(response.extraction.extracted_data ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge analizi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}><Text style={styles.title}>▣ {pet.name} Belge Tarama</Text><Pressable onPress={onClose}><Text style={styles.close}>Kapat</Text></Pressable></View>
      <Text style={styles.note}>Aşı karnesi veya veteriner raporunun fotoğrafını seçin. Çıkan bilgiler siz onaylamadan sağlık kaydına eklenmez.</Text>
      <Pressable disabled={loading} onPress={pickAndScan} style={styles.button}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Belge fotoğrafı seç</Text>}</Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <View style={styles.result}><Text style={styles.resultTitle}>İnceleme gerekli</Text>{Object.entries(result).filter(([, value]) => value !== null && value !== '' && value !== undefined).map(([key, value]) => <View key={key} style={styles.row}><Text style={styles.key}>{key}</Text><Text style={styles.value}>{Array.isArray(value) ? value.join(', ') : String(value)}</Text></View>)}<Text style={styles.warning}>Bu bilgiler henüz PetVitals sağlık kaydına işlenmedi.</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 16, padding: 17 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '900' },
  close: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  note: { color: colors.muted, lineHeight: 19, marginTop: 8 },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginTop: 14, minHeight: 48 },
  buttonText: { color: colors.white, fontWeight: '900' },
  error: { color: colors.danger, marginTop: 10 },
  result: { backgroundColor: colors.background, borderRadius: 14, marginTop: 12, padding: 13 },
  resultTitle: { color: colors.primaryDark, fontWeight: '900', marginBottom: 8 },
  row: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 7 },
  key: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, marginTop: 3 },
  warning: { color: colors.accent, fontSize: 11, fontWeight: '800', marginTop: 10 },
});
