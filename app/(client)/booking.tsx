import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

export default function BookingScreen() {
  const { date, packageId } = useLocalSearchParams<{
    date: string;
    packageId: string;
  }>();
  const { user } = useAuth();
  const toast = useToast();
  const TOAST_ID = "booking-action-toast";

  const [pkg, setPkg] = useState<any>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  // Form State
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (packageId) fetchPackageDetails();
  }, [packageId]);

  const fetchPackageDetails = async () => {
    setLoadingInit(true);
    const { data } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .single();
    if (data) setPkg(data);
    setLoadingInit(false);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const showToast = (
    title: string,
    description: string,
    action: "success" | "error",
  ) => {
    if (!toast.isActive(TOAST_ID)) {
      toast.show({
        id: TOAST_ID,
        placement: "top",
        render: ({ id }) => (
          <Toast
            nativeID={id}
            action={action}
            variant="solid"
            className="mt-4 px-4 py-3"
          >
            <VStack className="gap-1">
              <ToastTitle className="font-bold text-typography-0">
                {title}
              </ToastTitle>
              <ToastDescription className="text-typography-0">
                {description}
              </ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    }
  };

  const handleBooking = async () => {
    if (!eventTime || !location) {
      return showToast(
        "Data Belum Lengkap",
        "Waktu dan lokasi acara wajib diisi.",
        "error",
      );
    }

    // Validasi format jam sederhana (HH:MM) agar tidak error di database
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(eventTime)) {
      return showToast(
        "Format Waktu Salah",
        "Gunakan format 24 Jam, contoh: 09:00 atau 15:30",
        "error",
      );
    }

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      client_id: user?.id,
      package_id: packageId,
      event_date: date,
      event_time: `${eventTime}:00`, // Tambah detik agar sesuai format SQL TIME
      location,
      notes,
      status: "pending", // Default status menunggu konfirmasi admin
    });
    setSubmitting(false);

    if (error) {
      showToast("Gagal Memesan", error.message, "error");
    } else {
      showToast(
        "Pesanan Berhasil!",
        "Tim kami akan segera mengonfirmasi jadwalmu.",
        "success",
      );
      router.replace("/(client)"); // Kembalikan ke Dashboard
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background-50"
    >
      <SafeAreaView className="flex-1">
        {/* Header Bar dengan Tombol Back */}
        <HStack className="w-full px-6 pt-4 pb-2 items-center bg-background-50 z-10">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 active:opacity-60 py-2"
          >
            <Text className="text-typography-900 text-xl font-bold">←</Text>
            <Text className="text-typography-900 font-medium">Kembali</Text>
          </Pressable>
        </HStack>

        <ScrollView
          contentContainerClassName="flex-grow pb-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loadingInit ? (
            <Center className="flex-1 mt-20">
              <Spinner size="large" className="text-typography-900" />
              <Text className="text-typography-500 mt-4">
                Menyiapkan form pesanan...
              </Text>
            </Center>
          ) : (
            <VStack className="px-6 mt-4 gap-8">
              <VStack className="gap-1">
                <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
                  Tahap Terakhir
                </Text>
                <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
                  Finalisasi.
                </Heading>
              </VStack>

              {/* Ringkasan Pesanan Card (Struk Mini) */}
              <Box className="bg-typography-900 rounded-2xl p-5 shadow-soft-2">
                <Text className="text-typography-0/70 text-xs font-bold uppercase tracking-widest mb-3">
                  Ringkasan Pesanan
                </Text>
                <VStack className="gap-3">
                  <HStack className="justify-between items-center">
                    <Text className="text-typography-0/80 text-sm">
                      Tanggal Acara
                    </Text>
                    <Text className="text-typography-0 font-bold">{date}</Text>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Text className="text-typography-0/80 text-sm">
                      Paket Dipilih
                    </Text>
                    <Text className="text-typography-0 font-bold">
                      {pkg?.name}
                    </Text>
                  </HStack>
                  <Box className="h-[1px] bg-typography-0/20 w-full my-1" />
                  <HStack className="justify-between items-center">
                    <Text className="text-typography-0/80 text-sm">
                      Total Estimasi
                    </Text>
                    <Text className="text-primary-400 font-black text-lg">
                      {formatRupiah(pkg?.price)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Form Inputs */}
              <VStack className="gap-5">
                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Waktu Acara (Mulai){" "}
                    <Text className="text-error-500">*</Text>
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300 bg-background-0"
                  >
                    <InputField
                      placeholder="Contoh: 09:00"
                      value={eventTime}
                      onChangeText={setEventTime}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>

                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Lokasi Acara <Text className="text-error-500">*</Text>
                  </Text>
                  <Input
                    variant="outline"
                    size="xl"
                    className="rounded-xl border-outline-300 bg-background-0"
                  >
                    <InputField
                      placeholder="Nama Gedung / Alamat Lengkap"
                      value={location}
                      onChangeText={setLocation}
                      className="px-4 text-typography-900"
                    />
                  </Input>
                </VStack>

                <VStack className="gap-2">
                  <Text className="text-typography-900 font-bold text-sm">
                    Catatan Khusus (Opsional)
                  </Text>
                  <Textarea
                    size="md"
                    className="rounded-xl border-outline-300 bg-background-0"
                  >
                    <TextareaInput
                      placeholder="Misal: Mohon fokus ambil foto di area pelaminan ya..."
                      value={notes}
                      onChangeText={setNotes}
                      className="px-4 py-3 text-typography-900 h-24"
                    />
                  </Textarea>
                </VStack>
              </VStack>

              {/* Submit Button */}
              <Button
                size="xl"
                onPress={handleBooking}
                disabled={submitting}
                className={`rounded-xl mt-4 bg-primary-500 shadow-soft-1 ${submitting ? "opacity-70" : ""}`}
              >
                {submitting ? (
                  <ButtonSpinner className="mr-2" color="white" />
                ) : null}
                <ButtonText className="font-bold text-typography-0">
                  {submitting ? "Memproses..." : "Konfirmasi Pesanan"}
                </ButtonText>
              </Button>
            </VStack>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
