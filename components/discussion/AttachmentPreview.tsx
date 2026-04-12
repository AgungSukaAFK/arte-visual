import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import { useColorScheme } from "nativewind";
import { appThemePalette } from "@/constants/theme";

type Props = {
  url: string;
  type: "image" | "file";
  name?: string | null;
};

export default function AttachmentPreview({ url, type, name }: Props) {
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  if (type === "image") {
    return (
      <>
        <Pressable
          onPress={() => setIsImageOpen(true)}
          style={{ marginTop: 8 }}
        >
          <Image
            source={{ uri: url }}
            resizeMode="cover"
            style={{
              width: 140,
              height: 96,
              borderRadius: 10,
              backgroundColor: palette.surfaceMuted,
            }}
          />
        </Pressable>

        <Modal
          visible={isImageOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.92)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Pressable
              onPress={() => setIsImageOpen(false)}
              style={{ position: "absolute", top: 48, right: 20, zIndex: 2 }}
            >
              <Ionicons name="close-circle" size={34} color="#fff" />
            </Pressable>

            <Image
              source={{ uri: url }}
              resizeMode="contain"
              style={{ width: "100%", height: "80%" }}
            />
          </View>
        </Modal>
      </>
    );
  }

  const openFile = async () => {
    if (isOpeningFile) return;

    try {
      if (Platform.OS === "web") {
        await Linking.openURL(url);
        return;
      }

      setIsOpeningFile(true);

      const safeName = (name || `attachment_${Date.now()}`)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .trim();
      const localUri = `${FileSystem.cacheDirectory}${safeName}`;

      await FileSystem.downloadAsync(url, localUri);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Tidak didukung",
          "Perangkat tidak mendukung pilihan aplikasi file.",
        );
        return;
      }

      await Sharing.shareAsync(localUri, {
        dialogTitle: "Buka lampiran dengan",
      });
    } catch {
      Alert.alert("Gagal membuka file", "Lampiran tidak bisa dibuka saat ini.");
    } finally {
      setIsOpeningFile(false);
    }
  };

  return (
    <Pressable
      onPress={openFile}
      disabled={isOpeningFile}
      style={{
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.borderSubtle,
        backgroundColor: palette.surfaceMuted,
        opacity: isOpeningFile ? 0.7 : 1,
      }}
    >
      <Ionicons name="attach-outline" size={16} color={palette.icon} />
      <Text
        style={{ color: palette.textStrong, fontWeight: "500", maxWidth: 220 }}
        numberOfLines={1}
      >
        {name || "File attachment"}
      </Text>
    </Pressable>
  );
}
