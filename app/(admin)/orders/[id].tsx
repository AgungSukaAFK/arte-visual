import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { Box } from "@/components/ui/box";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";
import { getAppTheme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type BookingDetail = {
  id: string;
  status: string;
  phone_number?: string | null;
  instagram_accounts?: string[] | null;
  event_date?: string | null;
  event_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  notes?: string | null;
  profiles?: {
    full_name?: string | null;
    phone_number?: string | null;
    email?: string | null;
  } | null;
  packages?: {
    name?: string | null;
    price?: number | string | null;
    description?: string | null;
  } | null;
};

type PaymentRecord = {
  id: string;
  amount?: number | string | null;
  payment_type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type InvoiceRecord = {
  id: string;
  invoice_number?: string | null;
  invoice_type?: "dp" | "pelunasan" | "lembur" | string;
  amount?: number | string | null;
  status?: string | null;
  dp_percentage?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | string | null;
  notes?: string | null;
  created_at?: string | null;
};

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const toast = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [overtimeHours, setOvertimeHours] = useState("1");
  const [overtimeRateInput, setOvertimeRateInput] = useState("");
  const [overtimeNote, setOvertimeNote] = useState("");
  const [creatingOvertimeInvoice, setCreatingOvertimeInvoice] = useState(false);

  useEffect(() => {
    if (id) {
      void fetchDetail();
    }
  }, [id]);

  const showToast = (
    title: string,
    desc: string,
    type: "success" | "error",
  ) => {
    toast.show({
      placement: "top",
      render: ({ id: toastId }) => (
        <Toast
          nativeID={toastId}
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

  const fetchDetail = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "*, profiles(full_name, phone_number, email), packages(name, price, description)",
      )
      .eq("id", id)
      .single();

    if (error) {
      showToast("Gagal Memuat", error.message, "error");
      setLoading(false);
      return;
    }

    setBooking((data as BookingDetail) ?? null);

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false });

    if (paymentError) {
      showToast("Gagal Memuat Pembayaran", paymentError.message, "error");
      setPayments([]);
    } else {
      setPayments((paymentData as PaymentRecord[]) ?? []);
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false });

    if (invoiceError) {
      showToast("Gagal Memuat Invoice", invoiceError.message, "error");
      setInvoices([]);
    } else {
      setInvoices((invoiceData as InvoiceRecord[]) ?? []);
    }

    setLoading(false);
  };

  const parseRupiahInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  };

  const formatRupiahInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return "";
    return "Rp " + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getInvoiceTypeLabel = (invoice: InvoiceRecord) => {
    if (invoice.invoice_type === "dp") {
      return `DP ${invoice.dp_percentage ?? 50}%`;
    }
    if (invoice.invoice_type === "lembur") {
      return "Lembur";
    }
    return "Pelunasan";
  };

  const handleCreateOvertimeInvoice = async () => {
    if (!booking) return;

    const hours = Number(overtimeHours);
    const rate = parseRupiahInput(overtimeRateInput);
    const note = overtimeNote.trim();

    if (!Number.isFinite(hours) || hours <= 0) {
      showToast("Input Tidak Valid", "Jam lembur harus lebih dari 0.", "error");
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      showToast(
        "Input Tidak Valid",
        "Tarif lembur per jam harus lebih dari 0.",
        "error",
      );
      return;
    }

    if (!note) {
      showToast(
        "Keterangan Wajib",
        "Admin wajib memberikan keterangan lembur.",
        "error",
      );
      return;
    }

    const hasUnpaidOvertime = invoices.some(
      (inv) => inv.invoice_type === "lembur" && inv.status !== "paid",
    );

    if (hasUnpaidOvertime) {
      showToast(
        "Invoice Lembur Masih Aktif",
        "Masih ada invoice lembur yang belum dibayar.",
        "error",
      );
      return;
    }

    setCreatingOvertimeInvoice(true);
    const total = Math.round(hours * rate);
    const shortId = booking.id.slice(0, 8).toUpperCase();

    const { error } = await supabase.from("invoices").insert({
      booking_id: booking.id,
      invoice_number: `INV-LMB-${shortId}-${Date.now()}`,
      invoice_type: "lembur",
      amount: total,
      status: "unpaid",
      overtime_hours: hours,
      overtime_rate: rate,
      notes: note,
    });

    setCreatingOvertimeInvoice(false);

    if (error) {
      showToast("Gagal Membuat Invoice Lembur", error.message, "error");
      return;
    }

    showToast(
      "Invoice Lembur Dibuat",
      "Klien harus membayar invoice lembur sebelum order ditutup.",
      "success",
    );

    setOvertimeHours("1");
    setOvertimeRateInput("");
    setOvertimeNote("");
    void fetchDetail();
  };

  const handleAction = async (newStatus: string) => {
    if (newStatus === "completed") {
      const hasUnpaidInvoices = invoices.some((inv) => inv.status !== "paid");
      if (hasUnpaidInvoices) {
        showToast(
          "Belum Bisa Close Order",
          "Masih ada invoice yang belum dibayar. Pastikan semua invoice lunas terlebih dahulu.",
          "error",
        );
        return;
      }
    }

    const label =
      newStatus === "confirmed"
        ? "menerima"
        : newStatus === "cancelled"
          ? "menolak"
          : "menutup";

    Alert.alert("Konfirmasi", `Apakah Anda yakin ingin ${label} pesanan ini?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          setProcessingStatus(newStatus);
          const updatePayload: { status: string; closed_at?: string } = {
            status: newStatus,
          };

          if (newStatus === "completed") {
            updatePayload.closed_at = new Date().toISOString();
          }

          const { error } = await supabase
            .from("bookings")
            .update(updatePayload)
            .eq("id", id);

          setProcessingStatus(null);

          if (error) {
            showToast("Gagal", error.message, "error");
            return;
          }

          showToast("Berhasil", "Pesanan telah diperbarui.", "success");
          void fetchDetail();
        },
      },
    ]);
  };

  const formatRupiah = (amount?: number | string | null) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) return "Rp 0";

    return "Rp " + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatCoordinate = (value?: number | string | null) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    return numericValue.toFixed(6);
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "warning",
      confirmed: "info",
      awaiting_payment: "error",
      dp_paid: "primary",
      fully_paid: "success",
      completed: "success",
      cancelled: "error",
    };

    return map[status] ?? "muted";
  };

  const handleOpenMaps = async () => {
    const mapQuery =
      latitude && longitude
        ? `${latitude},${longitude}`
        : booking?.location?.trim();

    if (!mapQuery) {
      showToast(
        "Lokasi Tidak Tersedia",
        "Koordinat atau alamat belum tersedia.",
        "error",
      );
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const supported = await Linking.canOpenURL(mapsUrl);

    if (!supported) {
      showToast(
        "Gagal Membuka Maps",
        "Perangkat tidak dapat membuka tautan peta.",
        "error",
      );
      return;
    }

    await Linking.openURL(mapsUrl);
  };

  if (loading) {
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="large" />
      </Center>
    );
  }

  if (!booking) {
    return (
      <Center className="flex-1 bg-background-50 px-6">
        <Text className="text-center text-typography-500">
          Pesanan tidak ditemukan.
        </Text>
      </Center>
    );
  }

  const statusColor = getStatusColor(booking.status);
  const isPending = booking.status === "pending";
  const hasUnpaidInvoices = invoices.some((inv) => inv.status !== "paid");
  const isCloseable = ["dp_paid", "fully_paid"].includes(booking.status);
  const canCreateOvertime = ["dp_paid", "fully_paid"].includes(booking.status);
  const latitude = formatCoordinate(booking.latitude);
  const longitude = formatCoordinate(booking.longitude);
  const instagramAccounts = Array.isArray(booking.instagram_accounts)
    ? booking.instagram_accounts
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
        <VStack className="px-6 pt-6 gap-6">
          <HStack className="items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-xl border border-outline-100 bg-background-0 p-2"
            >
              <Ionicons name="chevron-back" size={20} color={theme.icon} />
            </TouchableOpacity>
            <Heading className="text-xl font-black text-typography-900">
              Detail Pesanan
            </Heading>
          </HStack>

          <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
            <HStack className="justify-between items-center gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-typography-500">
                Status Pesanan
              </Text>
              <Badge
                action={statusColor as never}
                variant="solid"
                className="rounded-lg"
              >
                <BadgeText className="text-[10px] font-bold uppercase">
                  {booking.status}
                </BadgeText>
              </Badge>
            </HStack>
          </Box>

          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">
              Info Klien
            </Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
              <VStack className="gap-4">
                <HStack className="items-center gap-3">
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={theme.icon}
                  />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Nama
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {booking.profiles?.full_name || "-"}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons name="call-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      No. HP
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {booking.phone_number ||
                        booking.profiles?.phone_number ||
                        "-"}
                    </Text>
                  </VStack>
                </HStack>

                {booking.profiles?.email ? (
                  <HStack className="items-center gap-3">
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={theme.icon}
                    />
                    <VStack>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Email
                      </Text>
                      <Text className="font-bold text-typography-900">
                        {booking.profiles.email}
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}

                {instagramAccounts.length > 0 ? (
                  <HStack className="items-center gap-3">
                    <Ionicons
                      name="logo-instagram"
                      size={18}
                      color={theme.icon}
                    />
                    <VStack className="flex-1">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Instagram
                      </Text>
                      <Text className="font-bold text-typography-900">
                        {instagramAccounts.join(", ")}
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}
              </VStack>
            </Box>
          </VStack>

          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">
              Detail Acara
            </Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
              <VStack className="gap-4">
                <HStack className="items-center gap-3">
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={theme.icon}
                  />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Paket
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {booking.packages?.name || "-"}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons name="cash-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Harga Paket
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {formatRupiah(booking.packages?.price)}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.icon}
                  />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Tanggal Acara
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {booking.event_date || "-"}
                    </Text>
                  </VStack>
                </HStack>

                {booking.event_time ? (
                  <HStack className="items-center gap-3">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={theme.icon}
                    />
                    <VStack>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Jam Mulai
                      </Text>
                      <Text className="font-bold text-typography-900">
                        {booking.event_time.slice(0, 5)} WIB
                        {booking.end_time
                          ? ` - ${booking.end_time.slice(0, 5)} WIB`
                          : ""}
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}

                <HStack className="items-start gap-3">
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.icon}
                  />
                  <VStack className="flex-1">
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Lokasi
                    </Text>
                    <Text className="font-bold text-typography-900">
                      {booking.location || "-"}
                    </Text>
                    {latitude && longitude ? (
                      <Text className="mt-0.5 text-xs text-typography-400">
                        {latitude}, {longitude}
                      </Text>
                    ) : null}
                    {(latitude && longitude) || booking.location ? (
                      <TouchableOpacity
                        onPress={() => void handleOpenMaps()}
                        className="mt-3 self-start rounded-lg border border-outline-100 bg-background-50 px-3 py-2"
                      >
                        <HStack className="items-center gap-2">
                          <Ionicons
                            name="map-outline"
                            size={14}
                            color={theme.accent}
                          />
                          <Text className="text-xs font-bold text-primary-600">
                            Buka di Maps
                          </Text>
                        </HStack>
                      </TouchableOpacity>
                    ) : null}
                  </VStack>
                </HStack>

                {booking.notes ? (
                  <HStack className="items-start gap-3">
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={theme.icon}
                    />
                    <VStack className="flex-1">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Catatan
                      </Text>
                      <Text className="text-sm italic text-typography-500">
                        "{booking.notes}"
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}
              </VStack>
            </Box>
          </VStack>

          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">
              Daftar Invoice
            </Heading>
            {invoices.length === 0 ? (
              <Box className="items-center rounded-3xl border border-dashed border-outline-100 bg-background-0 p-6">
                <Text className="text-center text-sm text-typography-400">
                  Belum ada invoice.
                </Text>
              </Box>
            ) : (
              <VStack className="gap-3">
                {invoices.map((invoice) => {
                  const isPaid = invoice.status === "paid";
                  return (
                    <Box
                      key={invoice.id}
                      className="rounded-2xl border border-outline-100 bg-background-0 p-4"
                    >
                      <VStack className="gap-2">
                        <HStack className="items-center justify-between gap-3">
                          <VStack>
                            <Text className="text-base font-black text-typography-900">
                              {formatRupiah(invoice.amount)}
                            </Text>
                            <Text className="text-xs font-bold uppercase text-typography-400">
                              {getInvoiceTypeLabel(invoice)} • #
                              {invoice.invoice_number}
                            </Text>
                          </VStack>
                          <Badge
                            action={isPaid ? "success" : "warning"}
                            variant="solid"
                            className="rounded-lg"
                          >
                            <BadgeText className="text-[10px] font-bold uppercase">
                              {isPaid ? "LUNAS" : "BELUM LUNAS"}
                            </BadgeText>
                          </Badge>
                        </HStack>

                        {invoice.invoice_type === "lembur" ? (
                          <Box className="rounded-xl border border-outline-100 bg-background-50 p-3">
                            <Text className="text-xs text-typography-600">
                              Lembur {invoice.overtime_hours ?? 0} jam x{" "}
                              {formatRupiah(invoice.overtime_rate)}
                            </Text>
                            <Text className="mt-1 text-xs text-typography-500">
                              Keterangan: {invoice.notes || "-"}
                            </Text>
                          </Box>
                        ) : null}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>

          {canCreateOvertime ? (
            <VStack className="gap-3">
              <Heading className="ml-1 text-base font-black text-typography-900">
                Tambah Invoice Lembur (Opsional)
              </Heading>
              <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                <VStack className="gap-3">
                  <Text className="text-xs leading-relaxed text-typography-500">
                    Lembur dihitung mulai pukul 17.00 di hari H. Jika ada
                    lembur, buat invoice terlebih dahulu sebelum close order.
                  </Text>

                  <VStack className="gap-2">
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Jam Lembur
                    </Text>
                    <Input className="rounded-xl border-outline-100 bg-background-50">
                      <InputField
                        value={overtimeHours}
                        onChangeText={setOvertimeHours}
                        keyboardType="numeric"
                        placeholder="Contoh: 2"
                      />
                    </Input>
                  </VStack>

                  <VStack className="gap-2">
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Tarif Lembur per Jam
                    </Text>
                    <Input className="rounded-xl border-outline-100 bg-background-50">
                      <InputField
                        value={overtimeRateInput}
                        onChangeText={(text) =>
                          setOvertimeRateInput(formatRupiahInput(text))
                        }
                        keyboardType="numeric"
                        placeholder="Rp 0"
                      />
                    </Input>
                  </VStack>

                  <VStack className="gap-2">
                    <Text className="text-[10px] font-bold uppercase text-typography-400">
                      Keterangan Lembur (Wajib)
                    </Text>
                    <Input className="rounded-xl border-outline-100 bg-background-50">
                      <InputField
                        value={overtimeNote}
                        onChangeText={setOvertimeNote}
                        placeholder="Contoh: Tambahan dokumentasi sesi resepsi malam"
                      />
                    </Input>
                  </VStack>

                  <Button
                    size="lg"
                    className="rounded-xl bg-typography-900"
                    onPress={() => void handleCreateOvertimeInvoice()}
                    disabled={creatingOvertimeInvoice}
                  >
                    {creatingOvertimeInvoice ? (
                      <ButtonSpinner color="white" />
                    ) : (
                      <ButtonText className="font-bold text-typography-0">
                        Buat Invoice Lembur
                      </ButtonText>
                    )}
                  </Button>
                </VStack>
              </Box>
            </VStack>
          ) : null}

          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">
              Riwayat Pembayaran
            </Heading>
            {payments.length === 0 ? (
              <Box className="items-center rounded-3xl border border-dashed border-outline-100 bg-background-0 p-6">
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={theme.textSoft}
                />
                <Text className="mt-2 text-center text-sm text-typography-400">
                  Belum ada pembayaran.
                </Text>
              </Box>
            ) : (
              <VStack className="gap-3">
                {payments.map((payment) => (
                  <Box
                    key={payment.id}
                    className="rounded-2xl border border-outline-100 bg-background-0 p-4"
                  >
                    <HStack className="items-center justify-between gap-3">
                      <VStack>
                        <Text className="text-base font-black text-typography-900">
                          {formatRupiah(payment.amount)}
                        </Text>
                        <Text className="text-xs font-bold uppercase text-typography-400">
                          {payment.payment_type || "payment"} •{" "}
                          {payment.status || "pending"}
                        </Text>
                      </VStack>
                      <Badge
                        action={
                          payment.status === "settlement"
                            ? "success"
                            : "warning"
                        }
                        variant="solid"
                        className="rounded-lg"
                      >
                        <BadgeText className="text-[10px] font-bold uppercase">
                          {payment.status || "pending"}
                        </BadgeText>
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

          {isPending ? (
            <HStack className="gap-3 mt-2">
              <Button
                size="lg"
                variant="outline"
                action="negative"
                className="flex-1 rounded-xl border-error-200"
                onPress={() => handleAction("cancelled")}
                disabled={Boolean(processingStatus)}
              >
                {processingStatus === "cancelled" ? (
                  <ButtonSpinner />
                ) : (
                  <ButtonText className="font-bold text-error-600">
                    Tolak
                  </ButtonText>
                )}
              </Button>

              <Button
                size="lg"
                className="flex-1 rounded-xl bg-typography-900"
                onPress={() => handleAction("confirmed")}
                disabled={Boolean(processingStatus)}
              >
                {processingStatus === "confirmed" ? (
                  <ButtonSpinner color="white" />
                ) : (
                  <ButtonText className="font-bold text-typography-0">
                    Acc Pesanan
                  </ButtonText>
                )}
              </Button>
            </HStack>
          ) : null}

          {isCloseable ? (
            <Button
              size="lg"
              className="mt-2 rounded-xl bg-success-600"
              onPress={() => handleAction("completed")}
              disabled={Boolean(processingStatus) || hasUnpaidInvoices}
            >
              {processingStatus === "completed" ? (
                <ButtonSpinner color="white" />
              ) : (
                <ButtonText className="font-bold text-typography-0">
                  {hasUnpaidInvoices
                    ? "Lunasi Semua Invoice Dulu"
                    : "Tandai Selesai (Close Order)"}
                </ButtonText>
              )}
            </Button>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
