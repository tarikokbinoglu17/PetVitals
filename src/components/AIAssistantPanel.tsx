import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { askPetHealthAssistant } from "../lib/ai";
import type { Pet } from "../types";
import { colors } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
const copy = {
  tr: {
    close: "Kapat",
    note: "Sağlık kayıtlarını açıklar ve veteriner görüşmesine hazırlanmanıza yardım eder. Tanı koymaz.",
    placeholder:
      "Örn. Son aşı ve kilo kayıtlarına göre veterinere hangi soruları sormalıyım?",
    ask: "Sor",
    error: "AI yanıtı alınamadı.",
    disclaimer:
      "PetVitals AI eğitim amaçlı destek sunar; veteriner tanısının yerini tutmaz.",
  },
  en: {
    close: "Close",
    note: "Explains health records and helps you prepare for a veterinary visit. It does not diagnose.",
    placeholder:
      "e.g. Based on recent vaccines and weight records, what should I ask my veterinarian?",
    ask: "Ask",
    error: "Could not get an AI response.",
    disclaimer:
      "PetVitals AI provides educational support and does not replace veterinary diagnosis.",
  },
  de: {
    close: "Schließen",
    note: "Erklärt Gesundheitsdaten und hilft bei der Vorbereitung auf den Tierarztbesuch. Keine Diagnose.",
    placeholder:
      "z. B. Welche Fragen sollte ich anhand der letzten Impf- und Gewichtsdaten stellen?",
    ask: "Fragen",
    error: "AI-Antwort konnte nicht geladen werden.",
    disclaimer:
      "PetVitals AI bietet pädagogische Unterstützung und ersetzt keine tierärztliche Diagnose.",
  },
  es: {
    close: "Cerrar",
    note: "Explica los registros de salud y ayuda a preparar la visita veterinaria. No diagnostica.",
    placeholder:
      "p. ej. Según las últimas vacunas y el peso, ¿qué debería preguntar al veterinario?",
    ask: "Preguntar",
    error: "No se pudo obtener una respuesta de IA.",
    disclaimer:
      "PetVitals AI ofrece apoyo educativo y no sustituye el diagnóstico veterinario.",
  },
  ja: {
    close: "閉じる",
    note: "健康記録を説明し、動物病院の受診準備を支援します。診断は行いません。",
    placeholder:
      "例：最近のワクチンと体重記録について、獣医師に何を質問すべきですか？",
    ask: "質問する",
    error: "AIの回答を取得できませんでした。",
    disclaimer:
      "PetVitals AIは情報提供を目的としており、獣医師の診断に代わるものではありません。",
  },
} as const;
export function AIAssistantPanel({
  pet,
  onClose,
}: {
  pet: Pet;
  onClose: () => void;
}) {
  const { language } = usePreferences();
  const c = copy[language];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const value = question.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const result = await askPetHealthAssistant(pet.id, value);
      setAnswer(result.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>✦ {pet.name} AI Health Assistant</Text>
        <Pressable onPress={onClose}>
          <Text style={styles.close}>{c.close}</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>{c.note}</Text>
      <TextInput
        multiline
        onChangeText={setQuestion}
        placeholder={c.placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={question}
      />
      <Pressable
        disabled={loading || !question.trim()}
        onPress={submit}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>{c.ask}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {answer ? (
        <View style={styles.answer}>
          <Text style={styles.answerText}>{answer}</Text>
          <Text style={styles.disclaimer}>{c.disclaimer}</Text>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 17,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  close: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  note: { color: colors.muted, lineHeight: 19, marginTop: 8 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    marginTop: 14,
    minHeight: 100,
    padding: 13,
    textAlignVertical: "top",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48,
  },
  buttonText: { color: colors.white, fontWeight: "900" },
  error: { color: colors.danger, marginTop: 10 },
  answer: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  answerText: { color: colors.text, lineHeight: 21 },
  disclaimer: { color: colors.muted, fontSize: 11, marginTop: 10 },
});
