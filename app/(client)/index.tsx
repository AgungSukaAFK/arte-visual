import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import { getAppTheme } from "../../constants/theme";

export default function ClientHome() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || "Klien Arte";

  // Deteksi tema agar ikon adaptif (hitam saat terang, putih saat gelap)
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const iconColor = theme.icon;

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pakai useFocusEffect agar data di-refresh setiap kali user kembali ke tab Home
  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, []),
  );

  const fetchOrders = async () => {
    setLoading(true);
    // Mengambil pesanan dan join dengan tabel packages untuk dapat nama paketnya
    const { data, error } = await supabase
      .from("bookings")
      .select("*, packages(name)")
      .eq("client_id", user?.id)
      .order("event_date", { ascending: true });

    if (data) {
      // Memilah data berdasarkan status
      setActiveOrders(
        data.filter((b) => b.status === "pending" || b.status === "confirmed"),
      );
      setHistoryOrders(
        data.filter(
          (b) => b.status === "completed" || b.status === "cancelled",
        ),
      );
    }
    setLoading(false);
  };

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
              <Avatar size="md" className="bg-primary-500">
                <AvatarFallbackText className="text-typography-0">
                  {userName}
                </AvatarFallbackText>
              </Avatar>
              <VStack>
                <Text className="text-typography-500 font-medium text-xs uppercase tracking-wider">
                  Selamat datang,
                </Text>
                <Heading className="text-xl font-extrabold text-typography-900">
                  {userName}
                </Heading>
              </VStack>
            </HStack>

            {/* Menu Aksi: Pembayaran & Notifikasi */}
            <HStack className="items-center gap-5">
              <Pressable
                onPress={() => router.push("/(client)/orders")}
                className="active:opacity-60 relative"
              >
                <Ionicons name="receipt-outline" size={24} color={iconColor} />
                {/* Indikator Merah Mini (Dummy: untuk tagihan belum lunas) */}
                <Box className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full border-2 border-background-50" />
              </Pressable>

              <Pressable
                onPress={() => console.log("Buka menu notifikasi")}
                className="active:opacity-60"
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={iconColor}
                />
              </Pressable>
            </HStack>
          </HStack>

          {/* Quick Access Card -> Arte Calendar */}
          <Pressable
            onPress={() => router.push("/(client)/calendar")}
            className="active:opacity-90 active:scale-[0.98] transition-transform"
          >
            <Box className="bg-primary-700 rounded-3xl p-6 shadow-soft-2 border border-primary-600">
              <VStack className="gap-2">
                <Box className="bg-background-0/20 self-start px-3 py-1 rounded-full mb-2">
                  <Text className="text-typography-0 font-bold text-[10px] uppercase tracking-widest">
                    Akses Cepat
                  </Text>
                </Box>
                <Heading className="text-typography-0 text-2xl font-bold">
                  Booking Jadwal
                </Heading>
                <Text className="text-typography-0/70 text-sm mt-1">
                  Abadikan momen berhargamu dengan sentuhan profesional Arte
                  Visual.
                </Text>

                <HStack className="items-center gap-2 mt-4">
                  <Text className="text-typography-0 font-bold">
                    Buka Arte Calendar →
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </Pressable>

          {/* List Pesanan Aktif */}
          <VStack className="gap-4">
            <Heading className="text-lg font-bold text-typography-900">
              Pesanan Aktif
            </Heading>

            {loading ? (
              <Center className="py-6">
                <Spinner size="large" className="text-typography-900" />
              </Center>
            ) : activeOrders.length === 0 ? (
              <Box className="bg-background-0 border border-outline-100 rounded-2xl p-6 items-center justify-center border-dashed">
                <Text className="text-typography-400 text-center text-sm">
                  Belum ada pesanan yang aktif saat ini.
                </Text>
              </Box>
            ) : (
              <VStack className="gap-4">
                {activeOrders.map((order) => (
                  <Box
                    key={order.id}
                    className="bg-background-0 p-5 rounded-2xl border border-outline-100 shadow-soft-1"
                  >
                    <HStack className="justify-between items-center mb-3">
                      <Heading
                        className="text-typography-900 font-extrabold text-base flex-1"
                        numberOfLines={1}
                      >
                        {order.packages?.name || "Paket Jasa"}
                      </Heading>
                      <Box
                        className={`px-2 py-1 rounded-md ${order.status === "confirmed" ? "bg-primary-100" : "bg-warning-100"}`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase ${order.status === "confirmed" ? "text-primary-700" : "text-warning-700"}`}
                        >
                          {order.status}
                        </Text>
                      </Box>
                    </HStack>
                    <VStack className="gap-1">
                      <HStack className="items-center gap-2">
                        <Ionicons
                          name="calendar"
                          size={14}
                          color={theme.textSoft}
                        />
                        <Text className="text-typography-500 text-sm font-medium">
                          {order.event_date}
                        </Text>
                      </HStack>
                      <HStack className="items-center gap-2">
                        <Ionicons
                          name="location"
                          size={14}
                          color={theme.textSoft}
                        />
                        <Text
                          className="text-typography-500 text-sm font-medium"
                          numberOfLines={1}
                        >
                          {order.location}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

          {/* Riwayat Pesanan */}
          <VStack className="gap-4">
            <Heading className="text-lg font-bold text-typography-900">
              Riwayat Pesanan
            </Heading>

            {loading ? (
              <Center className="py-6">
                <Spinner size="large" className="text-typography-900" />
              </Center>
            ) : historyOrders.length === 0 ? (
              <Box className="bg-background-0 border border-outline-100 rounded-2xl p-6 items-center justify-center border-dashed">
                <Text className="text-typography-400 text-center text-sm">
                  Belum ada riwayat pesanan yang selesai.
                </Text>
              </Box>
            ) : (
              <VStack className="gap-4">
                {historyOrders.map((order) => (
                  <Box
                    key={order.id}
                    className="bg-background-50 p-5 rounded-2xl border border-outline-100 opacity-70"
                  >
                    <HStack className="justify-between items-center mb-2">
                      <Heading
                        className="text-typography-900 font-extrabold text-base flex-1"
                        numberOfLines={1}
                      >
                        {order.packages?.name || "Paket Jasa"}
                      </Heading>
                      <Text className="text-success-600 text-xs font-bold uppercase">
                        {order.status}
                      </Text>
                    </HStack>
                    <Text className="text-typography-500 text-sm">
                      Selesai pada: {order.event_date}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
