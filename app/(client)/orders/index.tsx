import React, { useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

// Gluestack Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import { Badge, BadgeText } from "@/components/ui/badge";

export default function OrdersScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const iconColor = theme.icon;

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, []),
  );

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*, packages(name, price)")
      .eq("client_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setBookings(data);
    }
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Menunggu Konfirmasi Admin",
          color: "warning",
          icon: "time",
        };
      case "confirmed":
        return {
          label: "Diterima - Silakan Bayar",
          color: "info",
          icon: "checkmark-circle",
        };
      case "awaiting_payment":
        return { label: "Menunggu Pembayaran", color: "error", icon: "card" };
      case "dp_paid":
        return { label: "DP Lunas", color: "primary", icon: "wallet" };
      case "fully_paid":
        return { label: "Lunas", color: "success", icon: "cash" };
      case "completed":
        return { label: "Selesai", color: "success", icon: "star" };
      case "cancelled":
        return { label: "Dibatalkan", color: "error", icon: "close-circle" };
      default:
        return { label: status, color: "muted", icon: "help" };
    }
  };

  const formatRupiah = (angka: any) => {
    if (!angka) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <VStack className="px-6 pt-8 pb-4 bg-background-50 gap-1">
        <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
          Eksplorasi Perjalanan
        </Text>
        <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
          Pesananku.
        </Heading>
      </VStack>

      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : bookings.length === 0 ? (
        <Center className="flex-1 px-8">
          <Box className="bg-background-0 p-8 rounded-3xl items-center border border-outline-100 border-dashed">
            <Ionicons name="receipt-outline" size={64} color={theme.borderStrong} />
            <Text className="text-typography-600 font-bold text-center mt-4">
              Belum Ada Pesanan
            </Text>
            <Text className="text-typography-400 text-center text-sm mt-1">
              Abadikan momen berhargamu hari ini dengan kami.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(client)/calendar")}
              className="bg-typography-900 px-6 py-3 rounded-xl mt-6"
            >
              <Text className="text-white font-bold">Mulai Booking</Text>
            </TouchableOpacity>
          </Box>
        </Center>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-20 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="gap-5">
            {bookings.map((item) => {
              const status = getStatusConfig(item.status);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(client)/orders/[id]",
                      params: { id: item.id },
                    })
                  }
                  activeOpacity={0.9}
                >
                  <Box className="bg-background-0 rounded-3xl p-5 border border-outline-100 shadow-soft-1">
                    <HStack className="justify-between items-start mb-4">
                      <VStack className="flex-1 mr-3">
                        <Heading
                          className="text-lg font-black text-typography-900"
                          numberOfLines={1}
                        >
                          {item.packages?.name || "Paket Layanan"}
                        </Heading>
                        <Text className="text-typography-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                          ID: {item.id.slice(0, 8).toUpperCase()}
                        </Text>
                      </VStack>
                      <Badge
                        action={status.color as any}
                        variant="solid"
                        className="rounded-lg px-2 py-1"
                      >
                        <BadgeText className="text-[10px] uppercase font-black">
                          {status.label}
                        </BadgeText>
                      </Badge>
                    </HStack>

                    <VStack className="gap-3 bg-background-50 p-4 rounded-2xl border border-outline-50">
                      <HStack className="items-center gap-3">
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={theme.textSoft}
                        />
                        <Text className="text-typography-700 text-sm font-semibold">
                          {item.event_date}
                        </Text>
                      </HStack>
                      <HStack className="items-center gap-3">
                        <Ionicons
                          name="cash-outline"
                          size={18}
                          color={theme.textSoft}
                        />
                        <Text className="text-typography-900 text-sm font-black">
                          {formatRupiah(item.packages?.price)}
                        </Text>
                      </HStack>
                    </VStack>

                    <HStack className="mt-4 justify-between items-center">
                      <HStack className="items-center gap-1">
                        <Ionicons
                          name={status.icon as any}
                          size={14}
                          color={theme.textSoft}
                        />
                        <Text className="text-typography-500 text-[10px] font-bold">
                          Status diperbarui baru saja
                        </Text>
                      </HStack>
                      <HStack className="items-center gap-1">
                        <Text className="text-primary-600 text-xs font-black">
                          Lihat Detail
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={12}
                          color={theme.accent}
                        />
                      </HStack>
                    </HStack>
                  </Box>
                </TouchableOpacity>
              );
            })}
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
