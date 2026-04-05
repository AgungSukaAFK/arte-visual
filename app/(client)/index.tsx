import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";

export default function ClientDashboard() {
  const { user } = useAuth();
  // Mengambil nama dari metadata Supabase saat register
  const userName = user?.user_metadata?.full_name || "Klien Arte";
  const [loadingLogout, setLoadingLogout] = useState(false);

  const handleLogout = () => {
    Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          setLoadingLogout(true);
          const { error } = await supabase.auth.signOut();

          if (error) {
            Alert.alert("Gagal logout", "Terjadi kesalahan. Coba lagi.");
          }

          setLoadingLogout(false);
          // Client layout akan otomatis redirect ke login saat session null.
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView contentContainerClassName="flex-grow pb-8">
        <VStack className="px-6 pt-6 gap-8">
          {/* Header Section */}
          <HStack className="items-center justify-between">
            <VStack>
              <Text className="text-typography-500 font-medium text-sm">
                Selamat datang kembali,
              </Text>
              <Heading className="text-2xl font-extrabold text-typography-900">
                {userName}
              </Heading>
            </VStack>
            <HStack className="items-center gap-3">
              <Avatar size="md" className="bg-primary-500">
                <AvatarFallbackText className="text-typography-0">
                  {userName}
                </AvatarFallbackText>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                action="negative"
                onPress={handleLogout}
                disabled={loadingLogout}
                className="rounded-full border-error-200 bg-error-50 px-4"
              >
                {loadingLogout ? (
                  <ButtonSpinner color="$error500" />
                ) : (
                  <ButtonText className="text-error-600 font-bold">
                    Logout
                  </ButtonText>
                )}
              </Button>
            </HStack>
          </HStack>

          {/* Call to Action Card - Mewah & Menonjol */}
          <Pressable
            onPress={() => router.push("/(client)/calendar")}
            className="active:opacity-90 active:scale-[0.98] transition-transform"
          >
            <Box className="bg-typography-900 rounded-3xl p-6 shadow-hard-2">
              <VStack className="gap-2">
                <Box className="bg-background-0/20 self-start px-3 py-1 rounded-full mb-2">
                  <Text className="text-typography-0 font-bold text-xs uppercase tracking-widest">
                    Baru
                  </Text>
                </Box>
                <Heading className="text-typography-0 text-2xl font-bold">
                  Buat Pesanan
                </Heading>
                <Text className="text-typography-0/80 text-sm mt-1">
                  Eksplorasi paket dan pilih tanggal momen terbaikmu bersama
                  Arte Visual.
                </Text>

                <HStack className="items-center gap-2 mt-4">
                  <Text className="text-typography-0 font-bold">
                    Cek Kalender →
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </Pressable>

          {/* Riwayat Pesanan Section */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-bold text-typography-900">
                Pesanan Aktif
              </Heading>
              <Text className="text-primary-500 font-bold text-sm">
                Lihat Semua
              </Text>
            </HStack>

            {/* Empty State untuk Pesanan (Karena database masih kosong) */}
            <Box className="bg-background-0 border border-outline-100 rounded-2xl p-8 items-center justify-center border-dashed">
              <Text className="text-typography-400 text-center">
                Belum ada pesanan aktif.
              </Text>
              <Text className="text-typography-400 text-center text-sm mt-1">
                Momen pertamamu menunggu untuk diabadikan.
              </Text>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
