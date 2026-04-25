import React, { useState } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Pressable } from "@/components/ui/pressable";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";

type FilterTab =
  | "all"
  | "pending"
  | "confirmed"
  | "awaiting_payment"
  | "dp_paid"
  | "fully_paid"
  | "completed"
  | "cancelled";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu Acc" },
  { key: "confirmed", label: "Diterima" },
  { key: "awaiting_payment", label: "Menunggu Bayar" },
  { key: "dp_paid", label: "DP Masuk" },
  { key: "fully_paid", label: "Lunas" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Ditolak" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; textClass: string; accent: string }
> = {
  pending: {
    label: "Menunggu Acc",
    badgeClass: "bg-warning-100 border-warning-200",
    textClass: "text-warning-700",
    accent: "bg-warning-500",
  },
  confirmed: {
    label: "Diterima",
    badgeClass: "bg-info-100 border-info-200",
    textClass: "text-info-700",
    accent: "bg-info-500",
  },
  awaiting_payment: {
    label: "Menunggu Bayar",
    badgeClass: "bg-orange-100 border-orange-200",
    textClass: "text-orange-700",
    accent: "bg-orange-500",
  },
  dp_paid: {
    label: "DP Masuk",
    badgeClass: "bg-primary-100 border-primary-200",
    textClass: "text-primary-700",
    accent: "bg-primary-500",
  },
  fully_paid: {
    label: "Lunas",
    badgeClass: "bg-indigo-100 border-indigo-200",
    textClass: "text-indigo-700",
    accent: "bg-indigo-500",
  },
  completed: {
    label: "Selesai",
    badgeClass: "bg-success-100 border-success-200",
    textClass: "text-success-700",
    accent: "bg-success-500",
  },
  cancelled: {
    label: "Ditolak",
    badgeClass: "bg-error-100 border-error-200",
    textClass: "text-error-700",
    accent: "bg-error-500",
  },
};

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, []),
  );

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(`*, profiles(full_name, phone_number), packages(name)`)
      .order("created_at", { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  };

  const filteredBookings = (() => {
    let result =
      activeTab === "all"
        ? bookings
        : bookings.filter((b) => b.status === activeTab);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((b) => {
        const text = [
          b.id,
          b.status,
          b.location,
          b.event_date,
          b.profiles?.full_name,
          b.profiles?.phone_number,
          b.packages?.name,
          b.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }
    return result;
  })();

  const BookingCard = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] ?? {
      label: item.status,
      badgeClass: "bg-background-100 border-outline-100",
      textClass: "text-typography-600",
      accent: "bg-typography-400",
    };

    const bookedOn = item.created_at
      ? new Date(item.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(admin)/orders/[id]",
            params: { id: item.id },
          })
        }
      >
        <Box className="bg-background-0 p-5 rounded-2xl border border-outline-100 shadow-soft-1 relative overflow-hidden">
          <Box
            className={`absolute left-0 top-0 bottom-0 w-1.5 ${status.accent}`}
          />

          <VStack className="gap-4 pl-2">
            {/* Header: nama klien + badge status */}
            <HStack className="justify-between items-start gap-2">
              <VStack className="flex-1 gap-1">
                <Heading
                  className="text-typography-900 font-extrabold text-lg"
                  numberOfLines={1}
                >
                  {item.profiles?.full_name || "Klien Tidak Dikenal"}
                </Heading>
                <Text
                  className="text-typography-500 text-xs font-bold uppercase tracking-wider"
                  numberOfLines={1}
                >
                  {item.packages?.name || "Paket Dihapus"}
                </Text>
              </VStack>
              <Box
                className={`rounded-full border px-2.5 py-1 shrink-0 ${status.badgeClass}`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wide ${status.textClass}`}
                >
                  {status.label}
                </Text>
              </Box>
            </HStack>

            {/* Detail info */}
            <VStack className="gap-2 bg-background-50 p-3 rounded-xl border border-outline-50">
              <HStack className="items-center gap-2">
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.textSoft}
                />
                <Text
                  className="text-typography-700 text-sm font-medium flex-1"
                  numberOfLines={1}
                >
                  {item.event_date}
                  {item.event_time
                    ? ` • ${item.event_time.slice(0, 5)} WIB`
                    : ""}
                </Text>
              </HStack>
              <HStack className="items-center gap-2">
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.textSoft}
                />
                <Text
                  className="text-typography-700 text-sm font-medium flex-1"
                  numberOfLines={1}
                >
                  {item.location || "-"}
                </Text>
              </HStack>
              {item.profiles?.phone_number && (
                <HStack className="items-center gap-2">
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={theme.textSoft}
                  />
                  <Text
                    className="text-typography-700 text-sm font-medium flex-1"
                    numberOfLines={1}
                  >
                    {item.profiles.phone_number}
                  </Text>
                </HStack>
              )}
              {item.notes && (
                <HStack className="items-start gap-2 mt-1">
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={theme.textSoft}
                  />
                  <Text
                    className="text-typography-500 text-xs flex-1 italic"
                    numberOfLines={2}
                  >
                    "{item.notes}"
                  </Text>
                </HStack>
              )}
            </VStack>

            {/* Footer: tanggal booking + lihat detail */}
            <HStack className="justify-between items-center">
              <Text className="text-typography-400 text-xs">
                Dipesan {bookedOn}
              </Text>
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
          </VStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <VStack className="px-6 pt-8 pb-4 bg-background-50 z-10 gap-1">
        <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
          Admin Control
        </Text>
        <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
          Kelola Pesanan.
        </Heading>
      </VStack>

      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : (
        <ScrollView
          contentContainerClassName="flex-grow pb-12 px-6"
          showsVerticalScrollIndicator={false}
        >
          <Input
            size="md"
            variant="outline"
            className="mb-4 rounded-2xl border-outline-100 bg-background-0"
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
              placeholder="Cari nama klien, paket, lokasi, atau ID"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>

          {/* Filter tabs — horizontal scroll agar semua status muat */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerClassName="gap-2"
          >
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-full ${
                  activeTab === tab.key ? "bg-primary-500" : "bg-background-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === tab.key
                      ? "text-white"
                      : "text-typography-600"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {filteredBookings.length === 0 ? (
            <Box className="bg-background-0 border border-outline-100 rounded-2xl p-6 items-center justify-center border-dashed">
              <Ionicons
                name="receipt-outline"
                size={32}
                color={theme.textSoft}
              />
              <Text className="text-typography-500 text-center text-sm mt-2">
                Tidak ada pesanan di kategori ini.
              </Text>
            </Box>
          ) : (
            <VStack className="gap-4">
              {filteredBookings.map((item) => (
                <BookingCard key={item.id} item={item} />
              ))}
            </VStack>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
