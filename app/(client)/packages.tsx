import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

export default function PackageListScreen() {
  // Menangkap parameter tanggal (hanya ada jika dilempar dari Modal Kalender)
  const { date } = useLocalSearchParams<{ date: string }>();

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (data) setPackages(data);
    setLoading(false);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const handleSelectPackage = (pkg: any) => {
    if (!date) {
      // Jika user buka dari Tab Bawah langsung, arahkan ke Kalender dulu
      if (!toast.isActive("missing-date")) {
        toast.show({
          id: "missing-date",
          placement: "top",
          render: ({ id }) => (
            <Toast
              nativeID={id}
              action="warning"
              variant="solid"
              className="mt-4 px-4 py-3 bg-typography-900"
            >
              <VStack className="gap-1">
                <ToastTitle className="font-bold text-typography-0">
                  Pilih Tanggal Dulu
                </ToastTitle>
                <ToastDescription className="text-typography-0">
                  Silakan pilih tanggal acara di kalender sebelum memilih paket.
                </ToastDescription>
              </VStack>
            </Toast>
          ),
        });
      }
      router.push("/(client)/calendar");
      return;
    }

    // Jika membawa tanggal, lanjut ke form finalisasi
    router.push({
      pathname: "/(client)/booking",
      params: { date, packageId: pkg.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="px-6 pt-8 gap-6">
          {/* Title Section */}
          <VStack className="gap-1 mb-2">
            <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
              Layanan & Harga
            </Text>
            <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
              Pilih Paket Terbaik.
            </Heading>

            {/* Indikator jika sedang dalam proses booking (membawa tanggal) */}
            {date && (
              <HStack className="items-center gap-2 mt-3 bg-primary-50 px-3 py-2 rounded-xl border border-primary-100 self-start">
                <Ionicons name="calendar" size={16} color="#0284c7" />
                <Text className="text-primary-700 font-bold text-sm">
                  Untuk Tanggal: {date}
                </Text>
              </HStack>
            )}
          </VStack>

          {/* List Paket (Cards) */}
          {loading ? (
            <Center className="h-[300px]">
              <Spinner size="large" className="text-typography-900" />
            </Center>
          ) : (
            <VStack className="gap-6">
              {packages.map((pkg) => {
                const featuresArray =
                  typeof pkg.features === "string"
                    ? JSON.parse(pkg.features)
                    : pkg.features;
                const hasDiscount =
                  pkg.original_price && pkg.original_price > pkg.price;

                return (
                  <Box
                    key={pkg.id}
                    className="bg-background-0 rounded-3xl p-6 shadow-soft-2 border border-outline-100 relative overflow-hidden"
                  >
                    {/* Efek Garis Desain di ujung card agar mewah */}
                    <Box className="absolute top-0 right-0 w-16 h-16 bg-primary-500/10 rounded-bl-[60px]" />

                    <VStack className="gap-5">
                      {/* Header Card: Nama & Badge */}
                      <VStack className="gap-2 items-start">
                        {pkg.badge && (
                          <Box className="bg-typography-900 px-3 py-1 rounded-full">
                            <Text className="text-typography-0 text-[10px] font-bold uppercase tracking-widest">
                              {pkg.badge}
                            </Text>
                          </Box>
                        )}
                        <Heading className="text-xl font-extrabold text-typography-900 leading-tight">
                          {pkg.name}
                        </Heading>
                      </VStack>

                      {/* Harga Section */}
                      <VStack className="gap-0.5">
                        {hasDiscount && (
                          <Text className="text-typography-400 text-sm font-bold line-through">
                            {formatRupiah(pkg.original_price)}
                          </Text>
                        )}
                        <Text className="text-3xl font-black text-primary-500 tracking-tight">
                          {formatRupiah(pkg.price)}
                        </Text>
                      </VStack>

                      {/* Deskripsi */}
                      <Text className="text-typography-500 text-sm leading-relaxed">
                        {pkg.description}
                      </Text>

                      <Box className="h-[1px] bg-outline-100 w-full" />

                      {/* Fitur List */}
                      <VStack className="gap-3">
                        <Text className="text-xs font-bold text-typography-900 uppercase tracking-widest">
                          Yang Anda Dapatkan:
                        </Text>
                        {featuresArray?.map((feature: string, idx: number) => (
                          <HStack key={idx} className="items-center gap-3">
                            <Box className="w-5 h-5 rounded-full bg-primary-50 items-center justify-center">
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#0284c7"
                              />
                            </Box>
                            <Text className="text-typography-700 text-sm flex-1">
                              {feature}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>

                      {/* Tombol Pilih */}
                      <Button
                        size="xl"
                        className={`rounded-2xl mt-2 shadow-soft-1 ${date ? "bg-primary-500" : "bg-typography-900"}`}
                        onPress={() => handleSelectPackage(pkg)}
                      >
                        <ButtonText className="font-bold text-typography-0">
                          {date ? "Pilih & Lanjut Booking" : "Pilih Paket Ini"}
                        </ButtonText>
                      </Button>
                    </VStack>
                  </Box>
                );
              })}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
