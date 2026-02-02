import { View, Text, TextInput } from "react-native";
import React from "react";
import { colors } from "../constant/color";
import useFontStyle from "../hooks/useFontLoad";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  style,
  inputStyle,
  keyboardType = "default",
  returnKeyType = "done",
}) {
  const fontsLoaded = useFontStyle();
  if (!fontsLoaded) return null;

  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {/* Label */}
      {label && (
        <Text
          style={{
            fontFamily: "Geist",
            fontSize: 14,
            marginBottom: 6,
            color: colors.darkGray,
          }}
        >
          {label}
        </Text>
      )}

      {/* Input Box */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        autoCapitalize="none"
        style={[
          {
            fontFamily: "Geist",
            fontSize: 15,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.secondary,
            backgroundColor: colors.white,
          },
          inputStyle,
        ]}
      />

      {/* Error */}
      {error && (
        <Text
          style={{
            color: colors.danger,
            marginTop: 5,
            fontSize: 12,
            fontFamily: "Geist",
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
