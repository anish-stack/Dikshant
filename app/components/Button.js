import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { colors } from "../constant/color";
import useFontStyle from "../hooks/useFontLoad";

export default function Button({ title, onPress, style, textStyle, color }) {
    const fontsLoaded = useFontStyle();

    if (!fontsLoaded) return null;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                {
                    backgroundColor:  colors.primary,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                },
                style,
            ]}
        >
            <Text
                style={[
                    {
                        fontFamily: "Geist",
                        fontSize: 16,
                        color: color || colors.white,
                        fontWeight: "600",
                    },
                    textStyle,
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
}
