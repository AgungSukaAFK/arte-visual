import React from "react";
import { Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { appThemePalette } from "@/constants/theme";

type Props = {
  isOnline: boolean;
  showLabel?: boolean;
};

export default function OnlineBadge({ isOnline, showLabel = false }: Props) {
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const dotColor = isOnline ? palette.success : palette.textSoft;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
        }}
      />
      {showLabel ? (
        <Text style={{ fontSize: 12, color: dotColor, fontWeight: "600" }}>
          {isOnline ? "Online" : "Offline"}
        </Text>
      ) : null}
    </View>
  );
}
