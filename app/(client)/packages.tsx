import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";

export default function PackageListScreen() {
  // Menangkap parameter tanggal dari halaman kalender sebelumnya
  const { date } = useLocalSearchParams<{ date: string }>();

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    // Menarik semua paket yang statusnya aktif
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true }); // Urutkan dari yang termurah

    if (data) setPackages(data);
    setLoading(false);
  };

  // Fungsi helper untuk memformat angka jadi Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const handleSelectPackage = (pkg: any) => {
    console.log("Paket dipilih:", pkg.name, "untuk tanggal:", date);
    // Nanti diarahkan ke form finalisasi (Checkout/Detail Booking)
    // router.push({ pathname: '/(client)/checkout', params: { date, packageId: pkg.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        showsVerticalScrollIndicator={false}
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

        <VStack className="px-6 mt-4 gap-6">
          {/* Title Section */}
          <VStack className="gap-1 mb-2">
            <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
              Layanan Kami
            </Text>
            <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
              Pilih Paket.
            </Heading>
            {date && (
              <Box className="bg-primary-500/10 self-start px-3 py-1.5 rounded-lg mt-2 border border-primary-500/20">
                <Text className="text-primary-600 font-bold text-sm">
                  Untuk Tanggal: {date}
                </Text>
              </Box>
            )}
          </VStack>

          {/* List Paket (Cards) */}
          {loading ? (
            <Center className="h-[300px]">
              <Spinner size="large" className="text-typography-900" />
            </Center>
          ) : (
            <VStack className="gap-5">
              {packages.map((pkg) => {
                // Parse string JSON features dari Supabase menjadi array
                const featuresArray =
                  typeof pkg.features === "string"
                    ? JSON.parse(pkg.features)
                    : pkg.features;

                return (
                  <Box
                    key={pkg.id}
                    className="bg-background-0 rounded-3xl p-6 shadow-sm border border-outline-100"
                  >
                    <VStack className="gap-4">
                      {/* Nama & Harga */}
                      <VStack className="gap-1">
                        <Heading className="text-xl font-extrabold text-typography-900">
                          {pkg.name}
                        </Heading>
                        <Text className="text-2xl font-black text-primary-500 tracking-tight">
                          {formatRupiah(pkg.price)}
                        </Text>
                      </VStack>

                      {/* Deskripsi */}
                      <Text className="text-typography-500 text-sm leading-relaxed">
                        {pkg.description}
                      </Text>

                      {/* Garis Pemisah (Divider) */}
                      <Box className="h-[1px] bg-outline-100 w-full my-2" />

                      {/* Fitur List */}
                      <VStack className="gap-2.5">
                        <Text className="text-xs font-bold text-typography-900 uppercase tracking-widest">
                          Termasuk:
                        </Text>
                        {featuresArray?.map((feature: string, idx: number) => (
                          <HStack key={idx} className="items-start gap-3">
                            <Text className="text-primary-500 font-bold mt-0.5">
                              ✓
                            </Text>
                            <Text className="text-typography-700 text-sm flex-1">
                              {feature}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>

                      {/* Tombol Pilih */}
                      <Button
                        size="xl"
                        className="rounded-xl mt-4 bg-typography-900 active:bg-typography-800"
                        onPress={() => handleSelectPackage(pkg)}
                      >
                        <ButtonText className="font-bold text-typography-0">
                          Pilih Paket Ini
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
