import React, { useState } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

// Gluestack UI Components
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

export default function AdminBookingsScreen() {
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [otherBookings, setOtherBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "pending" | "paid" | "completed" | "all"
  >("all");
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);

  // Auto-refresh setiap kali tab dibuka
  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, []),
  );

  const fetchBookings = async () => {
    setLoading(true);

    // Tarik data booking + relasi profil (nama klien) + relasi paket (nama paket)
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles(full_name, phone_number),
        packages(name)
      `,
      )
      .order("created_at", { ascending: true });

    if (data) {
      // Pisahkan mana yang butuh aksi (pending) dan mana yang sudah diproses
      setPendingBookings(data.filter((b) => b.status === "pending"));
      setOtherBookings(data.filter((b) => b.status !== "pending"));
    }
    setLoading(false);
  };

  // Komponen Card untuk pesanan agar rapi
  const BookingCard = ({ item }: { item: any }) => {
    const statusConfig: Record<
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
    const status = statusConfig[item.status] ?? {
      label: item.status,
      badgeClass: "bg-background-100 border-outline-100",
      textClass: "text-typography-600",
      accent: "bg-typography-400",
    };

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
            <HStack className="justify-between items-start">
              <VStack className="flex-1 mr-2 gap-1">
                <Heading
                  className="text-typography-900 font-extrabold text-lg"
                  numberOfLines={1}
                >
                  {item.profiles?.full_name || "Klien Tidak Dikenal"}
                </Heading>
                <Text className="text-typography-500 text-xs font-bold uppercase tracking-wider">
                  {item.packages?.name || "Paket Dihapus"}
                </Text>
              </VStack>
              <Box
                className={`rounded-full border px-2.5 py-1 ${status.badgeClass}`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wide ${status.textClass}`}
                >
                  {status.label}
                </Text>
              </Box>
            </HStack>

            <VStack className="gap-2 bg-background-50 p-3 rounded-xl border border-outline-50">
              <HStack className="items-center gap-2">
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.textSoft}
                />
                <Text className="text-typography-700 text-sm font-medium">
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
                  className="text-typography-700 text-sm font-medium"
                  numberOfLines={2}
                >
                  {item.location}
                </Text>
              </HStack>
              {item.notes && (
                <HStack className="items-start gap-2 mt-1">
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={theme.textSoft}
                  />
                  <Text className="text-typography-500 text-xs flex-1 italic">
                    "{item.notes}"
                  </Text>
                </HStack>
              )}
            </VStack>

            <HStack className="justify-end items-center gap-1">
              <Text className="text-primary-600 text-xs font-black">
                Lihat Detail
              </Text>
              <Ionicons name="chevron-forward" size={12} color={theme.accent} />
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
              placeholder="Cari nama klien, paket, lokasi, atau ID pesanan"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>

          <HStack className="gap-2 mb-4 flex-wrap">
            {(["all", "pending", "paid", "completed"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full ${
                  activeTab === tab ? "bg-primary-500" : "bg-background-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === tab ? "text-white" : "text-typography-600"
                  }`}
                >
                  {tab === "pending"
                    ? "Pending"
                    : tab === "paid"
                      ? "Sudah Bayar"
                      : tab === "completed"
                        ? "Selesai"
                        : "Semua"}
                </Text>
              </Pressable>
            ))}
          </HStack>

          {(() => {
            const allBookings = [...pendingBookings, ...otherBookings];
            let filteredBookings = allBookings;

            if (activeTab === "pending") {
              filteredBookings = allBookings.filter(
                (booking) => booking.status === "pending",
              );
            } else if (activeTab === "paid") {
              filteredBookings = allBookings.filter((booking) =>
                ["dp_paid", "fully_paid"].includes(booking.status),
              );
            } else if (activeTab === "completed") {
              filteredBookings = allBookings.filter(
                (booking) => booking.status === "completed",
              );
            }

            const normalizedQuery = searchQuery.trim().toLowerCase();

            if (normalizedQuery) {
              filteredBookings = filteredBookings.filter((booking) => {
                const searchableText = [
                  booking.id,
                  booking.status,
                  booking.location,
                  booking.event_date,
                  booking.profiles?.full_name,
                  booking.profiles?.phone_number,
                  booking.packages?.name,
                  booking.notes,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

                return searchableText.includes(normalizedQuery);
              });
            }

            if (activeTab === "all") {
              const pendingFirst = filteredBookings.filter(
                (booking) => booking.status === "pending",
              );
              const remaining = filteredBookings.filter(
                (booking) => booking.status !== "pending",
              );
              filteredBookings = [...pendingFirst, ...remaining];
            }

            if (filteredBookings.length === 0) {
              return (
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
              );
            }

            return (
              <VStack className="gap-4">
                {filteredBookings.map((item) => (
                  <BookingCard key={item.id} item={item} />
                ))}
              </VStack>
            );
          })()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
