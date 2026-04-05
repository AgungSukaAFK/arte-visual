import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

export default function AdminBookingsScreen() {
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [otherBookings, setOtherBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
      .order("created_at", { ascending: false });

    if (data) {
      // Pisahkan mana yang butuh aksi (pending) dan mana yang sudah diproses
      setPendingBookings(data.filter((b) => b.status === "pending"));
      setOtherBookings(data.filter((b) => b.status !== "pending"));
    }
    setLoading(false);
  };

  const showToast = (
    title: string,
    desc: string,
    type: "success" | "error",
  ) => {
    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast
          nativeID={id}
          action={type}
          variant="solid"
          className="mt-4 px-4 py-3"
        >
          <VStack className="gap-1">
            <ToastTitle className="font-bold text-typography-0">
              {title}
            </ToastTitle>
            <ToastDescription className="text-typography-0">
              {desc}
            </ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const actionName = newStatus === "confirmed" ? "menerima" : "menolak";

    Alert.alert(
      "Konfirmasi Tindakan",
      `Apakah Anda yakin ingin ${actionName} pesanan ini?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Lanjutkan",
          style: newStatus === "cancelled" ? "destructive" : "default",
          onPress: async () => {
            setProcessingId(id);
            const { error } = await supabase
              .from("bookings")
              .update({ status: newStatus })
              .eq("id", id);

            setProcessingId(null);

            if (error) {
              showToast("Gagal Memperbarui", error.message, "error");
            } else {
              showToast(
                "Berhasil",
                `Pesanan telah di-${newStatus}.`,
                "success",
              );
              fetchBookings(); // Refresh list setelah sukses
            }
          },
        },
      ],
    );
  };

  // Komponen Card untuk pesanan agar rapi
  const BookingCard = ({
    item,
    isPending,
  }: {
    item: any;
    isPending: boolean;
  }) => {
    const statusColors: any = {
      pending: "bg-warning-100 text-warning-700",
      confirmed: "bg-primary-100 text-primary-700",
      completed: "bg-success-100 text-success-700",
      cancelled: "bg-error-100 text-error-700",
    };

    return (
      <Box className="bg-background-0 p-5 rounded-2xl border border-outline-100 shadow-soft-1 relative overflow-hidden">
        {/* Dekorasi Garis Pinggir Sesuai Status */}
        <Box
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            item.status === "pending"
              ? "bg-warning-500"
              : item.status === "confirmed"
                ? "bg-primary-500"
                : item.status === "cancelled"
                  ? "bg-error-500"
                  : "bg-success-500"
          }`}
        />

        <VStack className="gap-4 pl-2">
          {/* Header Card: Nama Klien & Status */}
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
              className={`px-2 py-1 rounded-md ${statusColors[item.status].split(" ")[0]}`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${statusColors[item.status].split(" ")[1]}`}
              >
                {item.status}
              </Text>
            </Box>
          </HStack>

          {/* Body Card: Detail Acara */}
          <VStack className="gap-2 bg-background-50 p-3 rounded-xl border border-outline-50">
            <HStack className="items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#737373" />
              <Text className="text-typography-700 text-sm font-medium">
                {item.event_date} • {item.event_time.slice(0, 5)} WIB
              </Text>
            </HStack>
            <HStack className="items-center gap-2">
              <Ionicons name="location-outline" size={16} color="#737373" />
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
                  color="#737373"
                  className="mt-0.5"
                />
                <Text className="text-typography-500 text-xs flex-1 italic">
                  "{item.notes}"
                </Text>
              </HStack>
            )}
          </VStack>

          {/* Footer Card: Tombol Aksi (Hanya muncul jika Pending) */}
          {isPending && (
            <HStack className="gap-3 mt-2">
              <Button
                size="md"
                variant="outline"
                action="negative"
                className="flex-1 rounded-xl border-error-200"
                onPress={() => handleUpdateStatus(item.id, "cancelled")}
                disabled={processingId === item.id}
              >
                <ButtonText className="text-error-600 font-bold">
                  Tolak
                </ButtonText>
              </Button>
              <Button
                size="md"
                className="flex-1 rounded-xl bg-typography-900 shadow-soft-1"
                onPress={() => handleUpdateStatus(item.id, "confirmed")}
                disabled={processingId === item.id}
              >
                {processingId === item.id ? (
                  <ButtonSpinner color="white" />
                ) : (
                  <ButtonText className="font-bold text-typography-0">
                    Terima (ACC)
                  </ButtonText>
                )}
              </Button>
            </HStack>
          )}
        </VStack>
      </Box>
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
          {/* Section 1: Perlu Tindakan (Pending) */}
          <VStack className="gap-4 mb-8">
            <HStack className="items-center gap-2">
              <Heading className="text-lg font-bold text-typography-900">
                Perlu Tindakan
              </Heading>
              <Box className="bg-warning-500 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-typography-0 text-xs font-bold">
                  {pendingBookings.length}
                </Text>
              </Box>
            </HStack>

            {pendingBookings.length === 0 ? (
              <Box className="bg-background-0 border border-outline-100 rounded-2xl p-6 items-center justify-center border-dashed">
                <Ionicons
                  name="cafe-outline"
                  size={32}
                  color="#A3A3A3"
                  className="mb-2"
                />
                <Text className="text-typography-500 text-center text-sm">
                  Tidak ada pesanan baru.
                </Text>
                <Text className="text-typography-400 text-center text-xs">
                  Waktunya ngopi sejenak ☕
                </Text>
              </Box>
            ) : (
              <VStack className="gap-4">
                {pendingBookings.map((item) => (
                  <BookingCard key={item.id} item={item} isPending={true} />
                ))}
              </VStack>
            )}
          </VStack>

          {/* Section 2: Semua Pesanan (Riwayat) */}
          <VStack className="gap-4">
            <Heading className="text-lg font-bold text-typography-900">
              Semua Jadwal & Riwayat
            </Heading>

            {otherBookings.length === 0 ? (
              <Text className="text-typography-400 text-center text-sm mt-4">
                Belum ada riwayat pesanan.
              </Text>
            ) : (
              <VStack className="gap-4">
                {otherBookings.map((item) => (
                  <BookingCard key={item.id} item={item} isPending={false} />
                ))}
              </VStack>
            )}
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
