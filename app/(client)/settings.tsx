import React, { useState } from "react";
import {
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Center } from "@/components/ui/center";
import { Input, InputField } from "@/components/ui/input";
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

export default function SettingsScreen() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || "Klien Arte";
  const userEmail = user?.email || "email@domain.com";

  const [loadingLogout, setLoadingLogout] = useState(false);
  const toast = useToast();

  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const isDark = colorScheme === "dark";

  // --- State Modals ---
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // --- State Form Edit Profil ---
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);

  // --- State Form Ubah Password ---
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const toggleDarkMode = (value: boolean) => {
    setColorScheme(value ? "dark" : "light");
  };

  const showToast = (
    title: string,
    description: string,
    action: "success" | "error" | "warning",
  ) => {
    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast
          nativeID={id}
          action={action}
          variant="solid"
          className="mt-4 px-4 py-3"
        >
          <VStack className="gap-1">
            <ToastTitle className="font-bold text-typography-0">
              {title}
            </ToastTitle>
            <ToastDescription className="text-typography-0">
              {description}
            </ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            setLoadingLogout(true);
            await supabase.auth.signOut();
            setLoadingLogout(false);
          },
        },
      ],
    );
  };

  // --- Handler Edit Profil ---
  const handleSaveProfile = async () => {
    if (!editName)
      return showToast("Oops!", "Nama lengkap tidak boleh kosong.", "warning");

    setLoadingProfile(true);
    // 1. Update metadata di auth
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: editName },
    });
    // 2. Update data di tabel profiles
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        full_name: editName,
        phone_number: editPhone,
      })
      .eq("id", user?.id);

    setLoadingProfile(false);

    if (authError || dbError) {
      showToast(
        "Gagal",
        (authError?.message || dbError?.message) as string,
        "error",
      );
    } else {
      showToast("Berhasil", "Profil Anda telah diperbarui.", "success");
      setShowEditProfile(false);
    }
  };

  // --- Handler Ubah Password ---
  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword) {
      return showToast(
        "Oops!",
        "Password lama dan baru wajib diisi.",
        "warning",
      );
    }
    if (newPassword.length < 8) {
      return showToast(
        "Validasi Gagal",
        "Password baru minimal 8 karakter.",
        "warning",
      );
    }

    setLoadingPassword(true);

    // Trik memverifikasi password lama: Coba login ulang di balik layar
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: oldPassword,
    });

    if (verifyError) {
      setLoadingPassword(false);
      return showToast("Gagal", "Password lama Anda salah.", "error");
    }

    // Jika password lama benar, langsung update ke password baru
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoadingPassword(false);

    if (updateError) {
      showToast("Gagal", updateError.message, "error");
    } else {
      showToast("Berhasil", "Password berhasil diubah.", "success");
      setShowChangePassword(false);
      setOldPassword("");
      setNewPassword("");
    }
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    isDestructive = false,
  }: any) => (
    <Pressable onPress={onPress} className="active:opacity-60">
      <HStack className="items-center justify-between py-3 border-b border-outline-100">
        <HStack className="items-center gap-3">
          <Box
            className={`w-10 h-10 rounded-full items-center justify-center ${isDestructive ? "bg-error-50 dark:bg-error-900" : "bg-background-50"}`}
          >
            <Ionicons
              name={icon}
              size={20}
              color={isDestructive ? theme.danger : theme.icon}
            />
          </Box>
          <VStack>
            <Text
              className={`font-bold ${isDestructive ? "text-error-600 dark:text-error-400" : "text-typography-900"}`}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-typography-500 text-xs">{subtitle}</Text>
            )}
          </VStack>
        </HStack>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.textSoft}
        />
      </HStack>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {/* Header Sticky */}
      <VStack className="px-6 pt-8 pb-4 bg-background-50 z-10 gap-1">
        <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
          Preferensi
        </Text>
        <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
          Pengaturan Akun.
        </Heading>
      </VStack>

      <ScrollView
        contentContainerClassName="flex-grow pb-8 px-6"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="gap-8 mt-2">
          {/* Profile Card Section */}
          <Box className="bg-background-0 rounded-3xl p-5 shadow-soft-1 border border-outline-100">
            <HStack className="items-center gap-4">
              <Avatar size="lg" className="bg-primary-500">
                <AvatarFallbackText className="text-typography-0">
                  {userName}
                </AvatarFallbackText>
              </Avatar>
              <VStack className="flex-1">
                <Heading className="text-typography-900 font-extrabold text-lg">
                  {userName}
                </Heading>
                <Text className="text-typography-500 text-sm">{userEmail}</Text>
                <Box className="bg-primary-50 self-start px-2 py-0.5 rounded-md mt-2 border border-primary-100">
                  <Text className="text-primary-700 text-[10px] font-bold uppercase tracking-widest">
                    Klien Member
                  </Text>
                </Box>
              </VStack>
            </HStack>
          </Box>

          {/* Pengaturan Tampilan */}
          <VStack className="gap-2">
            <Text className="text-typography-500 font-bold text-xs uppercase tracking-widest ml-2">
              Tampilan
            </Text>
            <Box className="bg-background-0 rounded-2xl px-5 py-2 shadow-soft-1 border border-outline-100">
              <HStack className="items-center justify-between py-2">
                <HStack className="items-center gap-3">
                  <Box className="w-10 h-10 rounded-full bg-background-50 items-center justify-center">
                    <Ionicons
                      name={isDark ? "moon" : "sunny"}
                      size={20}
                      color={theme.icon}
                    />
                  </Box>
                  <Text className="font-bold text-typography-900">
                    Mode Gelap (Dark Mode)
                  </Text>
                </HStack>
                <Switch
                  value={isDark}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: theme.borderStrong, true: theme.accent }}
                />
              </HStack>
            </Box>
          </VStack>

          {/* Menu Akun & Keamanan */}
          <VStack className="gap-2">
            <Text className="text-typography-500 font-bold text-xs uppercase tracking-widest ml-2">
              Akun & Keamanan
            </Text>
            <Box className="bg-background-0 rounded-2xl px-5 py-1 shadow-soft-1 border border-outline-100">
              <MenuItem
                icon="person-outline"
                title="Edit Profil"
                subtitle="Ubah nama dan nomor telepon"
                onPress={() => setShowEditProfile(true)}
              />
              <MenuItem
                icon="lock-closed-outline"
                title="Ubah Password"
                subtitle="Perbarui kata sandi keamanan Anda"
                onPress={() => setShowChangePassword(true)}
              />
              <MenuItem
                icon="help-buoy-outline"
                title="Pusat Bantuan"
                subtitle="Hubungi admin atau lihat FAQ"
                onPress={() => setShowHelp(true)}
              />
            </Box>
          </VStack>

          {/* Danger Zone */}
          <VStack className="gap-2 mt-4">
            <Button
              size="xl"
              variant="outline"
              action="negative"
              onPress={handleLogout}
              disabled={loadingLogout}
              className="rounded-2xl border-error-200 bg-error-50 h-14"
            >
              {loadingLogout ? (
                <ButtonSpinner color={theme.danger} />
              ) : (
                <HStack className="items-center gap-2">
                  <Ionicons name="log-out-outline" size={20} color={theme.danger} />
                  <ButtonText className="text-error-600 font-bold text-base">
                    Keluar dari Akun
                  </ButtonText>
                </HStack>
              )}
            </Button>
          </VStack>

          <Center className="mt-4 mb-4">
            <Text className="text-typography-400 text-xs">
              Arte Visual App v1.0.0
            </Text>
          </Center>
        </VStack>
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL EDIT PROFIL */}
      {/* ========================================================= */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-4">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <VStack>
              <Heading className="text-typography-900 text-xl font-black">
                Edit Profil
              </Heading>
              <Text className="text-typography-500 text-xs">
                Perbarui data diri Anda
              </Text>
            </VStack>
            <ModalCloseButton>
              <Ionicons
                name="close"
                size={24}
                color={theme.icon}
              />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody className="py-6">
            <VStack className="gap-4">
              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Nama Lengkap
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300 bg-background-0"
                >
                  <InputField
                    value={editName}
                    onChangeText={setEditName}
                    className="px-4 text-typography-900"
                  />
                </Input>
              </VStack>
              <VStack className="gap-2">
                <Text className="text-typography-900 font-bold text-sm">
                  Nomor Telepon (Opsional)
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300 bg-background-0"
                >
                  <InputField
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholder="Contoh: 08123456789"
                    className="px-4 text-typography-900"
                  />
                </Input>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter className="border-t border-outline-100 pt-4">
            <Button
              size="xl"
              className="w-full rounded-2xl bg-typography-900"
              onPress={handleSaveProfile}
              disabled={loadingProfile}
            >
              {loadingProfile ? (
                <ButtonSpinner color={theme.surface} />
              ) : (
                <ButtonText className="font-bold text-typography-0 text-base">
                  Simpan Profil
                </ButtonText>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL UBAH PASSWORD */}
      {/* ========================================================= */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-4">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ModalHeader className="border-b border-outline-100 pb-4">
              <VStack>
                <Heading className="text-typography-900 text-xl font-black">
                  Ubah Password
                </Heading>
                <Text className="text-typography-500 text-xs">
                  Pastikan password baru Anda aman
                </Text>
              </VStack>
              <ModalCloseButton>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.icon}
                />
              </ModalCloseButton>
            </ModalHeader>
            <ModalBody className="py-6">
              <VStack className="gap-4">
                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Password Lama
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      type="password"
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      autoCapitalize="none"
                      placeholder="Masukkan password saat ini"
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>
                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Password Baru
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300"
                  >
                    <InputField
                      type="password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Minimal 8 karakter"
                      autoCapitalize="none"
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>
              </VStack>
            </ModalBody>
            <ModalFooter className="border-t border-outline-100 pt-4">
              <Button
                size="xl"
                className="w-full rounded-2xl bg-typography-900"
                onPress={handleSavePassword}
                disabled={loadingPassword}
              >
                {loadingPassword ? (
                  <ButtonSpinner color={theme.surface} />
                ) : (
                  <ButtonText className="font-bold text-typography-0 text-base">
                    Perbarui Password
                  </ButtonText>
                )}
              </Button>
            </ModalFooter>
          </KeyboardAvoidingView>
        </ModalContent>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL PUSAT BANTUAN (PLACEHOLDER) */}
      {/* ========================================================= */}
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} size="md">
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-4">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <VStack>
              <Heading className="text-typography-900 text-xl font-black">
                Pusat Bantuan
              </Heading>
              <Text className="text-typography-500 text-xs">
                Arte Visual Support
              </Text>
            </VStack>
            <ModalCloseButton>
              <Ionicons
                name="close"
                size={24}
                color={theme.icon}
              />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody className="py-8">
            <Center className="gap-3">
              <Ionicons name="chatbubbles-outline" size={64} color={theme.textSoft} />
              <Heading className="text-typography-900 font-bold text-center">
                Panel Diskusi & FAQ
              </Heading>
              <Text className="text-typography-500 text-center text-sm px-4">
                Fitur live chat dengan tim Admin dan desainer kami sedang dalam
                tahap pengembangan. Nantikan segera!
              </Text>
            </Center>
          </ModalBody>
          <ModalFooter className="border-t border-outline-100 pt-4">
            <Button
              size="xl"
              variant="outline"
              className="w-full rounded-2xl border-outline-300"
              onPress={() => setShowHelp(false)}
            >
              <ButtonText className="font-bold text-typography-900 text-base">
                Tutup
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
