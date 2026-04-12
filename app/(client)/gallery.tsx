import React, { useMemo, useState } from "react";
import {
  FlatList,
  Dimensions,
  ScrollView,
  Image as RNImage,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";

const screenWidth = Dimensions.get("window").width;
const padding = 24;
const gap = 12;
const itemSize = (screenWidth - padding * 2 - gap) / 2;

export default function GalleryScreen() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<"all" | "image" | "video">(
    "all",
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
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

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    mediaList.forEach((item) => {
      if (item.category) uniqueCategories.add(String(item.category));
    });
    return ["all", ...Array.from(uniqueCategories)];
  }, [mediaList]);

  const filteredMedia = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return mediaList.filter((item) => {
      const matchType = activeType === "all" || item.media_type === activeType;
      const matchCategory =
        activeCategory === "all" || item.category === activeCategory;
      const searchableText = [item.caption, item.category, item.media_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchKeyword = !keyword || searchableText.includes(keyword);

      return matchType && matchCategory && matchKeyword;
    });
  }, [mediaList, activeType, activeCategory, searchQuery]);

  const openDetailModal = (item: any) => {
    setSelectedMedia(item);
    setShowDetailModal(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isVideo = item.media_type === "video";

    return (
      <Pressable
        onPress={() => openDetailModal(item)}
        style={{ width: itemSize, height: itemSize }}
        className="mb-3 overflow-hidden rounded-3xl border border-outline-100 bg-background-0 shadow-soft-2 active:scale-[0.98]"
      >
        {isVideo ? (
          <Video
            source={{ uri: item.media_url }}
            className="absolute w-full h-full"
            style={{ width: "100%", height: "100%" }}
            shouldPlay={false}
            isMuted
            resizeMode={ResizeMode.COVER}
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

        <Box className="absolute left-2 top-2 rounded-full border border-background-0/30 bg-typography-900/75 px-2.5 py-1.5 pointer-events-none">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-typography-0">
            {isVideo ? "Video" : "Foto"}
          </Text>
        </Box>

        {isVideo && (
          <Box className="absolute right-2 top-2 rounded-full bg-typography-900/70 p-2 pointer-events-none">
            <Ionicons name="play" size={15} color="#FFFFFF" />
          </Box>
        )}

        <VStack className="absolute bottom-0 left-0 right-0 bg-typography-900/80 px-3 py-2.5 pointer-events-none">
          {item.category && (
            <Text className="text-primary-300 text-[10px] font-bold uppercase tracking-widest">
              {item.category}
            </Text>
          )}
          <Text
            className="text-typography-0 text-xs font-extrabold"
            numberOfLines={1}
          >
            {item.caption || "Portofolio Arte"}
          </Text>
        </VStack>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : (
        <FlatList
          data={filteredMedia}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          ListHeaderComponent={
            <VStack className="px-6 pt-8 pb-3 gap-3">
              <VStack className="gap-1">
                <Text className="text-typography-500 text-sm font-medium uppercase tracking-widest">
                  Portofolio Kami
                </Text>
                <Heading className="text-3xl font-extrabold tracking-tight text-typography-900">
                  Arte Gallery.
                </Heading>
              </VStack>

              <Box
                className="rounded-3xl border border-outline-100 p-4"
                style={{ backgroundColor: theme.accentSoft }}
              >
                <HStack className="items-center justify-between">
                  <VStack>
                    <Text className="text-xs font-bold uppercase tracking-widest text-typography-500">
                      Koleksi Aktif
                    </Text>
                    <Heading className="text-3xl font-black text-typography-900">
                      {mediaList.length}
                    </Heading>
                  </VStack>
                  <HStack className="gap-4">
                    <VStack className="items-end">
                      <Text className="text-[10px] text-typography-500">
                        Foto
                      </Text>
                      <Text className="text-lg font-black text-typography-900">
                        {
                          mediaList.filter(
                            (item) => item.media_type === "image",
                          ).length
                        }
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-[10px] text-typography-500">
                        Video
                      </Text>
                      <Text className="text-lg font-black text-typography-900">
                        {
                          mediaList.filter(
                            (item) => item.media_type === "video",
                          ).length
                        }
                      </Text>
                    </VStack>
                  </HStack>
                </HStack>
              </Box>

              <Input
                size="md"
                variant="outline"
                className="rounded-2xl border-outline-100 bg-background-0"
              >
                <InputSlot className="pl-3">
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={theme.textSoft}
                  />
                </InputSlot>
                <InputField
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari caption atau kategori"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Input>

              <HStack className="gap-2">
                {(
                  [
                    { key: "all", label: "Semua" },
                    { key: "image", label: "Foto" },
                    { key: "video", label: "Video" },
                  ] as const
                ).map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setActiveType(item.key)}
                    className={`rounded-full px-3.5 py-2 ${
                      activeType === item.key
                        ? "bg-primary-500"
                        : "bg-background-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        activeType === item.key
                          ? "text-typography-0"
                          : "text-typography-600"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </HStack>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 4 }}
              >
                <HStack className="gap-2">
                  {categories.map((item) => {
                    const isActive = activeCategory === item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setActiveCategory(item)}
                        className={`rounded-full border px-3.5 py-2 ${
                          isActive
                            ? "border-primary-300 bg-primary-50"
                            : "border-outline-100 bg-background-0"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isActive
                              ? "text-primary-700"
                              : "text-typography-600"
                          }`}
                        >
                          {item === "all" ? "Semua Kategori" : item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </ScrollView>
            </VStack>
          }
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 80,
            paddingTop: 0,
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
                {mediaList.length === 0
                  ? "Galeri masih kosong.\nAdmin akan segera mengunggah karya terbaik kami."
                  : "Tidak ada hasil yang cocok dengan filter atau pencarian Anda."}
              </Text>
              {mediaList.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery("");
                    setActiveType("all");
                    setActiveCategory("all");
                  }}
                  className="mt-4 rounded-full bg-typography-900 px-4 py-2"
                >
                  <Text className="text-xs font-bold text-typography-0">
                    Reset Filter
                  </Text>
                </Pressable>
              ) : null}
            </Center>
          }
        />
      )}

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent className="w-[92%] rounded-3xl bg-background-0 p-2">
          <ModalHeader className="px-4 pb-2 pt-3">
            <VStack className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                Detail Media
              </Text>
              <Heading
                className="text-base font-black text-typography-900"
                numberOfLines={1}
              >
                {selectedMedia?.caption || "Portofolio Arte Visual"}
              </Heading>
            </VStack>
            <ModalCloseButton>
              <Ionicons name="close" size={20} color={theme.icon} />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody className="px-4 pb-2">
            <Box
              className="overflow-hidden rounded-2xl border border-outline-100"
              style={{ height: 300, backgroundColor: "#0F172A" }}
            >
              {selectedMedia?.media_url ? (
                selectedMedia?.media_type === "video" ? (
                  <Video
                    key={selectedMedia?.id}
                    source={{ uri: selectedMedia.media_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={false}
                    isLooping={false}
                    isMuted={false}
                  />
                ) : (
                  <RNImage
                    source={{ uri: selectedMedia.media_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                )
              ) : (
                <Center className="flex-1">
                  <Text className="text-sm text-typography-300">
                    Media tidak tersedia.
                  </Text>
                </Center>
              )}
            </Box>

            <VStack className="mt-3 gap-2">
              <HStack className="items-center justify-between">
                <Box className="rounded-full bg-primary-50 px-3 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                    {selectedMedia?.category || "Tanpa Kategori"}
                  </Text>
                </Box>
                <Text className="text-xs font-bold uppercase text-typography-500">
                  {selectedMedia?.media_type === "video" ? "Video" : "Foto"}
                </Text>
              </HStack>
              <Text className="text-sm leading-relaxed text-typography-700">
                {selectedMedia?.caption || "Tanpa deskripsi tambahan."}
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter className="px-4 pb-4 pt-2">
            <Button
              className="h-11 flex-1 rounded-xl bg-typography-900"
              onPress={() => setShowDetailModal(false)}
            >
              <ButtonText className="font-bold text-typography-0">
                Tutup
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
