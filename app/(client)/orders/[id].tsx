import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import { getAppTheme } from "../../../constants/theme";

const { width } = Dimensions.get("window");

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const iconColor = theme.icon;

  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [dpPercent, setDpPercent] = useState(50);
  const [showDpDropdown, setShowDpDropdown] = useState(false);

  const dpOptions = [50, 60, 70, 80, 90, 100];

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*, packages(*)")
      .eq("id", id)
      .single();

    if (data) {
      setBooking(data);
      // Fetch payment history
      const { data: payData } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false });
      setPayments(payData || []);
    }
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Menunggu Konfirmasi",
          color: "warning",
          desc: "Tim kami sedang meninjau pesanan Anda.",
        };
      case "confirmed":
        return {
          label: "Telah Dikonfirmasi",
          color: "info",
          desc: "Pesanan disetujui! Silakan lakukan pembayaran.",
        };
      case "awaiting_payment":
        return {
          label: "Batas Pembayaran",
          color: "error",
          desc: "Segera selesaikan pembayaran untuk mengamankan slot.",
        };
      case "dp_paid":
        return {
          label: "DP 50% Diterima",
          color: "primary",
          desc: "Booking aman! Sisa pembayaran dilakukan setelah acara.",
        };
      case "fully_paid":
        return {
          label: "Lunas",
          color: "success",
          desc: "Pembayaran selesai. Sampai jumpa di hari acara!",
        };
      case "completed":
        return {
          label: "Selesai",
          color: "success",
          desc: "Terima kasih telah mempercayakan momen Anda pada kami.",
        };
      case "cancelled":
        return {
          label: "Dibatalkan",
          color: "error",
          desc: "Pesanan ini telah dibatalkan.",
        };
      default:
        return { label: status, color: "muted", desc: "" };
    }
  };

  const formatRupiah = (angka: any) => {
    if (!angka) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleProcessPayment = async () => {
    setPayLoading(true);
    try {
      // payment_type: 'dp' jika pilih < 100, 'full' jika pilih 100
      // Jika status sudah 'dp_paid', maka status selanjutnya adalah 'final' (pelunasan sisa)
      let type = dpPercent === 100 ? "full" : "dp";
      if (booking.status === "dp_paid") type = "final";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/midtrans-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            booking_id: id,
            payment_type: type,
            dp_percentage: dpPercent,
          }),
        },
      );

      const data = await response.json();
      if (data.token) {
        router.push({
          pathname: "/(client)/orders/payment",
          params: { token: data.token, bookingId: id },
        });
      } else {
        throw new Error(data.error || "Gagal mendapatkan token pembayaran");
      }
    } catch (err: any) {
      Alert.alert("Kesalahan", err.message);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading)
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="large" />
      </Center>
    );

  const status = getStatusConfig(booking.status);
  const isPayable = ["confirmed", "awaiting_payment", "dp_paid"].includes(
    booking.status,
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
        <VStack className="px-6 pt-6 gap-6">
          {/* Header */}
          <HStack className="items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 bg-background-0 rounded-xl shadow-soft-1 border border-outline-100"
            >
              <Ionicons name="chevron-back" size={20} color={iconColor} />
            </TouchableOpacity>
            <Heading className="text-xl font-black text-typography-900">
              Detail Pesanan
            </Heading>
          </HStack>

          {/* Status Card */}
          <Box
            className={`bg-${status.color}-500/10 border border-${status.color}-500/20 rounded-3xl p-6`}
          >
            <VStack className="gap-2">
              <HStack className="justify-between items-center">
                <Text
                  className={`text-${status.color}-700 font-black text-xs uppercase tracking-widest`}
                >
                  Status Saat Ini
                </Text>
                <Badge
                  action={status.color as any}
                  variant="solid"
                  className="rounded-lg"
                >
                  <BadgeText className="font-bold uppercase text-[10px]">
                    {status.label}
                  </BadgeText>
                </Badge>
              </HStack>
              <Text
                className={`text-${status.color}-900 text-sm font-medium mt-1 leading-relaxed`}
              >
                {status.desc}
              </Text>
            </VStack>
          </Box>

          {/* Details Section */}
          <VStack className="gap-4">
            <Heading className="text-lg font-black text-typography-900 ml-1">
              Ringkasan Layanan
            </Heading>
            <Box className="bg-background-0 rounded-3xl p-6 shadow-soft-1 border border-outline-100">
              <VStack className="gap-5">
                <HStack className="justify-between items-center border-b border-outline-50 pb-4">
                  <VStack>
                    <Text className="text-typography-400 text-[10px] font-bold uppercase">
                      Paket Pilihan
                    </Text>
                    <Text className="text-typography-900 font-black text-lg">
                      {booking.packages?.name}
                    </Text>
                  </VStack>
                  <Ionicons
                    name="camera-reverse"
                    size={32}
                    color={theme.borderSubtle}
                  />
                </HStack>

                <VStack className="gap-3">
                  <HStack className="justify-between">
                    <Text className="text-typography-500 text-sm">
                      Tanggal Acara
                    </Text>
                    <Text className="text-typography-900 text-sm font-bold">
                      {booking.event_date}
                    </Text>
                  </HStack>
                  <HStack className="justify-between">
                    <Text className="text-typography-500 text-sm">
                      Waktu Mulai
                    </Text>
                    <Text className="text-typography-900 text-sm font-bold">
                      {booking.event_time.slice(0, 5)} WIB
                    </Text>
                  </HStack>
                  <HStack className="justify-between">
                    <Text className="text-typography-500 text-sm">
                      Total Biaya
                    </Text>
                    <Text className="text-primary-600 text-sm font-black">
                      {formatRupiah(booking.packages?.price)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>
          </VStack>

          {/* Payment Section (Conditional) */}
          {isPayable && (
            <VStack className="gap-4">
              <Heading className="text-lg font-black text-typography-900 ml-1">
                Opsi Pembayaran
              </Heading>
              <Box className="bg-background-900 rounded-3xl p-6 shadow-hard-2 border border-outline-200">
                <VStack className="gap-6">
                  <VStack className="gap-2">
                    <Text className="text-white/60 text-xs font-bold uppercase tracking-wider">
                      {booking.status === "dp_paid"
                        ? "Pelunasan Akhir"
                        : "Metode Pembayaran"}
                    </Text>

                    {booking.status !== "dp_paid" ? (
                      <View className="relative">
                        <TouchableOpacity
                          onPress={() => setShowDpDropdown(!showDpDropdown)}
                          className="bg-background-50/10 h-14 rounded-2xl border border-outline-300 px-4 flex-row items-center justify-between"
                        >
                          <Text className="text-white font-bold">
                            {dpPercent === 100
                              ? "Lunas (100%)"
                              : `DP ${dpPercent}%`}
                          </Text>
                          <Ionicons
                            name={
                              showDpDropdown ? "chevron-up" : "chevron-down"
                            }
                            size={18}
                            color="white"
                          />
                        </TouchableOpacity>

                        {showDpDropdown && (
                          <Box className="bg-background-0 rounded-2xl mt-2 p-2 absolute top-full w-full z-10 shadow-lg border border-outline-100">
                            {dpOptions.map((opt) => (
                              <TouchableOpacity
                                key={opt}
                                className={`p-3 rounded-xl ${dpPercent === opt ? "bg-primary-50" : ""}`}
                                onPress={() => {
                                  setDpPercent(opt);
                                  setShowDpDropdown(false);
                                }}
                              >
                                <Text
                                  className={`font-bold ${dpPercent === opt ? "text-primary-600" : "text-typography-900"}`}
                                >
                                  {opt === 100
                                    ? "Langsung Lunas (100%)"
                                    : `DP ${opt}%`}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </Box>
                        )}
                      </View>
                    ) : (
                      <Box className="bg-background-50/10 p-4 rounded-2xl border border-outline-300">
                        <Text className="text-white font-bold">
                          Pelunasan Sisa Pembayaran (50%)
                        </Text>
                      </Box>
                    )}
                  </VStack>

                  <Button
                    size="xl"
                    className="rounded-2xl bg-background-0 h-14"
                    onPress={handleProcessPayment}
                    disabled={payLoading}
                  >
                    {payLoading ? (
                      <ButtonSpinner color={theme.textStrong} />
                    ) : (
                      <ButtonText className="text-typography-950 font-black">
                        BAYAR SEKARANG
                      </ButtonText>
                    )}
                  </Button>
                </VStack>
              </Box>
            </VStack>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <VStack className="gap-4">
              <Heading className="text-lg font-black text-typography-900 ml-1">
                Riwayat Transaksi
              </Heading>
              <VStack className="gap-3">
                {payments.map((pay) => (
                  <Box
                    key={pay.id}
                    className="bg-background-0 rounded-2xl p-4 border border-outline-100 flex-row justify-between items-center"
                  >
                    <VStack>
                      <Text className="text-typography-400 text-[10px] font-bold uppercase">
                        {pay.payment_type.toUpperCase()}
                      </Text>
                      <Text className="text-typography-900 font-bold text-sm">
                        {formatRupiah(pay.amount)}
                      </Text>
                    </VStack>
                    <Badge
                      action={
                        pay.status === "settlement" ? "success" : "warning"
                      }
                      variant="outline"
                      className="rounded-lg"
                    >
                      <BadgeText className="font-bold text-[10px]">
                        {pay.status.toUpperCase()}
                      </BadgeText>
                    </Badge>
                  </Box>
                ))}
              </VStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
