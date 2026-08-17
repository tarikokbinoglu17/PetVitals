import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface TextFieldProps extends TextInputProps {
  label: string;
  errorText?: string | null;
}

export function TextField({ label, errorText, style, ...inputProps }: TextFieldProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: errorText ? colors.danger : colors.border,
            backgroundColor: colors.surface,
          },
          style,
        ]}
        {...inputProps}
      />
      {errorText ? <Text style={[styles.error, { color: colors.danger }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: { fontSize: 12 },
});
