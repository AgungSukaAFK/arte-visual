import React, { useState } from "react";
import { FlatList, Dimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useColorScheme } from "nativewind";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Image } from "@/components/ui/image";

const screenWidth = Dimensions.get("window").width;
const padding = 24;
const gap = 12;
const itemSize = (screenWidth - padding * 2 - gap) / 2;

export default function GalleryScreen() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useFocusEffect(
    React.useCallback(() => {
      fetchGallery();
    }, []),
  );

  const fetchGallery = async () => {
    setLoading(true);
    // Hanya ambil yang is_active = true agar foto yang disembunyikan Admin tidak muncul
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) setMediaList(data);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isVideo = item.media_type === "video";

    return (
      <Box
        style={{ width: itemSize, height: itemSize }}
        className="mb-3 rounded-2xl overflow-hidden bg-outline-100 shadow-soft-1 relative"
      >
        {/* MEDIA: Menggunakan absolute w-full h-full agar tidak ciut */}
        {isVideo ? (
          <Video
            source={{ uri: item.media_url }}
            className="absolute w-full h-full"
            style={{ width: "100%", height: "100%" }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping={false}
          />
        ) : (
          <Image
            source={{ uri: item.media_url }}
            alt={item.caption || "Gallery Image"}
            className="absolute w-full h-full"
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        )}

        {/* INDIKATOR VIDEO: Agar klien tau ini bisa di-play */}
        {isVideo && (
          <Box className="absolute top-2 right-2 bg-typography-900/60 p-1.5 rounded-full pointer-events-none">
            <Ionicons name="play" size={12} color="#FFFFFF" />
          </Box>
        )}

        {/* LABEL OVERLAY: Menampilkan Kategori dan Caption */}
        <VStack className="absolute bottom-0 left-0 right-0 bg-typography-900/80 p-2 pointer-events-none">
          {item.category && (
            <Text className="text-primary-400 text-[9px] font-bold uppercase tracking-wider">
              {item.category}
            </Text>
          )}
          <Text
            className="text-typography-0 text-[11px] font-bold"
            numberOfLines={1}
          >
            {item.caption || "Portofolio Arte"}
          </Text>
        </VStack>
      </Box>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {/* Header Sticky */}
      <VStack className="px-6 pt-8 pb-4 bg-background-50 z-10 gap-1">
        <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
          Portofolio Kami
        </Text>
        <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
          Arte Gallery.
        </Heading>
      </VStack>

      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : (
        <FlatList
          data={mediaList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 80,
            paddingTop: 10,
          }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Center className="flex-1 py-20 px-6">
              <Ionicons
                name="images-outline"
                size={64}
                color={isDark ? "#404040" : "#D4D4D4"}
              />
              <Text className="text-typography-500 mt-4 text-center">
                Galeri masih kosong.{"\n"}Admin akan segera mengunggah karya
                terbaik kami.
              </Text>
            </Center>
          }
        />
      )}
    </SafeAreaView>
  );
}
