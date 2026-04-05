import React, { useEffect, useState } from "react";
import { ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminName = user?.user_metadata?.full_name || "Admin";

  const [loadingLogout, setLoadingLogout] = useState(false);
  const [stats, setStats] = useState({ users: 0, packages: 0, bookings: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    // Karena role admin (RLS), kita bisa fetch semua data tanpa terblokir
    const [usersReq, packagesReq, bookingsReq] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "client"),
      supabase.from("packages").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      users: usersReq.count || 0,
      packages: packagesReq.count || 0,
      bookings: bookingsReq.count || 0,
    });
    setLoadingStats(false);
  };

  const handleLogout = async () => {
    Alert.alert("Keluar", "Apakah Anda yakin ingin keluar dari Panel Admin?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          setLoadingLogout(true);
          await supabase.auth.signOut();
          setLoadingLogout(false);
          // AuthContext akan otomatis mendeteksi session null dan melempar ke /login
        },
      },
    ]);
  };

  // Helper untuk membuat Menu Card
  const MenuCard = ({
    title,
    desc,
    icon,
    route,
  }: {
    title: string;
    desc: string;
    icon: string;
    route: any;
  }) => (
    <Pressable
      onPress={() => router.push(route)}
      className="active:opacity-70 active:scale-[0.98] transition-transform"
    >
      <HStack className="bg-background-0 p-5 rounded-2xl shadow-sm border border-outline-100 items-center justify-between">
        <HStack className="items-center gap-4">
          <Box className="bg-primary-50 w-12 h-12 rounded-xl items-center justify-center border border-primary-100">
            <Text className="text-2xl">{icon}</Text>
          </Box>
          <VStack>
            <Heading className="text-typography-900 text-lg font-bold">
              {title}
            </Heading>
            <Text className="text-typography-500 text-sm">{desc}</Text>
          </VStack>
        </HStack>
        <Text className="text-typography-400 text-xl font-bold">→</Text>
      </HStack>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="px-6 pt-6 gap-8">
          {/* Header Section */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-3">
              <Avatar size="md" className="bg-typography-900">
                <AvatarFallbackText className="text-typography-0">
                  {adminName}
                </AvatarFallbackText>
              </Avatar>
              <VStack>
                <Text className="text-typography-500 font-medium text-xs tracking-widest uppercase">
                  Panel Admin
                </Text>
                <Heading className="text-xl font-extrabold text-typography-900">
                  {adminName}
                </Heading>
              </VStack>
            </HStack>

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

          {/* Quick Stats Section */}
          <VStack className="gap-3">
            <Heading className="text-lg font-bold text-typography-900">
              Ringkasan Sistem
            </Heading>
            {loadingStats ? (
              <Center className="h-24 bg-background-0 rounded-2xl border border-outline-100">
                <Spinner size="small" />
              </Center>
            ) : (
              <HStack className="gap-3">
                <Box className="flex-1 bg-background-0 p-4 rounded-2xl shadow-sm border border-outline-100">
                  <Text className="text-typography-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Klien
                  </Text>
                  <Heading className="text-3xl font-black text-typography-900">
                    {stats.users}
                  </Heading>
                </Box>
                <Box className="flex-1 bg-background-0 p-4 rounded-2xl shadow-sm border border-outline-100">
                  <Text className="text-typography-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Pesanan
                  </Text>
                  <Heading className="text-3xl font-black text-typography-900">
                    {stats.bookings}
                  </Heading>
                </Box>
                <Box className="flex-1 bg-background-0 p-4 rounded-2xl shadow-sm border border-outline-100">
                  <Text className="text-typography-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Paket
                  </Text>
                  <Heading className="text-3xl font-black text-typography-900">
                    {stats.packages}
                  </Heading>
                </Box>
              </HStack>
            )}
          </VStack>

          {/* Menu Manajemen Section */}
          <VStack className="gap-4">
            <Heading className="text-lg font-bold text-typography-900">
              Menu Manajemen
            </Heading>

            <MenuCard
              title="Manajemen Pesanan"
              desc="Konfirmasi, tolak, atau update jadwal"
              icon="📅"
              route="/(admin)/bookings"
            />

            <MenuCard
              title="Manajemen Paket"
              desc="Tambah, edit, dan nonaktifkan layanan"
              icon="📦"
              route="/(admin)/packages"
            />

            <MenuCard
              title="Manajemen User"
              desc="Data klien dan kontrol akses akun"
              icon="👥"
              route="/(admin)/users"
            />
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
