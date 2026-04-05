import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

// Gluestack Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";

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

  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookedDates();
  }, [colorScheme]);

  const fetchBookedDates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("event_date, status")
      .neq("status", "cancelled");

    if (data) {
      let dates: any = {};
      const confirmedColor = isDark ? "#FFFFFF" : "#181718";
      const pendingColor = isDark ? "#737373" : "#A3A3A3";

      data.forEach((booking) => {
        dates[booking.event_date] = {
          marked: true,
          dotColor:
            booking.status === "confirmed" ? confirmedColor : pendingColor,
          disableTouchEvent: true,
        };
      });

      // Data dummy
      dates["2026-04-10"] = {
        marked: true,
        dotColor: confirmedColor,
        disableTouchEvent: true,
      };
      dates["2026-04-15"] = { marked: true, dotColor: pendingColor };

      setMarkedDates(dates);
    }
    setLoading(false);
  };

  const handleDayPress = (day: any) => {
    console.log("Tanggal dipilih:", day.dateString);
    router.push({
      pathname: "/(client)/packages",
      params: { date: day.dateString },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Bar dengan Tombol Back */}
        <HStack className="w-full px-6 pt-4 pb-2 items-center">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 active:opacity-60 py-2"
          >
            <Text className="text-typography-900 text-xl font-bold">←</Text>
            <Text className="text-typography-900 font-medium">Kembali</Text>
          </Pressable>
        </HStack>

        <VStack className="px-6 mt-4 gap-8">
          {/* Header Title Section */}
          <VStack className="gap-1">
            <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
              Arte Calendar
            </Text>
            <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
              Pilih Tanggal{"\n"}Momen Terbaikmu.
            </Heading>
          </VStack>

          {/* Calendar Section */}
          <Box className="bg-background-0 rounded-3xl p-2 shadow-sm border border-outline-100">
            {loading ? (
              <Center className="h-[300px]">
                <Spinner size="large" className="text-typography-900" />
              </Center>
            ) : (
              <Calendar
                onDayPress={handleDayPress}
                markedDates={markedDates}
                minDate={new Date().toDateString()}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: isDark ? "#A3A3A3" : "#737373",
                  selectedDayBackgroundColor: isDark ? "#FFFFFF" : "#181718",
                  selectedDayTextColor: isDark ? "#181718" : "#FFFFFF",
                  todayTextColor: isDark ? "#60A5FA" : "#2563eb",
                  dayTextColor: isDark ? "#E5E5E5" : "#181718",
                  textDisabledColor: isDark ? "#404040" : "#D4D4D4",
                  arrowColor: isDark ? "#FFFFFF" : "#181718",
                  monthTextColor: isDark ? "#FFFFFF" : "#181718",
                  textMonthFontWeight: "bold",
                  textDayHeaderFontWeight: "600",
                }}
              />
            )}
          </Box>

          {/* Legend / Keterangan */}
          <VStack className="bg-background-0 p-5 rounded-2xl shadow-sm border border-outline-100 gap-3">
            <Text className="font-bold text-typography-900 mb-1">
              Keterangan Kalender
            </Text>
            <HStack className="items-center gap-3">
              <Box className="w-3 h-3 rounded-full bg-typography-900" />
              <Text className="text-typography-500 text-sm">
                Jadwal Penuh (Confirmed)
              </Text>
            </HStack>
            <HStack className="items-center gap-3">
              <Box className="w-3 h-3 rounded-full bg-typography-400" />
              <Text className="text-typography-500 text-sm">
                Menunggu Konfirmasi (Pending)
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
