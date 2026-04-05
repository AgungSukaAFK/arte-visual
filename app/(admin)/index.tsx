import React, { useState } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Calendar, LocaleConfig } from "react-native-calendars";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";

// Konfigurasi Bahasa Indonesia untuk Kalender
LocaleConfig.locales["id"] = {
  monthNames: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
  dayNames: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  dayNamesShort: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  today: "Hari ini",
};
LocaleConfig.defaultLocale = "id";

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminName = user?.user_metadata?.full_name || "Super Admin";

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#FFFFFF" : "#181718";

  // State Statistik
  const [stats, setStats] = useState({
    users: 0,
    packages: 0,
    pendingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Kalender
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  // State Modal Detail Tanggal
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [dateDetails, setDateDetails] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [colorScheme]),
  );

  const fetchDashboardData = async () => {
    setLoading(true);

    // Tarik statistik umum
    const [usersReq, packagesReq, pendingReq, recentReq, calendarReq] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "client"),
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("bookings")
          .select("id, event_date, status, profiles(full_name), packages(name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(3),
        // Tarik semua data booking untuk kalender (kecuali yang dibatalkan)
        supabase
          .from("bookings")
          .select(
            "id, event_date, event_time, status, profiles(full_name), packages(name)",
          )
          .neq("status", "cancelled"),
      ]);

    setStats({
      users: usersReq.count || 0,
      packages: packagesReq.count || 0,
      pendingBookings: pendingReq.count || 0,
    });

    if (recentReq.data) setRecentBookings(recentReq.data);

    // Proses Data Kalender
    if (calendarReq.data) {
      setAllBookings(calendarReq.data);
      let dates: any = {};

      const confirmedColor = isDark ? "#38bdf8" : "#0284c7"; // Biru Primary
      const pendingColor = isDark ? "#facc15" : "#eab308"; // Kuning Warning
      const completedColor = isDark ? "#4ade80" : "#22c55e"; // Hijau Success

      calendarReq.data.forEach((booking) => {
        let dotColor = pendingColor;
        if (booking.status === "confirmed") dotColor = confirmedColor;
        if (booking.status === "completed") dotColor = completedColor;

        dates[booking.event_date] = {
          marked: true,
          dotColor: dotColor,
        };
      });
      setMarkedDates(dates);
    }

    setLoading(false);
  };

  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    const schedulesOnDate = allBookings.filter((b) => b.event_date === dateStr);
    setDateDetails(schedulesOnDate);

    setShowModal(true);
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
              <Avatar size="md" className="bg-typography-900">
                <AvatarFallbackText className="text-typography-0">
                  {adminName}
                </AvatarFallbackText>
              </Avatar>
              <VStack>
                <Text className="text-typography-500 font-medium text-xs tracking-widest uppercase">
                  Command Center
                </Text>
                <Heading className="text-xl font-extrabold text-typography-900">
                  {adminName}
                </Heading>
              </VStack>
            </HStack>

            {/* Aksi Kanan: Notifikasi & Settings */}
            <HStack className="items-center gap-3">
              <Pressable
                onPress={() => console.log("Buka Notifikasi Admin")}
                className="active:opacity-60 relative bg-background-0 p-2 rounded-full border border-outline-100"
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={iconColor}
                />
                {/* Red Dot Indicator (Aktif jika ada pending booking) */}
                {stats.pendingBookings > 0 && (
                  <Box className="absolute top-0 right-0 w-2.5 h-2.5 bg-error-500 rounded-full border-2 border-background-0" />
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push("/(admin)/settings")}
                className="active:opacity-60 bg-background-0 p-2 rounded-full border border-outline-100"
              >
                <Ionicons name="settings-outline" size={20} color={iconColor} />
              </Pressable>
            </HStack>
          </HStack>

          {/* Quick Stats Section */}
          <VStack className="gap-3">
            <Heading className="text-lg font-bold text-typography-900">
              Ringkasan Sistem
            </Heading>
            {loading ? (
              <Center className="h-24 bg-background-0 rounded-2xl border border-outline-100">
                <Spinner size="small" />
              </Center>
            ) : (
              <HStack className="gap-3">
                <Box className="flex-1 bg-primary-50 p-4 rounded-2xl shadow-sm border border-primary-100">
                  <Text className="text-primary-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Pesanan Baru
                  </Text>
                  <Heading className="text-3xl font-black text-primary-700">
                    {stats.pendingBookings}
                  </Heading>
                </Box>
                <Box className="flex-1 bg-background-0 p-4 rounded-2xl shadow-sm border border-outline-100">
                  <Text className="text-typography-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Klien
                  </Text>
                  <Heading className="text-3xl font-black text-typography-900">
                    {stats.users}
                  </Heading>
                </Box>
                <Box className="flex-1 bg-background-0 p-4 rounded-2xl shadow-sm border border-outline-100">
                  <Text className="text-typography-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Paket
                  </Text>
                  <Heading className="text-3xl font-black text-typography-900">
                    {stats.packages}
                  </Heading>
                </Box>
              </HStack>
            )}
          </VStack>

          {/* ARTE CALENDAR ADMIN */}
          <VStack className="gap-3">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-bold text-typography-900">
                Kalender Pemotretan
              </Heading>
            </HStack>
            <Box className="bg-background-0 rounded-3xl p-3 shadow-soft-1 border border-outline-100">
              {loading ? (
                <Center className="h-[300px]">
                  <Spinner size="large" className="text-typography-900" />
                </Center>
              ) : (
                <Calendar
                  onDayPress={handleDayPress}
                  markedDates={{
                    ...markedDates,
                    [selectedDate]: {
                      ...markedDates[selectedDate],
                      selected: true,
                      selectedColor: isDark ? "#333333" : "#F1F5F9",
                      selectedTextColor: isDark ? "#FFFFFF" : "#0F172A",
                    },
                  }}
                  theme={{
                    backgroundColor: "transparent",
                    calendarBackground: "transparent",
                    textSectionTitleColor: isDark ? "#A3A3A3" : "#737373",
                    todayTextColor: isDark ? "#60A5FA" : "#2563eb",
                    dayTextColor: isDark ? "#E5E5E5" : "#181718",
                    textDisabledColor: isDark ? "#404040" : "#D4D4D4",
                    arrowColor: isDark ? "#FFFFFF" : "#181718",
                    monthTextColor: isDark ? "#FFFFFF" : "#181718",
                    textMonthFontWeight: "bold",
                    textDayFontSize: 14,
                  }}
                />
              )}
            </Box>
          </VStack>

          {/* Quick Action: Pending Bookings */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-bold text-typography-900">
                Perlu Tindakan Cepat
              </Heading>
              <Pressable onPress={() => router.push("/(admin)/bookings")}>
                <Text className="text-primary-500 font-bold text-sm">
                  Lihat Semua
                </Text>
              </Pressable>
            </HStack>

            {loading ? (
              <Center className="py-6">
                <Spinner size="large" className="text-typography-900" />
              </Center>
            ) : recentBookings.length === 0 ? (
              <Box className="bg-background-0 border border-outline-100 rounded-2xl p-8 items-center justify-center border-dashed">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color="#10b981"
                  className="mb-2"
                />
                <Text className="text-typography-500 text-center text-sm">
                  Tidak ada pesanan pending.
                </Text>
                <Text className="text-typography-400 text-center text-xs mt-1">
                  Semua jadwal sudah terkendali.
                </Text>
              </Box>
            ) : (
              <VStack className="gap-3">
                {recentBookings.map((order) => (
                  <Pressable
                    key={order.id}
                    onPress={() => router.push("/(admin)/bookings")}
                    className="active:opacity-70"
                  >
                    <HStack className="bg-background-0 p-4 rounded-2xl shadow-soft-1 border border-outline-100 items-center justify-between">
                      <VStack className="flex-1 mr-3">
                        <HStack className="items-center gap-2 mb-1">
                          <Box className="bg-warning-100 px-2 py-0.5 rounded-md">
                            <Text className="text-warning-700 text-[10px] font-bold uppercase">
                              Pending
                            </Text>
                          </Box>
                          <Text className="text-typography-500 text-xs font-medium">
                            {order.event_date}
                          </Text>
                        </HStack>
                        <Heading
                          className="text-typography-900 font-bold text-sm"
                          numberOfLines={1}
                        >
                          {order.profiles?.full_name || "Klien"}
                        </Heading>
                        <Text
                          className="text-typography-500 text-xs"
                          numberOfLines={1}
                        >
                          {order.packages?.name}
                        </Text>
                      </VStack>
                      <Box className="w-8 h-8 rounded-full bg-background-50 items-center justify-center">
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={iconColor}
                        />
                      </Box>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL DETAIL JADWAL KALENDER */}
      {/* ================================================================= */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-2 max-h-[80%]">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <VStack>
              <Text className="text-typography-500 text-xs uppercase tracking-widest font-bold">
                Jadwal Harian
              </Text>
              <Heading className="text-typography-900 text-xl font-black">
                {selectedDate}
              </Heading>
            </VStack>
            <ModalCloseButton>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFF" : "#000"}
              />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody className="py-4">
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack className="gap-3">
                {dateDetails.length === 0 ? (
                  <Box className="bg-background-50 p-6 rounded-2xl border border-outline-100 border-dashed items-center mt-2">
                    <Ionicons
                      name="cafe-outline"
                      size={32}
                      color="#A3A3A3"
                      className="mb-2"
                    />
                    <Text className="text-typography-500 text-center text-sm">
                      Tidak ada jadwal pemotretan.
                    </Text>
                  </Box>
                ) : (
                  dateDetails.map((detail, idx) => {
                    // Warna dinamis sesuai status
                    const statusColors: any = {
                      pending: "bg-warning-100 text-warning-700",
                      confirmed: "bg-primary-100 text-primary-700",
                      completed: "bg-success-100 text-success-700",
                    };

                    return (
                      <HStack
                        key={idx}
                        className="bg-background-0 p-4 rounded-xl border border-outline-100 items-center gap-3 shadow-soft-1"
                      >
                        <VStack className="items-center justify-center bg-typography-900 px-3 py-2 rounded-lg min-w-[65px]">
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#FFF"
                          />
                          <Text className="text-typography-0 font-bold text-[11px] mt-1">
                            {detail.event_time.slice(0, 5)}
                          </Text>
                        </VStack>
                        <VStack className="flex-1 gap-1">
                          <Heading
                            className="text-typography-900 font-bold text-sm"
                            numberOfLines={1}
                          >
                            {detail.profiles?.full_name || "Klien"}
                          </Heading>
                          <Text
                            className="text-typography-500 text-xs"
                            numberOfLines={1}
                          >
                            {detail.packages?.name}
                          </Text>
                          <Box
                            className={`self-start px-2 py-0.5 mt-1 rounded ${statusColors[detail.status].split(" ")[0]}`}
                          >
                            <Text
                              className={`text-[9px] font-bold uppercase ${statusColors[detail.status].split(" ")[1]}`}
                            >
                              {detail.status}
                            </Text>
                          </Box>
                        </VStack>
                      </HStack>
                    );
                  })
                )}
              </VStack>
            </ScrollView>
          </ModalBody>

          <ModalFooter className="border-t border-outline-100 pt-4">
            <Button
              size="xl"
              variant="outline"
              className="w-full rounded-2xl border-outline-300"
              onPress={() => {
                setShowModal(false);
                router.push("/(admin)/bookings");
              }}
            >
              <ButtonText className="font-bold text-typography-900 text-base">
                Kelola Pesanan
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
