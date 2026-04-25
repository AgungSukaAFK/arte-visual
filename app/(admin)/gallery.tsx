import React, { useState } from "react";
import {
  FlatList,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { Video, ResizeMode } from "expo-av";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Pressable } from "@/components/ui/pressable";
import { Image } from "@/components/ui/image";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";

const screenWidth = Dimensions.get("window").width;
const itemSize = (screenWidth - 48 - 12) / 2; // px-6 (24) * 2 = 48, gap 12

export default function AdminGalleryScreen() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State: Modal Upload Baru
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // State: Form Media (Upload & Edit)
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");

  // State: Modal Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const toast = useToast();
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
    const { data } = await supabase
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMediaList(data);
    setLoading(false);
  };

  const showToast = (
    title: string,
    desc: string,
    type: "success" | "error" | "warning",
  ) => {
    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast
          nativeID={id}
          action={type}
          variant="solid"
          className="mt-4 px-4 py-3"
        >
          <VStack className="gap-1">
            <ToastTitle className="font-bold text-typography-0">
              {title}
            </ToastTitle>
            <ToastDescription className="text-typography-0">
              {desc}
            </ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  };

  // ==========================================
  // 1. HANDLER: PILIH GAMBAR DARI HP
  // ==========================================
  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showToast("Akses Ditolak", "Butuh izin akses galeri.", "warning");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true, // Native UI OS (Bisa gelap di Android)
      aspect: [1, 1],
      quality: 0.7, // Kompresi agar ringan
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedAsset(result.assets[0]);
      setCaption("");
      setCategory("");
      setShowUploadModal(true); // Buka form detail
    }
  };

  // ==========================================
  // 2. HANDLER: UPLOAD KE SUPABASE (BASE64)
  // ==========================================
  const executeUpload = async () => {
    if (!caption || !category)
      return showToast(
        "Tidak Lengkap",
        "Label dan Kategori wajib diisi.",
        "warning",
      );

    setUploading(true);
    try {
      const isVideo = selectedAsset.type === "video";
      const fileExt = isVideo ? "mp4" : "jpg";
      const fileName = `${Date.now()}_arte.${fileExt}`;

      // Read picked media using the new FileSystem API.
      const pickedFile = new File(selectedAsset.uri);
      const arrayBuffer = await pickedFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("gallery_media")
        .upload(fileName, arrayBuffer, {
          contentType: isVideo ? "video/mp4" : "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("gallery_media")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("gallery").insert({
        media_url: publicUrlData.publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: caption,
        category: category,
        is_active: true,
      });

      if (dbError) throw dbError;

      showToast("Berhasil", "Karya telah diunggah ke galeri.", "success");
      setShowUploadModal(false);
      fetchGallery();
    } catch (error: any) {
      showToast("Upload Gagal", error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // 3. HANDLER: EDIT (CAPTION & KATEGORI)
  // ==========================================
  const handleOpenEdit = (item: any) => {
    setEditId(item.id);
    setCaption(item.caption || "");
    setCategory(item.category || "");
    setShowEditModal(true);
  };

  const executeEdit = async () => {
    setSavingEdit(true);
    const { error } = await supabase
      .from("gallery")
      .update({ caption, category })
      .eq("id", editId);
    setSavingEdit(false);

    if (!error) {
      showToast("Diperbarui", "Data karya berhasil diubah.", "success");
      setShowEditModal(false);
      fetchGallery();
    }
  };

  // ==========================================
  // 4. HANDLER: HAPUS PERMANEN (STORAGE + DB)
  // ==========================================
  const handleDelete = (item: any) => {
    Alert.alert(
      "Hapus Permanen",
      `Yakin ingin menghapus ${item.media_type} ini dari database dan storage?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            // Ekstrak nama file dari URL
            const fileName = item.media_url.split("/").pop();
            if (fileName)
              await supabase.storage.from("gallery_media").remove([fileName]);
            await supabase.from("gallery").delete().eq("id", item.id);
            showToast("Dihapus", "Karya berhasil dihapus permanen.", "success");
            fetchGallery();
          },
        },
      ],
    );
  };

  // ==========================================
  // 5. HANDLER: UBAH VISIBILITAS (MATA)
  // ==========================================
  const handleToggleVisibility = async (item: any) => {
    await supabase
      .from("gallery")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    fetchGallery();
  };

  const renderItem = ({ item }: { item: any }) => {
    const isVideo = item.media_type === "video";

    return (
      <Box
        style={{ width: itemSize, height: itemSize }}
        className={`mb-3 rounded-2xl overflow-hidden shadow-soft-1 relative ${!item.is_active ? "opacity-50" : "bg-outline-100"}`}
      >
        {isVideo ? (
          <Video
            source={{ uri: item.media_url }}
            className="absolute w-full h-full" // <-- Tambahkan ini
            style={{ width: "100%", height: "100%" }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
          />
        ) : (
          <Image
            source={{ uri: item.media_url }}
            alt="Gallery"
            className="absolute w-full h-full" // <-- Tambahkan ini
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        )}

        {/* Badge Tipe File */}
        <Box className="absolute top-2 left-2 bg-typography-900/70 px-2 py-1 rounded-md flex-row items-center gap-1 pointer-events-none">
          <Ionicons
            name={isVideo ? "videocam" : "camera"}
            size={10}
            color={theme.surface}
          />
          <Text className="text-typography-0 text-[8px] font-bold uppercase">
            {item.media_type}
          </Text>
        </Box>

        {/* Action Buttons Container (Vertikal di Kanan) */}
        <VStack className="absolute top-2 right-2 gap-1.5">
          <Pressable
            onPress={() => handleToggleVisibility(item)}
            className={`w-7 h-7 rounded-full items-center justify-center ${item.is_active ? "bg-background-0/90" : "bg-error-500/90"}`}
          >
            <Ionicons
              name={item.is_active ? "eye" : "eye-off"}
              size={14}
              color={item.is_active ? theme.icon : theme.surface}
            />
          </Pressable>
          <Pressable
            onPress={() => handleOpenEdit(item)}
            className="w-7 h-7 rounded-full bg-primary-500/90 items-center justify-center"
          >
            <Ionicons name="pencil" size={14} color={theme.surface} />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item)}
            className="w-7 h-7 rounded-full bg-error-50/90 items-center justify-center"
          >
            <Ionicons name="trash" size={14} color={theme.danger} />
          </Pressable>
        </VStack>

        {/* Info Label & Category Bawah */}
        <VStack className="absolute bottom-0 left-0 right-0 bg-typography-900/80 p-2">
          {item.category && (
            <Text className="text-primary-400 text-[9px] font-bold uppercase tracking-wider">
              {item.category}
            </Text>
          )}
          <Text
            className="text-typography-0 text-[11px] font-bold"
            numberOfLines={1}
          >
            {item.caption || "Tanpa Label"}
          </Text>
        </VStack>

        {!item.is_active && (
          <Center className="absolute inset-0 bg-background-900/40 pointer-events-none">
            <Box className="bg-error-500 px-2 py-1 rounded">
              <Text className="text-typography-0 text-[10px] font-bold uppercase">
                Disembunyikan
              </Text>
            </Box>
          </Center>
        )}
      </Box>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <HStack className="px-6 pt-8 pb-4 bg-background-50 z-10 justify-between items-end">
        <VStack className="gap-1 flex-1">
          <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
            Portofolio
          </Text>
          <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
            Manajemen Galeri.
          </Heading>
        </VStack>
        <Pressable
          onPress={handlePickMedia}
          className="h-12 w-12 bg-primary-500 rounded-full items-center justify-center shadow-soft-1 active:bg-primary-600"
        >
          <Ionicons name="add" size={28} color={theme.surface} />
        </Pressable>
      </HStack>

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
            <Center className="flex-1 py-20">
              <Ionicons
                name="images-outline"
                size={64}
                color={theme.borderStrong}
              />
              <Text className="text-typography-500 mt-4 text-center">
                Belum ada karya yang diunggah.
              </Text>
            </Center>
          }
        />
      )}

      {/* ================================================================= */}
      {/* MODAL UPLOAD (PREVIEW & ISI DATA) */}
      {/* ================================================================= */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !uploading && setShowUploadModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2 w-[90%] max-w-[400px]">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ModalHeader className="border-b border-outline-100 pb-3 pt-2 px-4">
              <VStack>
                <Heading className="text-typography-900 text-lg font-black">
                  Detail Karya
                </Heading>
                <Text className="text-typography-500 text-xs">
                  Tambahkan informasi sebelum diunggah
                </Text>
              </VStack>
              {!uploading && (
                <ModalCloseButton>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.icon}
                  />
                </ModalCloseButton>
              )}
            </ModalHeader>
            <ModalBody className="py-4 px-4">
              <VStack className="gap-5">
                {/* Preview Kotak */}
                <Center>
                  <Box className="w-32 h-32 rounded-2xl overflow-hidden bg-outline-100">
                    {selectedAsset?.type === "video" ? (
                      <Video
                        source={{ uri: selectedAsset?.uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode={ResizeMode.COVER}
                      />
                    ) : (
                      <Image
                        source={{ uri: selectedAsset?.uri }}
                        style={{ width: "100%", height: "100%" }}
                        alt="Preview"
                      />
                    )}
                  </Box>
                </Center>

                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Kategori (Event) <Text className="text-error-500">*</Text>
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={category}
                      onChangeText={setCategory}
                      placeholder="Contoh: Pre-Wedding, Corporate"
                      className="px-4 text-typography-900 text-sm"
                    />
                  </Input>
                </VStack>

                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Label / Caption <Text className="text-error-500">*</Text>
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={caption}
                      onChangeText={setCaption}
                      placeholder="Contoh: Acara Pak Budi di Sudirman"
                      className="px-4 text-typography-900 text-sm"
                    />
                  </Input>
                </VStack>
              </VStack>
            </ModalBody>
            <ModalFooter className="border-t border-outline-100 pt-4 pb-4 px-4">
              <Button
                size="xl"
                className="w-full rounded-2xl bg-primary-500 shadow-soft-1"
                onPress={executeUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ButtonSpinner color={theme.surface} />
                ) : (
                  <ButtonText className="font-bold text-typography-0">
                    Unggah ke Server
                  </ButtonText>
                )}
              </Button>
            </ModalFooter>
          </KeyboardAvoidingView>
        </ModalContent>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL EDIT CAPTION & KATEGORI */}
      {/* ================================================================= */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !savingEdit && setShowEditModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2 w-[90%] max-w-[400px]">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ModalHeader className="border-b border-outline-100 pb-3 pt-2 px-4">
              <Heading className="text-typography-900 text-lg font-black">
                Edit Data Karya
              </Heading>
              {!savingEdit && (
                <ModalCloseButton>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.icon}
                  />
                </ModalCloseButton>
              )}
            </ModalHeader>
            <ModalBody className="py-4 px-4">
              <VStack className="gap-5">
                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Kategori
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={category}
                      onChangeText={setCategory}
                      className="px-4 text-typography-900 text-sm"
                    />
                  </Input>
                </VStack>
                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Label / Caption
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={caption}
                      onChangeText={setCaption}
                      className="px-4 text-typography-900 text-sm"
                    />
                  </Input>
                </VStack>
              </VStack>
            </ModalBody>
            <ModalFooter className="border-t border-outline-100 pt-4 pb-4 px-4">
              <Button
                size="xl"
                className="w-full rounded-2xl bg-typography-900 shadow-soft-1"
                onPress={executeEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ButtonSpinner color={theme.surface} />
                ) : (
                  <ButtonText className="font-bold text-typography-0">
                    Simpan Perubahan
                  </ButtonText>
                )}
              </Button>
            </ModalFooter>
          </KeyboardAvoidingView>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
