import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useColorScheme } from "nativewind";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// Gluestack Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";

// Konfigurasi Bahasa Indonesia
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

export default function ArteCalendar() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  // State untuk Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [dateDetails, setDateDetails] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookedDates();
    }, [colorScheme]),
  );

  const fetchBookedDates = async () => {
    setLoading(true);
    // Mengambil jadwal yang sudah ada untuk ditampilkan di kalender
    const { data, error } = await supabase
      .from("bookings")
      .select("id, event_date, event_time, status")
      .neq("status", "cancelled");

    if (data) {
      setAllBookings(data);
      let dates: any = {};

      const confirmedColor = isDark ? "#FFFFFF" : "#181718";
      const pendingColor = isDark ? "#737373" : "#A3A3A3";

      data.forEach((booking) => {
        dates[booking.event_date] = {
          marked: true,
          dotColor:
            booking.status === "confirmed" ? confirmedColor : pendingColor,
          // Hapus disableTouchEvent agar semua tanggal bisa diklik untuk dilihat infonya
        };
      });
      setMarkedDates(dates);
    }
    setLoading(false);
  };

  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    // Cari semua acara pada tanggal yang diklik
    const schedulesOnDate = allBookings.filter((b) => b.event_date === dateStr);
    setDateDetails(schedulesOnDate);

    // Munculkan Modal
    setShowModal(true);
  };

  const navigateToBooking = () => {
    setShowModal(false);
    // Arahkan ke halaman paket dengan membawa data tanggal
    router.push({
      pathname: "/(client)/packages",
      params: { date: selectedDate },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="px-6 pt-8 gap-8">
          {/* Header Title Section */}
          <VStack className="gap-1">
            <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
              Jadwal & Ketersediaan
            </Text>
            <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
              Eksplorasi{"\n"}Arte Calendar.
            </Heading>
          </VStack>

          {/* Calendar Section - Diperbesar dengan p-4 */}
          <Box className="bg-background-0 rounded-3xl p-4 shadow-hard-5 border border-outline-100">
            {loading ? (
              <Center className="h-[350px]">
                <Spinner size="large" className="text-typography-900" />
              </Center>
            ) : (
              <Calendar
                onDayPress={handleDayPress}
                markedDates={{
                  ...markedDates,
                  // Menambahkan highlight bulat untuk tanggal yang sedang di-klik
                  [selectedDate]: {
                    ...markedDates[selectedDate],
                    selected: true,
                    disableTouchEvent: false,
                    selectedColor: isDark ? "#333333" : "#F1F5F9", // Warna kotak saat dipilih
                    selectedTextColor: isDark ? "#FFFFFF" : "#0F172A",
                  },
                }}
                minDate={new Date().toDateString()}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: isDark ? "#A3A3A3" : "#737373",
                  todayTextColor: isDark ? "#60A5FA" : "#2563eb",
                  dayTextColor: isDark ? "#E5E5E5" : "#181718",
                  textDisabledColor: isDark ? "#404040" : "#D4D4D4",
                  arrowColor: isDark ? "#FFFFFF" : "#181718",
                  monthTextColor: isDark ? "#FFFFFF" : "#181718",
                  textMonthFontWeight: "900",
                  textDayHeaderFontWeight: "600",
                  textDayFontSize: 16, // Membesarkan angka hari
                  textMonthFontSize: 20, // Membesarkan nama bulan
                }}
              />
            )}
          </Box>

          {/* Legend / Keterangan */}
          <VStack className="bg-background-0 p-5 rounded-2xl shadow-sm border border-outline-100 gap-3">
            <Text className="font-bold text-typography-900 mb-1 text-base">
              Keterangan Jadwal
            </Text>
            <HStack className="items-center gap-3">
              <Box className="w-3 h-3 rounded-full bg-typography-900" />
              <Text className="text-typography-600 text-sm">
                Terdapat Jadwal Confirmed
              </Text>
            </HStack>
            <HStack className="items-center gap-3">
              <Box className="w-3 h-3 rounded-full bg-typography-400" />
              <Text className="text-typography-600 text-sm">
                Terdapat Antrean Pending
              </Text>
            </HStack>
            <Box className="mt-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <Text className="text-primary-800 text-xs text-center">
                Klik pada tanggal mana saja untuk melihat detail jadwal atau
                memulai pesanan.
              </Text>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Modal Interaktif untuk Detail Tanggal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent className="bg-background-0 rounded-3xl p-4">
          <ModalHeader className="border-b border-outline-100 pb-4">
            <VStack>
              <Text className="text-typography-500 text-xs uppercase tracking-widest font-bold">
                Detail Tanggal
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

          <ModalBody className="py-6">
            <VStack className="gap-4">
              <Text className="font-bold text-typography-900 mb-2">
                Aktivitas di tanggal ini:
              </Text>

              {dateDetails.length === 0 ? (
                <Box className="bg-background-50 p-6 rounded-2xl border border-outline-100 border-dashed items-center">
                  <Ionicons
                    name="calendar-clear-outline"
                    size={32}
                    color="#A3A3A3"
                    className="mb-2"
                  />
                  <Text className="text-typography-500 text-center text-sm">
                    Jadwal masih kosong. Jadilah yang pertama memesan di tanggal
                    ini!
                  </Text>
                </Box>
              ) : (
                <VStack className="gap-3">
                  {dateDetails.map((detail, idx) => (
                    <HStack
                      key={idx}
                      className="bg-background-50 p-4 rounded-xl border border-outline-100 items-center gap-4"
                    >
                      <Box className="bg-typography-900 px-3 py-1.5 rounded-lg">
                        <Text className="text-typography-0 font-bold text-xs">
                          {detail.event_time.slice(0, 5)}
                        </Text>
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-typography-900 font-bold text-sm">
                          Sesi Foto/Video
                        </Text>
                        <Text
                          className={`text-xs font-bold uppercase mt-1 ${detail.status === "confirmed" ? "text-primary-600" : "text-warning-600"}`}
                        >
                          Status: {detail.status}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter className="border-t border-outline-100 pt-4">
            <Button
              size="xl"
              className="w-full rounded-2xl bg-primary-500 shadow-soft-1"
              onPress={navigateToBooking}
            >
              <ButtonText className="font-bold text-typography-0 text-base">
                Buat Pesanan di Tanggal Ini
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
