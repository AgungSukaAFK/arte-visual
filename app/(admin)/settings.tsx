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

export default function AdminSettingsScreen() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || "Admin Arte";
  const userEmail = user?.email || "admin@domain.com";

  const [loadingLogout, setLoadingLogout] = useState(false);
  const toast = useToast();

  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const isDark = colorScheme === "dark";

  // State Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // State Form
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const toggleDarkMode = (value: boolean) =>
    setColorScheme(value ? "dark" : "light");

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
    Alert.alert("Konfirmasi Keluar", "Tinggalkan ruang kendali Admin?", [
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
    ]);
  };

  const handleSaveProfile = async () => {
    if (!editName)
      return showToast("Oops!", "Nama lengkap wajib diisi.", "warning");
    setLoadingProfile(true);
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: editName },
    });
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ full_name: editName, phone_number: editPhone })
      .eq("id", user?.id);
    setLoadingProfile(false);
    if (authError || dbError)
      showToast(
        "Gagal",
        (authError?.message || dbError?.message) as string,
        "error",
      );
    else {
      showToast("Berhasil", "Profil Admin diperbarui.", "success");
      setShowEditProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword)
      return showToast("Oops!", "Semua password wajib diisi.", "warning");
    if (newPassword.length < 8)
      return showToast("Gagal", "Password baru minimal 8 karakter.", "warning");
    setLoadingPassword(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: oldPassword,
    });
    if (verifyError) {
      setLoadingPassword(false);
      return showToast("Gagal", "Password lama salah.", "error");
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoadingPassword(false);
    if (updateError) showToast("Gagal", updateError.message, "error");
    else {
      showToast("Berhasil", "Password Admin diubah.", "success");
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
            className={`w-10 h-10 rounded-full items-center justify-center ${isDestructive ? "bg-error-50" : "bg-background-50"}`}
          >
            <Ionicons
              name={icon}
              size={20}
              color={isDestructive ? theme.danger : theme.icon}
            />
          </Box>
          <VStack>
            <Text
              className={`font-bold ${isDestructive ? "text-error-600" : "text-typography-900"}`}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-typography-500 text-xs">{subtitle}</Text>
            )}
          </VStack>
        </HStack>
        <Ionicons name="chevron-forward" size={20} color={theme.textSoft} />
      </HStack>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {/* Header Bar dengan Tombol Back */}
      <HStack className="w-full px-6 pt-4 pb-2 items-center bg-background-50 z-10">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 active:opacity-60 py-2"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.icon}
          />
          <Text className="text-typography-900 font-bold text-lg">Kembali</Text>
        </Pressable>
      </HStack>

      <ScrollView
        contentContainerClassName="flex-grow pb-8 px-6"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="gap-8 mt-4">
          {/* Profile Card Section */}
          <Box className="bg-background-0 rounded-3xl p-5 shadow-soft-1 border border-outline-100">
            <HStack className="items-center gap-4">
              <Avatar size="lg" className="bg-typography-900">
                <AvatarFallbackText className="text-typography-0">
                  {userName}
                </AvatarFallbackText>
              </Avatar>
              <VStack className="flex-1">
                <Heading className="text-typography-900 font-extrabold text-lg">
                  {userName}
                </Heading>
                <Text className="text-typography-500 text-sm">{userEmail}</Text>
                <Box className="bg-warning-100 self-start px-2 py-0.5 rounded-md mt-2 border border-warning-200">
                  <Text className="text-warning-800 text-[10px] font-bold uppercase tracking-widest">
                    Super Admin
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
              Keamanan Panel
            </Text>
            <Box className="bg-background-0 rounded-2xl px-5 py-1 shadow-soft-1 border border-outline-100">
              <MenuItem
                icon="person-outline"
                title="Edit Profil Admin"
                subtitle="Ubah nama dan info"
                onPress={() => setShowEditProfile(true)}
              />
              <MenuItem
                icon="shield-checkmark-outline"
                title="Ubah Password"
                subtitle="Perbarui sandi akses panel"
                onPress={() => setShowChangePassword(true)}
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
                    Keluar dari Panel Admin
                  </ButtonText>
                </HStack>
              )}
            </Button>
          </VStack>
        </VStack>
      </ScrollView>

      {/* --- MODAL EDIT PROFIL --- */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <Heading className="text-typography-900 text-xl font-black">
              Edit Profil
            </Heading>
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
                  Nama Admin
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300"
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
                  Nomor Kontak
                </Text>
                <Input
                  variant="outline"
                  size="xl"
                  className="rounded-xl border-outline-300"
                >
                  <InputField
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
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
                <ButtonText className="font-bold text-typography-0">
                  Simpan Profil
                </ButtonText>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* --- MODAL UBAH PASSWORD --- */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ModalHeader className="border-b border-outline-100 pb-4">
              <Heading className="text-typography-900 text-xl font-black">
                Ubah Password
              </Heading>
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
                  <ButtonText className="font-bold text-typography-0">
                    Perbarui Password
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
