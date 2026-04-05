import React, { useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Pressable } from "@/components/ui/pressable";

export default function RegisterScreen() {
  const toast = useToast();
  const TOAST_ID = "register-action-toast";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showToast = (
    title: string,
    description: string,
    action: "success" | "error",
  ) => {
    if (!toast.isActive(TOAST_ID)) {
      toast.show({
        id: TOAST_ID,
        placement: "top",
        render: ({ id }) => {
          return (
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
          );
        },
      });
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password)
      return showToast("Oops!", "Semua kolom wajib diisi.", "error");
    if (password.length < 8)
      return showToast(
        "Validasi Gagal",
        "Password minimal 8 karakter.",
        "error",
      );
    if (password !== confirmPassword)
      return showToast("Validasi Gagal", "Password tidak cocok.", "error");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "client" } },
    });
    setLoading(false);

    if (error) {
      showToast("Registrasi Gagal", error.message, "error");
    } else {
      showToast("Berhasil!", "Akun berhasil dibuat. Silakan login.", "success");
      router.replace("/(auth)/login");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background-0"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar dengan Tombol Back - Menggunakan safe area padding */}
          <HStack className="w-full px-6 pt-4 pb-2 items-center">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center gap-2 active:opacity-60 py-2"
            >
              <Text className="text-typography-900 text-xl font-bold">←</Text>
              <Text className="text-typography-900 font-medium">Kembali</Text>
            </Pressable>
          </HStack>

          <VStack className="flex-1 justify-center px-6 mt-4 gap-8 w-full max-w-[400px] self-center">
            <VStack className="gap-2">
              <Heading className="text-3xl font-extrabold text-typography-900">
                Buat Akun
              </Heading>
              <Text className="text-typography-500 text-base">
                Mulai booking jadwal dokumentasimu.
              </Text>
            </VStack>

            <VStack className="gap-4">
              <Input
                variant="outline"
                size="xl"
                className="rounded-xl border-outline-300"
              >
                <InputField
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  className="px-4 text-typography-900"
                />
              </Input>

              <Input
                variant="outline"
                size="xl"
                className="rounded-xl border-outline-300"
              >
                <InputField
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="px-4 text-typography-900"
                />
              </Input>

              <Input
                variant="outline"
                size="xl"
                className="rounded-xl border-outline-300"
              >
                <InputField
                  placeholder="Password (min. 8 karakter)"
                  type="password"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  className="px-4 text-typography-900"
                />
              </Input>

              <Input
                variant="outline"
                size="xl"
                className="rounded-xl border-outline-300"
              >
                <InputField
                  placeholder="Konfirmasi Password"
                  type="password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  className="px-4 text-typography-900"
                />
              </Input>
            </VStack>

            <Button
              size="xl"
              onPress={handleRegister}
              disabled={loading}
              className={`rounded-xl mt-2 bg-primary-500 ${loading ? "opacity-70" : ""}`}
            >
              {loading ? (
                <ButtonSpinner className="mr-2" color="white" />
              ) : null}
              <ButtonText className="font-bold text-typography-0">
                {loading ? "Memproses..." : "Daftar Sekarang"}
              </ButtonText>
            </Button>

            <HStack className="justify-center items-center gap-1">
              <Text className="text-sm text-typography-500">
                Sudah punya akun?
              </Text>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                className="active:opacity-60"
              >
                <Text className="text-sm font-bold text-primary-500">
                  Masuk di sini
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
