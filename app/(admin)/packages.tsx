import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Pressable } from "@/components/ui/pressable";
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

export default function AdminPackagesScreen() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Field Form
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [badge, setBadge] = useState("");
  const [features, setFeatures] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [toggling, setToggling] = useState(false);

  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useFocusEffect(
    React.useCallback(() => {
      fetchPackages();
    }, []),
  );

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("price", { ascending: true });
    if (data) setPackages(data);
    setLoading(false);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(angka);
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

  const handleOpenForm = (pkg: any = null) => {
    if (pkg) {
      setIsEditing(true);
      setEditId(pkg.id);
      setName(pkg.name);
      setDescription(pkg.description || "");
      setPrice(pkg.price.toString());
      setOriginalPrice(pkg.original_price ? pkg.original_price.toString() : "");
      setBadge(pkg.badge || "");

      const parsedFeatures =
        typeof pkg.features === "string"
          ? JSON.parse(pkg.features)
          : pkg.features;
      setFeatures(parsedFeatures ? parsedFeatures.join("\n") : "");
    } else {
      setIsEditing(false);
      setEditId(null);
      setName("");
      setDescription("");
      setPrice("");
      setOriginalPrice("");
      setBadge("");
      setFeatures("");
    }
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!name || !price || !description)
      return showToast(
        "Data Tidak Lengkap",
        "Nama, deskripsi, dan harga wajib diisi.",
        "warning",
      );

    setSaving(true);
    const featuresArray = features
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f !== "");

    const payload = {
      name,
      description,
      price: Number(price),
      original_price: originalPrice ? Number(originalPrice) : null,
      badge: badge || null,
      features: JSON.stringify(featuresArray),
    };

    let error;
    if (isEditing && editId) {
      const { error: updateError } = await supabase
        .from("packages")
        .update(payload)
        .eq("id", editId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("packages")
        .insert(payload);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      showToast("Gagal Menyimpan", error.message, "error");
    } else {
      showToast(
        "Berhasil",
        `Paket berhasil ${isEditing ? "diperbarui" : "ditambahkan"}.`,
        "success",
      );
      setShowFormModal(false);
      fetchPackages();
    }
  };

  const handleOpenConfirm = (pkg: any) => {
    setSelectedPkg(pkg);
    setShowConfirmModal(true);
  };

  const executeToggleStatus = async () => {
    if (!selectedPkg) return;
    setToggling(true);
    const { error } = await supabase
      .from("packages")
      .update({ is_active: !selectedPkg.is_active })
      .eq("id", selectedPkg.id);
    setToggling(false);

    if (!error) {
      showToast(
        "Status Diubah",
        "Ketersediaan paket telah diperbarui.",
        "success",
      );
      setShowConfirmModal(false);
      fetchPackages();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {/* Header dengan Tombol Pressable (Agar Ikon tidak menyusut) */}
      <HStack className="px-6 pt-8 pb-4 bg-background-50 z-10 justify-between items-end">
        <VStack className="gap-1 flex-1">
          <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
            Katalog Jasa
          </Text>
          <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
            Manajemen Paket.
          </Heading>
        </VStack>
        <Pressable
          onPress={() => handleOpenForm()}
          className="h-12 w-12 bg-primary-500 rounded-full items-center justify-center active:bg-primary-600 shadow-soft-1"
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>
      </HStack>

      {/* List Paket */}
      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : (
        <ScrollView
          contentContainerClassName="flex-grow pb-12 px-6"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="gap-5 mt-2">
            {packages.map((pkg) => {
              const featuresArray =
                typeof pkg.features === "string"
                  ? JSON.parse(pkg.features)
                  : pkg.features;
              const hasDiscount =
                pkg.original_price && pkg.original_price > pkg.price;

              return (
                <Box
                  key={pkg.id}
                  className={`bg-background-0 rounded-3xl p-5 shadow-soft-1 border ${pkg.is_active ? "border-outline-100" : "border-error-200 opacity-60"}`}
                >
                  <HStack className="justify-between items-start mb-2">
                    <VStack className="gap-1 flex-1 pr-4">
                      {pkg.badge && (
                        <Box className="bg-typography-900 self-start px-2 py-0.5 rounded-md mb-1">
                          <Text className="text-typography-0 text-[10px] font-bold uppercase">
                            {pkg.badge}
                          </Text>
                        </Box>
                      )}
                      <Heading className="text-xl font-extrabold text-typography-900">
                        {pkg.name}
                      </Heading>
                    </VStack>

                    <HStack className="gap-2">
                      <Pressable
                        onPress={() => handleOpenForm(pkg)}
                        className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center"
                      >
                        <Ionicons name="pencil" size={14} color="#0284c7" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleOpenConfirm(pkg)}
                        className={`w-8 h-8 rounded-full items-center justify-center ${pkg.is_active ? "bg-error-50" : "bg-success-50"}`}
                      >
                        <Ionicons
                          name={pkg.is_active ? "eye-off" : "eye"}
                          size={14}
                          color={pkg.is_active ? "#ef4444" : "#10b981"}
                        />
                      </Pressable>
                    </HStack>
                  </HStack>

                  <VStack className="gap-0 mb-3">
                    {hasDiscount && (
                      <Text className="text-typography-400 text-xs font-bold line-through">
                        {formatRupiah(pkg.original_price)}
                      </Text>
                    )}
                    <Text className="text-2xl font-black text-primary-500">
                      {formatRupiah(pkg.price)}
                    </Text>
                  </VStack>

                  <Text
                    className="text-typography-500 text-sm mb-3"
                    numberOfLines={2}
                  >
                    {pkg.description}
                  </Text>
                  <HStack className="items-center gap-2">
                    <Ionicons name="list" size={14} color="#737373" />
                    <Text className="text-typography-500 text-xs">
                      {featuresArray?.length || 0} Item Termasuk
                    </Text>
                  </HStack>

                  {!pkg.is_active && (
                    <Text className="text-error-500 font-bold text-xs uppercase mt-3 text-center tracking-widest">
                      [ Paket Nonaktif - Disembunyikan ]
                    </Text>
                  )}
                </Box>
              );
            })}
          </VStack>
        </ScrollView>
      )}

      {/* ================================================================= */}
      {/* 1. MODAL FORM TAMBAH / EDIT PAKET (FIXED HEIGHT COLLAPSE) */}
      {/* ================================================================= */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        {/* max-h-[85%] agar modal tidak menabrak status bar, p-2 untuk border dalam */}
        <ModalContent className="bg-background-0 rounded-3xl p-2 max-h-[85%] w-[90%] max-w-[400px]">
          <ModalHeader className="border-b border-outline-100 pb-4 pt-2 px-4">
            <VStack>
              <Heading className="text-typography-900 text-xl font-black">
                {isEditing ? "Edit Paket" : "Tambah Paket"}
              </Heading>
              <Text className="text-typography-500 text-xs">
                Atur penawaran jasa terbaikmu
              </Text>
            </VStack>
            <ModalCloseButton>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFF" : "#000"}
              />
            </ModalCloseButton>
          </ModalHeader>

          {/* ModalBody bawaan Gluestack adalah ScrollView. Gunakan padding langsung di sini */}
          <ModalBody
            className="py-4 px-4"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <VStack className="gap-5">
              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Nama Paket <Text className="text-error-500">*</Text>
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300"
                >
                  <InputField
                    value={name}
                    onChangeText={setName}
                    placeholder="Contoh: Pre-Wedding"
                    className="px-4 text-typography-900"
                  />
                </Input>
              </VStack>

              <HStack className="gap-4">
                <VStack className="gap-2 flex-1">
                  <Text className="text-typography-900 font-bold text-sm">
                    Harga (Rp) <Text className="text-error-500">*</Text>
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      placeholder="Misal: 2500000"
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>
                <VStack className="gap-2 flex-1">
                  <Text className="text-typography-900 font-bold text-sm">
                    Harga Coret
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      value={originalPrice}
                      onChangeText={setOriginalPrice}
                      keyboardType="numeric"
                      placeholder="Opsional"
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>
              </HStack>

              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Label Promo
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300"
                >
                  <InputField
                    value={badge}
                    onChangeText={setBadge}
                    placeholder="Contoh: Best Seller"
                    className="px-4 text-typography-900"
                  />
                </Input>
              </VStack>

              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Deskripsi Singkat <Text className="text-error-500">*</Text>
                </Text>
                <Textarea size="md" className="rounded-xl border-outline-300">
                  <TextareaInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Jelaskan paket ini..."
                    className="px-4 py-3 text-typography-900 h-20"
                  />
                </Textarea>
              </VStack>

              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Fitur (Enter per baris)
                </Text>
                <Textarea size="md" className="rounded-xl border-outline-300">
                  <TextareaInput
                    value={features}
                    onChangeText={setFeatures}
                    placeholder="1 Fotografer&#10;50 Foto Edit"
                    className="px-4 py-3 text-typography-900 h-32"
                  />
                </Textarea>
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter className="border-t border-outline-100 pt-4 pb-4 px-4">
            <Button
              size="xl"
              className="w-full rounded-2xl bg-primary-500 shadow-soft-1"
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ButtonSpinner color="white" />
              ) : (
                <ButtonText className="font-bold text-typography-0 text-base">
                  Simpan Paket
                </ButtonText>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ================================================================= */}
      {/* 2. MODAL KONFIRMASI (AKTIF / NONAKTIF) */}
      {/* ================================================================= */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2 w-[90%] max-w-[350px]">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <VStack>
              <Heading className="text-typography-900 text-xl font-black">
                Ubah Status
              </Heading>
              <Text className="text-typography-500 text-xs">
                Visibilitas paket di aplikasi klien
              </Text>
            </VStack>
            <ModalCloseButton>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFF" : "#000"}
              />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody className="py-8">
            <Center className="gap-3">
              <Box
                className={`w-16 h-16 rounded-full items-center justify-center ${selectedPkg?.is_active ? "bg-error-50" : "bg-success-50"}`}
              >
                <Ionicons
                  name={selectedPkg?.is_active ? "eye-off" : "eye"}
                  size={32}
                  color={selectedPkg?.is_active ? "#ef4444" : "#10b981"}
                />
              </Box>
              <Text className="text-typography-900 text-center font-bold px-4 mt-2">
                Ingin{" "}
                {selectedPkg?.is_active ? "menyembunyikan" : "menampilkan"}{" "}
                <Text className="font-black">"{selectedPkg?.name}"</Text>?
              </Text>
            </Center>
          </ModalBody>
          <ModalFooter className="border-t border-outline-100 pt-4 flex-row gap-3">
            <Button
              size="xl"
              variant="outline"
              className="flex-1 rounded-2xl border-outline-300"
              onPress={() => setShowConfirmModal(false)}
            >
              <ButtonText className="font-bold text-typography-900">
                Batal
              </ButtonText>
            </Button>
            <Button
              size="xl"
              className={`flex-1 rounded-2xl ${selectedPkg?.is_active ? "bg-error-500" : "bg-success-500"}`}
              onPress={executeToggleStatus}
              disabled={toggling}
            >
              {toggling ? (
                <ButtonSpinner color="white" />
              ) : (
                <ButtonText className="font-bold text-typography-0">
                  Ya, Ubah
                </ButtonText>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
