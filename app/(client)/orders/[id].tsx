import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "../../../constants/theme";

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
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_STATUS_CONFIG: Record<
  string,
  { label: string; badgeAction: "warning" | "success" | "error" | "muted" }
> = {
  requested: { label: "Menunggu Konfirmasi", badgeAction: "warning" },
  confirmed: { label: "Terjadwal", badgeAction: "success" },
  cancelled: { label: "Dibatalkan", badgeAction: "error" },
  done: { label: "Selesai", badgeAction: "muted" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const iconColor = theme.icon;

  const [booking, setBooking] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [drive, setDrive] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [invoiceCreateLoading, setInvoiceCreateLoading] = useState(false);
  const [changingScheme, setChangingScheme] = useState(false);
  const [dpPercent, setDpPercent] = useState(50);
  const [showDpDropdown, setShowDpDropdown] = useState(false);
  const syncingInvoicesRef = useRef(false);

  // Meeting state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingType, setMeetingType] = useState<"online" | "offline">(
    "online",
  );
  const [meetingNote, setMeetingNote] = useState("");
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(
    null,
  );

  const dpOptions = [50, 60, 70, 80, 90, 100];

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const fetchOrderDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, packages(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[OrderDetail] Failed to fetch booking", {
        bookingId: id,
        error,
      });
    }

    if (data) {
      setBooking(data);

      const [invoicesRes, driveRes, meetingsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("booking_drives")
          .select("*")
          .eq("booking_id", id)
          .maybeSingle(),
        supabase
          .from("meetings")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false }),
      ]);

      const fetchedInvoices = invoicesRes.data || [];
      setInvoices(fetchedInvoices);
      setDrive(driveRes.data ?? null);
      setMeetings(meetingsRes.data ?? []);

      const unpaidWithPayment = fetchedInvoices.filter(
        (inv: any) => inv.status === "unpaid",
      );
      if (unpaidWithPayment.length > 0) {
        void syncPendingInvoices(unpaidWithPayment);
      }
    }

    if (showLoading) setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      void fetchOrderDetail();
    }, [id]),
  );

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`client-order-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `booking_id=eq.${id}`,
        },
        () => void fetchOrderDetail(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetings",
          filter: `booking_id=eq.${id}`,
        },
        () => void fetchOrderDetail(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_drives",
          filter: `booking_id=eq.${id}`,
        },
        () => void fetchOrderDetail(false),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${id}`,
        },
        () => void fetchOrderDetail(false),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const syncPendingInvoices = async (unpaidInvoices: any[]) => {
    if (syncingInvoicesRef.current || unpaidInvoices.length === 0) return;
    syncingInvoicesRef.current = true;
    let hasUpdate = false;

    try {
      for (const inv of unpaidInvoices) {
        try {
          const data = await invokeEdgeFunction<{ status?: string }>(
            "midtrans-check-status",
            { invoice_id: inv.id },
          );
          if (data.status === "settlement" || data.status === "capture")
            hasUpdate = true;
        } catch (err) {
          console.error("[OrderDetail] Status check failed for invoice", {
            invoiceId: inv.id,
            error: err,
          });
        }
      }
      if (hasUpdate) await fetchOrderDetail(false);
    } finally {
      syncingInvoicesRef.current = false;
    }
  };

  useEffect(() => {
    const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid");
    if (unpaidInvoices.length === 0) return;
    const intervalId = setInterval(
      () => void syncPendingInvoices(unpaidInvoices),
      5000,
    );
    return () => clearInterval(intervalId);
  }, [invoices]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

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
          label: "DP Lunas",
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

  const formatCoordinate = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(6) : null;
  };

  const handleOpenMaps = async () => {
    const latitude = formatCoordinate(booking?.latitude);
    const longitude = formatCoordinate(booking?.longitude);
    const mapQuery =
      latitude && longitude
        ? `${latitude},${longitude}`
        : booking?.location?.trim();

    if (!mapQuery) {
      Alert.alert(
        "Lokasi Tidak Tersedia",
        "Alamat atau titik peta belum tersedia untuk pesanan ini.",
      );
      return;
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const supported = await Linking.canOpenURL(mapsUrl);
    if (!supported) {
      Alert.alert(
        "Gagal Membuka Maps",
        "Perangkat tidak dapat membuka tautan peta.",
      );
      return;
    }
    await Linking.openURL(mapsUrl);
  };

  // ─── Invoice Actions ──────────────────────────────────────────────────────────

  const handleCreateInvoices = async () => {
    setInvoiceCreateLoading(true);
    try {
      const price = Number(booking?.packages?.price || 0);
      const shortId = (booking?.id as string).slice(0, 8).toUpperCase();
      const ts = Date.now();
      const invoicesToInsert: any[] = [];

      if (booking?.status === "dp_paid") {
        invoicesToInsert.push({
          booking_id: id,
          invoice_number: `INV-LNS-${shortId}-${ts}`,
          invoice_type: "pelunasan",
          amount: remainingPayment,
          status: "unpaid",
        });
      } else if (dpPercent === 100) {
        invoicesToInsert.push({
          booking_id: id,
          invoice_number: `INV-LNS-${shortId}-${ts}`,
          invoice_type: "pelunasan",
          amount: price,
          status: "unpaid",
        });
      } else {
        const dpAmount = Math.round((price * dpPercent) / 100);
        const lnsAmount = price - dpAmount;
        invoicesToInsert.push({
          booking_id: id,
          invoice_number: `INV-DP-${shortId}-${ts}`,
          invoice_type: "dp",
          dp_percentage: dpPercent,
          amount: dpAmount,
          status: "unpaid",
        });
        invoicesToInsert.push({
          booking_id: id,
          invoice_number: `INV-LNS-${shortId}-${ts + 1}`,
          invoice_type: "pelunasan",
          amount: lnsAmount,
          status: "unpaid",
        });
      }

      const { error } = await supabase
        .from("invoices")
        .insert(invoicesToInsert);
      if (error) throw error;
      await fetchOrderDetail();
    } catch (err: any) {
      Alert.alert("Kesalahan", err.message);
    } finally {
      setInvoiceCreateLoading(false);
    }
  };

  const handlePayInvoice = async (invoice: any) => {
    setPayLoading(invoice.id);
    try {
      const data = await invokeEdgeFunction<{ token?: string; error?: string }>(
        "midtrans-token",
        { invoice_id: invoice.id },
      );

      if (data.token) {
        router.push({
          pathname: "/(client)/orders/payment",
          params: {
            token: data.token,
            bookingId: id,
            invoiceId: invoice.id,
            paymentSessionId: `${invoice.id}-${Date.now()}`,
          },
        });
      } else {
        throw new Error(data.error || "Gagal mendapatkan token pembayaran");
      }
    } catch (err: any) {
      Alert.alert("Kesalahan", err.message);
    } finally {
      setPayLoading(null);
    }
  };

  // ─── Meeting Actions ──────────────────────────────────────────────────────────

  const handleRequestMeeting = async () => {
    if (!meetingNote.trim()) {
      Alert.alert(
        "Catatan Wajib",
        "Mohon isi catatan atau preferensi waktu meeting.",
      );
      return;
    }

    setSavingMeeting(true);
    const { error } = await supabase.from("meetings").insert({
      booking_id: id,
      meeting_type: meetingType,
      status: "requested",
      client_notes: meetingNote.trim(),
      created_by: "client",
    });
    setSavingMeeting(false);

    if (error) {
      Alert.alert("Gagal", error.message);
      return;
    }

    setShowMeetingForm(false);
    setMeetingNote("");
    setMeetingType("online");
    void fetchOrderDetail(false);
  };

  const handleChangePaymentScheme = () => {
    Alert.alert(
      "Ganti Skema Pembayaran",
      "Semua invoice yang ada akan dihapus dan Anda bisa memilih skema baru. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Ganti",
          style: "destructive",
          onPress: async () => {
            setChangingScheme(true);
            const { error, count } = await supabase
              .from("invoices")
              .delete({ count: "exact" })
              .eq("booking_id", id)
              .eq("status", "unpaid");
            setChangingScheme(false);
            console.log("[ChangeScheme] delete →", { error, count, bookingId: id });
            if (error) {
              Alert.alert("Gagal", error.message);
              return;
            }
            if (!count) {
              Alert.alert(
                "Gagal",
                `Tidak ada invoice yang bisa dihapus (count: ${count}). Pastikan migration sudah diterapkan dan belum ada pembayaran.`,
              );
              return;
            }
            await fetchOrderDetail(false);
          },
        },
      ],
    );
  };

  const handleCancelMeeting = (meetingId: string) => {
    Alert.alert(
      "Batalkan Request",
      "Yakin ingin membatalkan request meeting ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            setCancellingMeetingId(meetingId);
            const { error } = await supabase
              .from("meetings")
              .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
              })
              .eq("id", meetingId);
            setCancellingMeetingId(null);
            if (error) {
              Alert.alert("Gagal", error.message);
              return;
            }
            void fetchOrderDetail(false);
          },
        },
      ],
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const timelineSteps = [
    {
      key: "pending",
      title: "Pesanan Masuk",
      desc: "Pesanan berhasil dikirim dan menunggu review admin.",
      done: true,
      active: booking?.status === "pending",
    },
    {
      key: "approved",
      title: "Disetujui Admin",
      desc: "Admin sudah menerima pesanan dan Anda bisa lanjut ke pembayaran.",
      done: [
        "confirmed",
        "awaiting_payment",
        "dp_paid",
        "fully_paid",
        "completed",
      ].includes(booking?.status),
      active: ["confirmed", "awaiting_payment"].includes(booking?.status),
    },
    {
      key: "payment",
      title: "Pembayaran",
      desc:
        booking?.status === "dp_paid"
          ? "DP sudah dibayar. Tinggal menyelesaikan pelunasan sesuai jadwal."
          : booking?.status === "fully_paid"
            ? "Pembayaran sudah lunas dan pesanan sudah aman."
            : booking?.status === "completed"
              ? "Pembayaran sudah selesai sebelum order ditutup."
              : "Selesaikan pembayaran agar pesanan diproses penuh.",
      done: ["dp_paid", "fully_paid", "completed"].includes(booking?.status),
      active: booking?.status === "dp_paid",
    },
    {
      key: "completed",
      title: "Acara Selesai",
      desc: "Order ditutup setelah acara selesai dilaksanakan.",
      done: booking?.status === "completed",
      active: booking?.status === "fully_paid",
    },
  ];

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
  const totalPrice = Number(booking.packages?.price || 0);
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const dpInvoice = invoices.find((inv) => inv.invoice_type === "dp");
  const dpInvoicePaid = invoices.find(
    (inv) => inv.invoice_type === "dp" && inv.status === "paid",
  );
  const totalPaid = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0,
  );
  const remainingPayment = Math.max(totalPrice - totalPaid, 0);
  const hasCoordinates =
    formatCoordinate(booking.latitude) && formatCoordinate(booking.longitude);
  const instagramAccounts = Array.isArray(booking.instagram_accounts)
    ? booking.instagram_accounts
    : [];

  // Meeting conditions
  const canMeeting = ["dp_paid", "fully_paid", "completed"].includes(
    booking.status,
  );
  const dpPct = dpInvoicePaid?.dp_percentage ?? 0;
  const canOfflineMeeting =
    dpPct >= 80 || ["fully_paid", "completed"].includes(booking.status);

  // Drive conditions
  const isFullyPaid = ["fully_paid", "completed"].includes(booking.status);

  // Ganti skema: hanya jika ada invoice tapi belum ada yang dibayar
  const canChangeScheme =
    invoices.length > 0 &&
    paidInvoices.length === 0 &&
    ["confirmed", "awaiting_payment"].includes(booking.status);

  const nextStepMessage =
    booking.status === "pending"
      ? "Admin sedang meninjau pesanan Anda. Setelah disetujui, Anda bisa langsung melanjutkan pembayaran dari halaman ini."
      : booking.status === "confirmed" || booking.status === "awaiting_payment"
        ? "Pesanan sudah disetujui. Pilih skema pembayaran yang Anda inginkan lalu lanjutkan ke Midtrans untuk menyelesaikan transaksi."
        : booking.status === "dp_paid"
          ? "DP sudah masuk. Simpan detail pesanan ini dan lanjutkan pelunasan saat waktunya tiba."
          : booking.status === "fully_paid"
            ? "Pembayaran sudah lunas. Pastikan detail acara dan lokasi sudah sesuai sebelum hari H."
            : booking.status === "completed"
              ? "Pesanan sudah selesai. Anda masih bisa melihat ringkasan layanan dan riwayat pembayaran di halaman ini."
              : "Pesanan tidak dapat dilanjutkan. Jika ada kendala, hubungi admin untuk konfirmasi lebih lanjut.";

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
              <Box className="mt-3 rounded-2xl border border-outline-100 bg-background-0 px-4 py-3">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                  Langkah Berikutnya
                </Text>
                <Text className="mt-1 text-sm leading-relaxed text-typography-700">
                  {nextStepMessage}
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Ringkasan Layanan */}
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
                    {booking.packages?.description ? (
                      <Text className="mt-1 max-w-[250px] text-sm leading-relaxed text-typography-500">
                        {booking.packages.description}
                      </Text>
                    ) : null}
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
                  {booking.end_time ? (
                    <HStack className="justify-between">
                      <Text className="text-typography-500 text-sm">
                        Waktu Selesai
                      </Text>
                      <Text className="text-typography-900 text-sm font-bold">
                        {booking.end_time.slice(0, 5)} WIB
                      </Text>
                    </HStack>
                  ) : null}
                  <HStack className="justify-between">
                    <Text className="text-typography-500 text-sm">
                      Total Biaya
                    </Text>
                    <Text className="text-primary-600 text-sm font-black">
                      {formatRupiah(booking.packages?.price)}
                    </Text>
                  </HStack>
                  <HStack className="justify-between">
                    <Text className="text-typography-500 text-sm">
                      ID Pesanan
                    </Text>
                    <Text className="text-typography-900 text-sm font-bold">
                      {booking.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>
          </VStack>

          {/* Detail Acara */}
          <VStack className="gap-4">
            <Heading className="ml-1 text-lg font-black text-typography-900">
              Detail Acara
            </Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-6 shadow-soft-1">
              <VStack className="gap-4">
                <HStack className="items-start justify-between gap-4 border-b border-outline-50 pb-4">
                  <VStack className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                      Lokasi Acara
                    </Text>
                    <Text className="mt-1 text-sm font-bold leading-relaxed text-typography-900">
                      {booking.location || "Alamat belum diisi"}
                    </Text>
                    {hasCoordinates ? (
                      <Text className="mt-1 text-xs text-typography-400">
                        Titik peta: {formatCoordinate(booking.latitude)},{" "}
                        {formatCoordinate(booking.longitude)}
                      </Text>
                    ) : null}
                  </VStack>
                  {booking.location || hasCoordinates ? (
                    <TouchableOpacity
                      onPress={() => void handleOpenMaps()}
                      className="self-start rounded-xl border border-outline-100 bg-background-50 px-3 py-2"
                    >
                      <HStack className="items-center gap-2">
                        <Ionicons
                          name="map-outline"
                          size={14}
                          color={theme.accent}
                        />
                        <Text className="text-xs font-bold text-primary-600">
                          Buka Maps
                        </Text>
                      </HStack>
                    </TouchableOpacity>
                  ) : null}
                </HStack>

                {instagramAccounts.length > 0 ? (
                  <VStack className="gap-2 border-b border-outline-50 pb-4">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                      Akun Instagram
                    </Text>
                    {instagramAccounts.map((account: string) => (
                      <HStack key={account} className="items-center gap-2">
                        <Ionicons
                          name="logo-instagram"
                          size={14}
                          color={theme.icon}
                        />
                        <Text className="text-sm font-medium text-typography-800">
                          @{account.replace(/^@/, "")}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                ) : null}

                <VStack className="gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                    Catatan untuk Tim
                  </Text>
                  <Text className="text-sm leading-relaxed text-typography-700">
                    {booking.notes || "Belum ada catatan tambahan dari Anda."}
                  </Text>
                </VStack>
              </VStack>
            </Box>
          </VStack>

          {/* Hasil Dokumentasi (Drive) */}
          {drive ? (
            <VStack className="gap-4">
              <Heading className="ml-1 text-lg font-black text-typography-900">
                Hasil Dokumentasi
              </Heading>
              <Box className="rounded-3xl border border-outline-100 bg-background-0 p-6 shadow-soft-1">
                <VStack className="gap-4">
                  <HStack className="items-center gap-3">
                    <Box className="rounded-2xl bg-background-100 p-3">
                      <Ionicons
                        name="cloud-outline"
                        size={24}
                        color={theme.icon}
                      />
                    </Box>
                    <VStack className="flex-1">
                      <Text className="font-black text-typography-900 text-base">
                        {drive.drive_name}
                      </Text>
                      <Text className="text-xs text-typography-500 mt-0.5">
                        Google Drive
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack className="gap-3">
                    <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color={theme.textSoft}
                      />
                      <Text className="text-lg font-black text-typography-900 mt-1">
                        {drive.photo_count}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Foto
                      </Text>
                    </Box>
                    <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                      <Ionicons
                        name="videocam-outline"
                        size={20}
                        color={theme.textSoft}
                      />
                      <Text className="text-lg font-black text-typography-900 mt-1">
                        {drive.video_count}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Video
                      </Text>
                    </Box>
                    {drive.file_size ? (
                      <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                        <Ionicons
                          name="server-outline"
                          size={20}
                          color={theme.textSoft}
                        />
                        <Text className="text-sm font-black text-typography-900 mt-1">
                          {drive.file_size}
                        </Text>
                        <Text className="text-[10px] font-bold uppercase text-typography-400">
                          Ukuran
                        </Text>
                      </Box>
                    ) : null}
                  </HStack>

                  {isFullyPaid ? (
                    <Button
                      size="lg"
                      className="rounded-2xl bg-primary-600"
                      onPress={() => void Linking.openURL(drive.drive_url)}
                    >
                      <ButtonText className="font-bold text-typography-0">
                        Buka Google Drive
                      </ButtonText>
                    </Button>
                  ) : (
                    <Box className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4">
                      <HStack className="items-start gap-3">
                        <Ionicons
                          name="lock-closed-outline"
                          size={18}
                          color={theme.warning}
                        />
                        <VStack className="flex-1">
                          <Text className="text-sm font-black text-warning-700">
                            Link Terkunci
                          </Text>
                          <Text className="mt-1 text-xs leading-relaxed text-warning-600">
                            Link Google Drive hanya bisa diakses setelah
                            pembayaran lunas sepenuhnya.
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}
                </VStack>
              </Box>
            </VStack>
          ) : null}

          {/* Ringkasan Pembayaran */}
          <VStack className="gap-4">
            <Heading className="ml-1 text-lg font-black text-typography-900">
              Ringkasan Pembayaran
            </Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-6 shadow-soft-1">
              <VStack className="gap-4">
                <HStack className="justify-between items-center">
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                      Sudah Dibayar
                    </Text>
                    <Text className="mt-1 text-lg font-black text-success-700">
                      {formatRupiah(totalPaid)}
                    </Text>
                  </VStack>
                  <VStack className="items-end">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                      Sisa Tagihan
                    </Text>
                    <Text className="mt-1 text-lg font-black text-primary-700">
                      {formatRupiah(remainingPayment)}
                    </Text>
                  </VStack>
                </HStack>

                <Box className="rounded-2xl border border-outline-50 bg-background-50 p-4">
                  <VStack className="gap-2">
                    <HStack className="justify-between">
                      <Text className="text-sm text-typography-500">
                        Invoice Lunas
                      </Text>
                      <Text className="text-sm font-bold text-typography-900">
                        {paidInvoices.length} invoice
                      </Text>
                    </HStack>
                    <HStack className="justify-between">
                      <Text className="text-sm text-typography-500">
                        Status Pembayaran
                      </Text>
                      <Text className="text-sm font-bold text-typography-900">
                        {remainingPayment > 0 ? "Belum Lunas" : "Lunas"}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </VStack>

          {/* Progress Pesanan */}
          <VStack className="gap-4">
            <Heading className="ml-1 text-lg font-black text-typography-900">
              Progress Pesanan
            </Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-6 shadow-soft-1">
              <VStack className="gap-4">
                {timelineSteps.map((step, index) => (
                  <HStack key={step.key} className="items-start gap-3">
                    <VStack className="items-center">
                      <Box
                        className={`h-7 w-7 items-center justify-center rounded-full border ${
                          step.done
                            ? "border-primary-200 bg-primary-500"
                            : step.active
                              ? "border-warning-200 bg-warning-500"
                              : "border-outline-100 bg-background-50"
                        }`}
                      >
                        <Ionicons
                          name={step.done ? "checkmark" : "ellipse"}
                          size={step.done ? 16 : 10}
                          color={
                            step.done || step.active ? "white" : theme.textSoft
                          }
                        />
                      </Box>
                      {index < timelineSteps.length - 1 ? (
                        <Box className="my-1 h-10 w-px bg-outline-100" />
                      ) : null}
                    </VStack>
                    <VStack className="flex-1 pb-2">
                      <Text className="text-sm font-black text-typography-900">
                        {step.title}
                      </Text>
                      <Text className="mt-1 text-sm leading-relaxed text-typography-500">
                        {step.desc}
                      </Text>
                    </VStack>
                  </HStack>
                ))}

                {booking?.status === "cancelled" ? (
                  <Box className="rounded-2xl border border-error-200 bg-error-50 p-4">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-error-700">
                      Pesanan Ditolak
                    </Text>
                    <Text className="mt-1 text-sm leading-relaxed text-error-700">
                      Pesanan ini tidak dilanjutkan. Jika Anda butuh
                      klarifikasi, hubungi admin.
                    </Text>
                  </Box>
                ) : null}
              </VStack>
            </Box>
          </VStack>

          {/* Meeting */}
          {canMeeting ? (
            <VStack className="gap-4">
              <Heading className="ml-1 text-lg font-black text-typography-900">
                Meeting
              </Heading>

              {/* List meeting yang sudah ada */}
              {meetings.length > 0 ? (
                <VStack className="gap-3">
                  {meetings.map((meeting) => {
                    const cfg = MEETING_STATUS_CONFIG[meeting.status] ?? {
                      label: meeting.status,
                      badgeAction: "muted" as const,
                    };
                    const isRequested = meeting.status === "requested";
                    const isConfirmed = meeting.status === "confirmed";

                    return (
                      <Box
                        key={meeting.id}
                        className={`rounded-2xl border p-4 ${
                          isConfirmed
                            ? "border-success-200 bg-success-50"
                            : "border-outline-100 bg-background-0"
                        }`}
                      >
                        <VStack className="gap-3">
                          <HStack className="justify-between items-start gap-2">
                            <VStack className="flex-1 gap-1">
                              <HStack className="items-center gap-2">
                                <Ionicons
                                  name={
                                    meeting.meeting_type === "online"
                                      ? "videocam-outline"
                                      : "people-outline"
                                  }
                                  size={16}
                                  color={
                                    isConfirmed ? theme.success : theme.accent
                                  }
                                />
                                <Text className="font-black text-typography-900 text-sm">
                                  Meeting{" "}
                                  {meeting.meeting_type === "online"
                                    ? "Online"
                                    : "Offline"}
                                </Text>
                              </HStack>
                              <Text className="text-[10px] font-bold uppercase text-typography-400">
                                Diminta oleh{" "}
                                {meeting.created_by === "admin"
                                  ? "Admin"
                                  : "Anda"}
                              </Text>
                            </VStack>
                            <Badge
                              action={cfg.badgeAction}
                              variant="solid"
                              className="rounded-lg"
                            >
                              <BadgeText className="text-[10px] font-bold uppercase">
                                {cfg.label}
                              </BadgeText>
                            </Badge>
                          </HStack>

                          {meeting.client_notes ? (
                            <Box className="rounded-xl bg-background-50 border border-outline-100 px-3 py-2">
                              <Text className="text-[10px] font-bold uppercase text-typography-400 mb-1">
                                Catatan Anda
                              </Text>
                              <Text className="text-xs text-typography-600">
                                {meeting.client_notes}
                              </Text>
                            </Box>
                          ) : null}

                          {isConfirmed && meeting.scheduled_at ? (
                            <Box className="rounded-xl bg-success-100 border border-success-200 px-3 py-2">
                              <Text className="text-[10px] font-bold uppercase text-success-700 mb-1">
                                Jadwal Terkonfirmasi
                              </Text>
                              <HStack className="items-center gap-2">
                                <Ionicons
                                  name="time-outline"
                                  size={14}
                                  color={theme.success}
                                />
                                <Text className="text-sm font-bold text-success-800">
                                  {meeting.scheduled_at}
                                </Text>
                              </HStack>
                            </Box>
                          ) : null}

                          {meeting.admin_notes ? (
                            <Box className="rounded-xl bg-primary-50 border border-primary-100 px-3 py-2">
                              <Text className="text-[10px] font-bold uppercase text-primary-600 mb-1">
                                Info dari Admin
                              </Text>
                              <Text className="text-xs leading-relaxed text-typography-700">
                                {meeting.admin_notes}
                              </Text>
                            </Box>
                          ) : null}

                          {isRequested ? (
                            <Button
                              size="sm"
                              variant="outline"
                              action="negative"
                              className="rounded-xl border-error-200"
                              onPress={() => handleCancelMeeting(meeting.id)}
                              disabled={cancellingMeetingId === meeting.id}
                            >
                              {cancellingMeetingId === meeting.id ? (
                                <ButtonSpinner />
                              ) : (
                                <ButtonText className="font-bold text-error-600 text-xs">
                                  Batalkan Request
                                </ButtonText>
                              )}
                            </Button>
                          ) : null}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              ) : null}

              {/* Form request meeting / tombol buka form */}
              {!showMeetingForm ? (
                <Button
                  size="lg"
                  variant="outline"
                  action="secondary"
                  className="rounded-2xl border-outline-200"
                  onPress={() => setShowMeetingForm(true)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={theme.icon}
                    style={{ marginRight: 8 }}
                  />
                  <ButtonText className="font-bold text-typography-700">
                    Request Meeting Baru
                  </ButtonText>
                </Button>
              ) : (
                <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                  <VStack className="gap-4">
                    <Text className="text-xs font-bold uppercase text-typography-400">
                      Tipe Meeting
                    </Text>

                    <HStack className="gap-2">
                      {(["online", "offline"] as const).map((type) => {
                        const isDisabled =
                          type === "offline" && !canOfflineMeeting;
                        return (
                          <Pressable
                            key={type}
                            onPress={() => {
                              if (isDisabled) return;
                              setMeetingType(type);
                            }}
                            className={`flex-1 rounded-xl border py-3 items-center gap-1 ${
                              meetingType === type && !isDisabled
                                ? "border-primary-300 bg-primary-50"
                                : isDisabled
                                  ? "border-outline-100 bg-background-100 opacity-50"
                                  : "border-outline-100 bg-background-50"
                            }`}
                          >
                            <Ionicons
                              name={
                                type === "online"
                                  ? "videocam-outline"
                                  : "people-outline"
                              }
                              size={20}
                              color={
                                isDisabled
                                  ? theme.textSoft
                                  : meetingType === type
                                    ? theme.accent
                                    : theme.textSoft
                              }
                            />
                            <Text
                              className={`text-sm font-bold ${
                                isDisabled
                                  ? "text-typography-400"
                                  : meetingType === type
                                    ? "text-primary-600"
                                    : "text-typography-500"
                              }`}
                            >
                              {type === "online" ? "Online" : "Offline"}
                            </Text>
                            {isDisabled ? (
                              <Text className="text-[9px] text-typography-400 text-center px-2">
                                DP ≥ 80% diperlukan
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </HStack>

                    <VStack className="gap-2">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Catatan / Preferensi Waktu
                      </Text>
                      <Input className="rounded-xl border-outline-100 bg-background-50">
                        <InputField
                          value={meetingNote}
                          onChangeText={setMeetingNote}
                          placeholder="Contoh: Lebih prefer weekday sore setelah jam 15.00"
                          multiline
                        />
                      </Input>
                    </VStack>

                    <HStack className="gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        action="secondary"
                        className="flex-1 rounded-xl border-outline-200"
                        onPress={() => {
                          setShowMeetingForm(false);
                          setMeetingNote("");
                          setMeetingType("online");
                        }}
                        disabled={savingMeeting}
                      >
                        <ButtonText className="font-bold text-typography-600">
                          Batal
                        </ButtonText>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 rounded-xl bg-typography-900"
                        onPress={() => void handleRequestMeeting()}
                        disabled={savingMeeting}
                      >
                        {savingMeeting ? (
                          <ButtonSpinner color={theme.surface} />
                        ) : (
                          <ButtonText className="font-bold text-typography-0">
                            Kirim Request
                          </ButtonText>
                        )}
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          ) : null}

          {/* Tagihan */}
          {(invoices.length > 0 || isPayable) && (
            <VStack className="gap-4">
              <Heading className="text-lg font-black text-typography-900 ml-1">
                Tagihan
              </Heading>

              {invoices.length === 0 ? (
                <Box className="bg-background-900 rounded-3xl p-6 shadow-hard-2 border border-outline-200">
                  <VStack className="gap-6">
                    <VStack className="gap-2">
                      <Text className="text-typography-100 text-xs font-bold uppercase tracking-wider opacity-70">
                        {booking.status === "dp_paid"
                          ? "Buat Tagihan Pelunasan"
                          : "Skema Pembayaran"}
                      </Text>

                      {booking.status !== "dp_paid" ? (
                        <View className="relative">
                          <TouchableOpacity
                            onPress={() => setShowDpDropdown(!showDpDropdown)}
                            className="bg-background-50/10 h-14 rounded-2xl border border-outline-300 px-4 flex-row items-center justify-between"
                          >
                            <Text className="text-typography-0 font-bold">
                              {dpPercent === 100
                                ? "Lunas (100%)"
                                : `DP ${dpPercent}%`}
                            </Text>
                            <Ionicons
                              name={
                                showDpDropdown ? "chevron-up" : "chevron-down"
                              }
                              size={18}
                              color={theme.surfaceStrong}
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
                                    className={`font-bold ${
                                      dpPercent === opt
                                        ? "text-primary-600"
                                        : "text-typography-900"
                                    }`}
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
                      ) : null}
                    </VStack>

                    {booking.status !== "dp_paid" && dpPercent < 100 ? (
                      <Box
                        className={`rounded-xl border px-4 py-3 ${
                          dpPercent >= 80
                            ? "border-success-400/30 bg-success-400/10"
                            : "border-warning-400/30 bg-warning-400/10"
                        }`}
                      >
                        <HStack className="items-start gap-2">
                          <Ionicons
                            name={
                              dpPercent >= 80
                                ? "checkmark-circle-outline"
                                : "alert-circle-outline"
                            }
                            size={15}
                            color={dpPercent >= 80 ? theme.success : theme.warning}
                          />
                          <Text
                            className={`flex-1 text-xs leading-relaxed opacity-80 ${
                              dpPercent >= 80
                                ? "text-success-200"
                                : "text-warning-200"
                            }`}
                          >
                            {dpPercent >= 80
                              ? `DP ${dpPercent}% memungkinkan Anda request meeting online maupun offline.`
                              : `DP ${dpPercent}% hanya untuk meeting online. Pilih DP ≥ 80% jika ingin bisa meeting offline juga.`}
                          </Text>
                        </HStack>
                      </Box>
                    ) : null}

                    <Box className="rounded-2xl border border-outline-300 bg-background-50/10 p-4">
                      <VStack className="gap-1">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-100 opacity-70">
                          {booking.status === "dp_paid"
                            ? "Sisa yang Akan Ditagih"
                            : dpPercent === 100
                              ? "Total yang Akan Ditagih"
                              : `DP (${dpPercent}%) + Pelunasan`}
                        </Text>
                        <Text className="text-xl font-black text-typography-0">
                          {booking.status === "dp_paid"
                            ? formatRupiah(remainingPayment)
                            : formatRupiah(totalPrice)}
                        </Text>
                        {booking.status !== "dp_paid" && dpPercent < 100 ? (
                          <Text className="mt-1 text-xs text-typography-100 opacity-50">
                            DP:{" "}
                            {formatRupiah(
                              Math.round((totalPrice * dpPercent) / 100),
                            )}{" "}
                            · Sisa:{" "}
                            {formatRupiah(
                              totalPrice -
                                Math.round((totalPrice * dpPercent) / 100),
                            )}
                          </Text>
                        ) : null}
                      </VStack>
                    </Box>

                    <Button
                      size="xl"
                      className="rounded-2xl bg-background-0 h-14"
                      onPress={() => void handleCreateInvoices()}
                      disabled={invoiceCreateLoading}
                    >
                      {invoiceCreateLoading ? (
                        <ButtonSpinner color={theme.textStrong} />
                      ) : (
                        <ButtonText className="text-typography-950 font-black">
                          BUAT TAGIHAN
                        </ButtonText>
                      )}
                    </Button>
                  </VStack>
                </Box>
              ) : (
                <VStack className="gap-3">
                  {invoices.map((invoice) => {
                    const isFinalInvoice = invoice.invoice_type === "pelunasan";
                    const isDpLocked =
                      isFinalInvoice &&
                      !!dpInvoice &&
                      dpInvoice.id !== invoice.id &&
                      dpInvoice.status !== "paid";

                    return (
                      <Box
                        key={invoice.id}
                        className="bg-background-0 rounded-2xl border border-outline-100 p-4"
                      >
                        <VStack className="gap-3">
                          <HStack className="justify-between items-center">
                            <VStack>
                              <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                                {invoice.invoice_type === "dp"
                                  ? `DP ${invoice.dp_percentage ?? 50}%`
                                  : invoice.invoice_type === "lembur"
                                    ? "Lembur"
                                    : "Pelunasan"}
                              </Text>
                              <Text className="text-lg font-black text-typography-900">
                                {formatRupiah(invoice.amount)}
                              </Text>
                              <Text className="text-xs text-typography-400">
                                #{invoice.invoice_number}
                              </Text>
                            </VStack>
                            <Badge
                              action={
                                invoice.status === "paid"
                                  ? "success"
                                  : isDpLocked
                                    ? "muted"
                                    : "warning"
                              }
                              variant="solid"
                              className="rounded-lg"
                            >
                              <BadgeText className="font-bold text-[10px]">
                                {invoice.status === "paid"
                                  ? "LUNAS"
                                  : isDpLocked
                                    ? "TERKUNCI"
                                    : "BELUM BAYAR"}
                              </BadgeText>
                            </Badge>
                          </HStack>

                          {isDpLocked ? (
                            <Box className="rounded-xl border border-outline-100 bg-background-50 px-3 py-2">
                              <Text className="text-xs leading-relaxed text-typography-500">
                                Invoice pelunasan baru bisa dibayar setelah
                                invoice DP lunas.
                              </Text>
                            </Box>
                          ) : null}

                          <HStack className="gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              action="secondary"
                              className="flex-1 rounded-xl border-outline-200"
                              onPress={() =>
                                router.push({
                                  pathname: "/(client)/invoices/[id]",
                                  params: {
                                    id: invoice.id,
                                    from: "order-detail",
                                    bookingId: id,
                                  },
                                })
                              }
                            >
                              <ButtonText className="font-bold text-typography-700 text-xs">
                                Lihat Detail
                              </ButtonText>
                            </Button>

                            {invoice.status === "unpaid" ? (
                              <Button
                                size="sm"
                                className={`flex-1 rounded-xl ${
                                  isDpLocked
                                    ? "bg-background-200"
                                    : "bg-typography-900"
                                }`}
                                onPress={() => void handlePayInvoice(invoice)}
                                disabled={
                                  payLoading === invoice.id || isDpLocked
                                }
                              >
                                {payLoading === invoice.id ? (
                                  <ButtonSpinner color={theme.surface} />
                                ) : (
                                  <ButtonText
                                    className={`font-bold text-xs ${
                                      isDpLocked
                                        ? "text-typography-500"
                                        : "text-typography-0"
                                    }`}
                                  >
                                    {isDpLocked ? "Tunggu DP" : "Bayar"}
                                  </ButtonText>
                                )}
                              </Button>
                            ) : null}
                          </HStack>
                        </VStack>
                      </Box>
                    );
                  })}

                  {canChangeScheme ? (
                    <Button
                      size="sm"
                      variant="outline"
                      action="secondary"
                      className="rounded-xl border-outline-200"
                      onPress={handleChangePaymentScheme}
                      disabled={changingScheme}
                    >
                      {changingScheme ? (
                        <ButtonSpinner />
                      ) : (
                        <ButtonText className="font-bold text-typography-600 text-xs">
                          Ganti Skema Pembayaran
                        </ButtonText>
                      )}
                    </Button>
                  ) : null}
                </VStack>
              )}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
