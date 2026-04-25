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
import { Pressable } from "@/components/ui/pressable";
import { getAppTheme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type DriveRecord = {
  id: string;
  booking_id: string;
  drive_name: string;
  photo_count: number;
  video_count: number;
  file_size: string | null;
  drive_url: string;
};

type MeetingRecord = {
  id: string;
  booking_id: string;
  meeting_type: "online" | "offline";
  status: "requested" | "confirmed" | "cancelled" | "done";
  scheduled_at: string | null;
  admin_notes: string | null;
  client_notes: string | null;
  created_by: "client" | "admin";
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  awaiting_payment: "Menunggu Pembayaran",
  dp_paid: "DP Lunas",
  fully_paid: "Lunas",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const MEETING_STATUS_CONFIG: Record<
  string,
  { label: string; badgeAction: "warning" | "success" | "error" | "muted"; color: string }
> = {
  requested: { label: "Request Masuk", badgeAction: "warning", color: "warning" },
  confirmed: { label: "Terjadwal", badgeAction: "success", color: "success" },
  cancelled: { label: "Dibatalkan", badgeAction: "error", color: "error" },
  done: { label: "Selesai", badgeAction: "muted", color: "muted" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const toast = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [drive, setDrive] = useState<DriveRecord | null>(null);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Overtime invoice state
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [overtimeHours, setOvertimeHours] = useState("1");
  const [overtimeRateInput, setOvertimeRateInput] = useState("");
  const [overtimeNote, setOvertimeNote] = useState("");
  const [creatingOvertimeInvoice, setCreatingOvertimeInvoice] = useState(false);

  // Expand/collapse state
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  // Drive state
  const [driveForm, setDriveForm] = useState({
    drive_name: "",
    photo_count: "",
    video_count: "",
    file_size: "",
    drive_url: "",
  });
  const [driveEditMode, setDriveEditMode] = useState(false);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);

  // Meeting state
  const [meetingForm, setMeetingForm] = useState({
    meeting_type: "online" as "online" | "offline",
    scheduled_at: "",
    admin_notes: "",
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [updatingMeetingId, setUpdatingMeetingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) void fetchDetail();
  }, [id]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchDetail = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, profiles(full_name, phone_number, email), packages(name, price, description)")
      .eq("id", id)
      .single();

    if (error) {
      showToast("Gagal Memuat", error.message, "error");
      setLoading(false);
      return;
    }

    setBooking((data as BookingDetail) ?? null);

    const [paymentsRes, invoicesRes, driveRes, meetingsRes] = await Promise.all([
      supabase.from("payments").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
      supabase.from("booking_drives").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("meetings").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
    ]);

    setPayments((paymentsRes.data as PaymentRecord[]) ?? []);
    setInvoices((invoicesRes.data as InvoiceRecord[]) ?? []);

    const driveData = driveRes.data as DriveRecord | null;
    setDrive(driveData);
    if (driveData) {
      setDriveForm({
        drive_name: driveData.drive_name,
        photo_count: String(driveData.photo_count),
        video_count: String(driveData.video_count),
        file_size: driveData.file_size ?? "",
        drive_url: driveData.drive_url,
      });
    }

    setMeetings((meetingsRes.data as MeetingRecord[]) ?? []);

    setLoading(false);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (title: string, desc: string, type: "success" | "error") => {
    toast.show({
      placement: "top",
      render: ({ id: toastId }) => (
        <Toast nativeID={toastId} action={type} variant="solid" className="mt-4 px-4 py-3">
          <VStack className="gap-1">
            <ToastTitle className="font-bold text-typography-0">{title}</ToastTitle>
            <ToastDescription className="text-typography-0">{desc}</ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  };

  const formatRupiah = (amount?: number | string | null) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) return "Rp 0";
    return "Rp " + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

  const formatCoordinate = (value?: number | string | null) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(6) : null;
  };

  const getInvoiceTypeLabel = (invoice: InvoiceRecord) => {
    if (invoice.invoice_type === "dp") return `DP ${invoice.dp_percentage ?? 50}%`;
    if (invoice.invoice_type === "lembur") return "Lembur";
    return "Pelunasan";
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

  // ─── Booking Actions ─────────────────────────────────────────────────────────

  const handleOpenMaps = async () => {
    const lat = formatCoordinate(booking?.latitude);
    const lng = formatCoordinate(booking?.longitude);
    const mapQuery = lat && lng ? `${lat},${lng}` : booking?.location?.trim();
    if (!mapQuery) {
      showToast("Lokasi Tidak Tersedia", "Koordinat atau alamat belum tersedia.", "error");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast("Gagal Membuka Maps", "Perangkat tidak dapat membuka tautan peta.", "error");
      return;
    }
    await Linking.openURL(url);
  };

  const handleAction = async (newStatus: string) => {
    if (newStatus === "completed") {
      const hasUnpaid = invoices.some((inv) => inv.status !== "paid");
      if (hasUnpaid) {
        showToast("Belum Bisa Close Order", "Masih ada invoice yang belum dibayar.", "error");
        return;
      }
    }
    const label =
      newStatus === "confirmed" ? "menerima" : newStatus === "cancelled" ? "menolak" : "menutup";

    Alert.alert("Konfirmasi", `Apakah Anda yakin ingin ${label} pesanan ini?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          setProcessingStatus(newStatus);
          const payload: Record<string, string> = { status: newStatus };
          if (newStatus === "completed") payload.closed_at = new Date().toISOString();

          const { error } = await supabase.from("bookings").update(payload).eq("id", id);
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

  // ─── Overtime Invoice ─────────────────────────────────────────────────────────

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
      showToast("Input Tidak Valid", "Tarif lembur per jam harus lebih dari 0.", "error");
      return;
    }
    if (!note) {
      showToast("Keterangan Wajib", "Admin wajib memberikan keterangan lembur.", "error");
      return;
    }
    const hasUnpaidOvertime = invoices.some(
      (inv) => inv.invoice_type === "lembur" && inv.status !== "paid",
    );
    if (hasUnpaidOvertime) {
      showToast("Invoice Lembur Masih Aktif", "Masih ada invoice lembur yang belum dibayar.", "error");
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

    showToast("Invoice Lembur Dibuat", "Klien harus membayar invoice lembur sebelum order ditutup.", "success");
    setOvertimeHours("1");
    setOvertimeRateInput("");
    setOvertimeNote("");
    void fetchDetail();
  };

  // ─── Drive Actions ────────────────────────────────────────────────────────────

  const handleSaveDrive = async () => {
    if (!driveForm.drive_name.trim()) {
      showToast("Validasi", "Nama drive wajib diisi.", "error");
      return;
    }
    if (!driveForm.drive_url.trim()) {
      showToast("Validasi", "URL drive wajib diisi.", "error");
      return;
    }

    setSavingDrive(true);

    const payload = {
      booking_id: id,
      drive_name: driveForm.drive_name.trim(),
      photo_count: Number(driveForm.photo_count) || 0,
      video_count: Number(driveForm.video_count) || 0,
      file_size: driveForm.file_size.trim() || null,
      drive_url: driveForm.drive_url.trim(),
      updated_at: new Date().toISOString(),
    };

    let error;
    if (drive) {
      ({ error } = await supabase.from("booking_drives").update(payload).eq("id", drive.id));
    } else {
      ({ error } = await supabase.from("booking_drives").insert(payload));
    }

    setSavingDrive(false);

    if (error) {
      showToast("Gagal Menyimpan Drive", error.message, "error");
      return;
    }

    showToast("Drive Disimpan", drive ? "Link drive berhasil diperbarui." : "Link drive berhasil ditambahkan.", "success");
    setDriveEditMode(false);
    setShowDriveForm(false);
    void fetchDetail();
  };

  const handleDeleteDrive = () => {
    Alert.alert("Hapus Link Drive", "Yakin ingin menghapus link drive ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          if (!drive) return;
          const { error } = await supabase.from("booking_drives").delete().eq("id", drive.id);
          if (error) {
            showToast("Gagal Menghapus", error.message, "error");
            return;
          }
          showToast("Drive Dihapus", "Link drive berhasil dihapus.", "success");
          setDrive(null);
          setDriveForm({ drive_name: "", photo_count: "", video_count: "", file_size: "", drive_url: "" });
          setDriveEditMode(false);
        },
      },
    ]);
  };

  // ─── Meeting Actions ──────────────────────────────────────────────────────────

  const handleCreateMeeting = async () => {
    if (!meetingForm.scheduled_at.trim()) {
      showToast("Validasi", "Jadwal meeting wajib diisi.", "error");
      return;
    }

    setSavingMeeting(true);

    const { error } = await supabase.from("meetings").insert({
      booking_id: id,
      meeting_type: meetingForm.meeting_type,
      status: "confirmed",
      scheduled_at: meetingForm.scheduled_at.trim(),
      admin_notes: meetingForm.admin_notes.trim() || null,
      created_by: "admin",
    });

    setSavingMeeting(false);

    if (error) {
      showToast("Gagal Membuat Meeting", error.message, "error");
      return;
    }

    showToast("Meeting Dijadwalkan", "Meeting berhasil ditambahkan.", "success");
    setMeetingForm({ meeting_type: "online", scheduled_at: "", admin_notes: "" });
    setShowMeetingForm(false);
    void fetchDetail();
  };

  const handleUpdateMeetingStatus = async (meetingId: string, newStatus: "done" | "cancelled") => {
    const label = newStatus === "done" ? "menandai selesai" : "membatalkan";
    Alert.alert("Konfirmasi", `Yakin ingin ${label} meeting ini?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          setUpdatingMeetingId(meetingId);
          const { error } = await supabase
            .from("meetings")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", meetingId);
          setUpdatingMeetingId(null);
          if (error) {
            showToast("Gagal", error.message, "error");
            return;
          }
          showToast("Berhasil", "Status meeting diperbarui.", "success");
          void fetchDetail();
        },
      },
    ]);
  };

  const handleConfirmMeeting = async (meetingId: string) => {
    setUpdatingMeetingId(meetingId);
    const { error } = await supabase
      .from("meetings")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    setUpdatingMeetingId(null);
    if (error) {
      showToast("Gagal", error.message, "error");
      return;
    }
    showToast("Meeting Dikonfirmasi", "Klien akan melihat meeting ini sebagai terjadwal.", "success");
    void fetchDetail();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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
        <Text className="text-center text-typography-500">Pesanan tidak ditemukan.</Text>
      </Center>
    );
  }

  const statusColor = getStatusColor(booking.status);
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const isPending = booking.status === "pending";
  const hasUnpaidInvoices = invoices.some((inv) => inv.status !== "paid");
  const isCloseable = ["dp_paid", "fully_paid"].includes(booking.status);
  const canCreateOvertime = ["dp_paid", "fully_paid"].includes(booking.status);
  const canManageDrive = ["dp_paid", "fully_paid", "completed"].includes(booking.status);
  const canManageMeeting = ["dp_paid", "fully_paid", "completed"].includes(booking.status);
  const latitude = formatCoordinate(booking.latitude);
  const longitude = formatCoordinate(booking.longitude);
  const instagramAccounts = Array.isArray(booking.instagram_accounts)
    ? booking.instagram_accounts
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        <VStack className="px-6 pt-6 gap-6">

          {/* Header */}
          <HStack className="items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-xl border border-outline-100 bg-background-0 p-2"
            >
              <Ionicons name="chevron-back" size={20} color={theme.icon} />
            </TouchableOpacity>
            <Heading className="text-xl font-black text-typography-900">Detail Pesanan</Heading>
          </HStack>

          {/* Status */}
          <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
            <HStack className="justify-between items-center gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-typography-500">
                Status Pesanan
              </Text>
              <Badge action={statusColor as never} variant="solid" className="rounded-lg">
                <BadgeText className="text-[10px] font-bold uppercase">{statusLabel}</BadgeText>
              </Badge>
            </HStack>
          </Box>

          {/* Info Klien */}
          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">Info Klien</Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
              <VStack className="gap-4">
                <HStack className="items-center gap-3">
                  <Ionicons name="person-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">Nama</Text>
                    <Text className="font-bold text-typography-900">
                      {booking.profiles?.full_name || "-"}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons name="call-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">No. HP</Text>
                    <Text className="font-bold text-typography-900">
                      {booking.phone_number || booking.profiles?.phone_number || "-"}
                    </Text>
                  </VStack>
                </HStack>

                {booking.profiles?.email ? (
                  <HStack className="items-center gap-3">
                    <Ionicons name="mail-outline" size={18} color={theme.icon} />
                    <VStack>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Email</Text>
                      <Text className="font-bold text-typography-900">{booking.profiles.email}</Text>
                    </VStack>
                  </HStack>
                ) : null}

                {instagramAccounts.length > 0 ? (
                  <HStack className="items-center gap-3">
                    <Ionicons name="logo-instagram" size={18} color={theme.icon} />
                    <VStack className="flex-1">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Instagram</Text>
                      <Text className="font-bold text-typography-900">
                        {instagramAccounts.join(", ")}
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}
              </VStack>
            </Box>
          </VStack>

          {/* Detail Acara */}
          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">Detail Acara</Heading>
            <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
              <VStack className="gap-4">
                <HStack className="items-center gap-3">
                  <Ionicons name="camera-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">Paket</Text>
                    <Text className="font-bold text-typography-900">
                      {booking.packages?.name || "-"}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons name="cash-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">Harga Paket</Text>
                    <Text className="font-bold text-typography-900">
                      {formatRupiah(booking.packages?.price)}
                    </Text>
                  </VStack>
                </HStack>

                <HStack className="items-center gap-3">
                  <Ionicons name="calendar-outline" size={18} color={theme.icon} />
                  <VStack>
                    <Text className="text-[10px] font-bold uppercase text-typography-400">Tanggal Acara</Text>
                    <Text className="font-bold text-typography-900">{booking.event_date || "-"}</Text>
                  </VStack>
                </HStack>

                {booking.event_time ? (
                  <HStack className="items-center gap-3">
                    <Ionicons name="time-outline" size={18} color={theme.icon} />
                    <VStack>
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Jam</Text>
                      <Text className="font-bold text-typography-900">
                        {booking.event_time.slice(0, 5)} WIB
                        {booking.end_time ? ` – ${booking.end_time.slice(0, 5)} WIB` : ""}
                      </Text>
                    </VStack>
                  </HStack>
                ) : null}

                <HStack className="items-start gap-3">
                  <Ionicons name="location-outline" size={18} color={theme.icon} />
                  <VStack className="flex-1">
                    <Text className="text-[10px] font-bold uppercase text-typography-400">Lokasi</Text>
                    <Text className="font-bold text-typography-900">{booking.location || "-"}</Text>
                    {latitude && longitude ? (
                      <Text className="mt-0.5 text-xs text-typography-400">
                        {latitude}, {longitude}
                      </Text>
                    ) : null}
                    {((latitude && longitude) || booking.location) ? (
                      <TouchableOpacity
                        onPress={() => void handleOpenMaps()}
                        className="mt-3 self-start rounded-lg border border-outline-100 bg-background-50 px-3 py-2"
                      >
                        <HStack className="items-center gap-2">
                          <Ionicons name="map-outline" size={14} color={theme.accent} />
                          <Text className="text-xs font-bold text-primary-600">Buka di Maps</Text>
                        </HStack>
                      </TouchableOpacity>
                    ) : null}
                  </VStack>
                </HStack>

                {booking.notes ? (
                  <HStack className="items-start gap-3">
                    <Ionicons name="document-text-outline" size={18} color={theme.icon} />
                    <VStack className="flex-1">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Catatan</Text>
                      <Text className="text-sm italic text-typography-500">"{booking.notes}"</Text>
                    </VStack>
                  </HStack>
                ) : null}
              </VStack>
            </Box>
          </VStack>

          {/* Daftar Invoice */}
          <VStack className="gap-3">
            <Heading className="ml-1 text-base font-black text-typography-900">Daftar Invoice</Heading>
            {invoices.length === 0 ? (
              <Box className="items-center rounded-3xl border border-dashed border-outline-100 bg-background-0 p-6">
                <Text className="text-center text-sm text-typography-400">Belum ada invoice.</Text>
              </Box>
            ) : (
              <VStack className="gap-3">
                {invoices.map((invoice) => {
                  const isPaid = invoice.status === "paid";
                  const isCancelled = invoice.status === "cancelled";
                  const badgeAction = isPaid ? "success" : isCancelled ? "error" : "warning";
                  const badgeLabel = isPaid ? "LUNAS" : isCancelled ? "DIBATALKAN" : "BELUM LUNAS";

                  return (
                    <Box
                      key={invoice.id}
                      className="rounded-2xl border border-outline-100 bg-background-0 p-4"
                    >
                      <VStack className="gap-2">
                        <HStack className="items-center justify-between gap-3">
                          <VStack className="flex-1">
                            <Text className="text-base font-black text-typography-900">
                              {formatRupiah(invoice.amount)}
                            </Text>
                            <Text className="text-xs font-bold uppercase text-typography-400">
                              {getInvoiceTypeLabel(invoice)} • #{invoice.invoice_number}
                            </Text>
                          </VStack>
                          <Badge action={badgeAction} variant="solid" className="rounded-lg">
                            <BadgeText className="text-[10px] font-bold uppercase">
                              {badgeLabel}
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

          {/* Invoice Lembur */}
          {canCreateOvertime ? (
            <VStack className="gap-3">
              <Pressable
                onPress={() => setShowOvertimeForm((v) => !v)}
                className="flex-row items-center justify-between rounded-2xl border border-outline-100 bg-background-0 px-5 py-4"
              >
                <HStack className="items-center gap-3">
                  <Ionicons name="time-outline" size={18} color={theme.warning} />
                  <Text className="font-bold text-typography-900">Invoice Lembur</Text>
                </HStack>
                <Ionicons
                  name={showOvertimeForm ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textSoft}
                />
              </Pressable>

              {showOvertimeForm ? (
                <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                  <VStack className="gap-3">
                    <Text className="text-xs leading-relaxed text-typography-500">
                      Lembur dihitung mulai pukul 17.00 di hari H. Buat invoice sebelum close order.
                    </Text>

                    <VStack className="gap-2">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Jam Lembur</Text>
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
                      <Text className="text-[10px] font-bold uppercase text-typography-400">Tarif per Jam</Text>
                      <Input className="rounded-xl border-outline-100 bg-background-50">
                        <InputField
                          value={overtimeRateInput}
                          onChangeText={(text) => setOvertimeRateInput(formatRupiahInput(text))}
                          keyboardType="numeric"
                          placeholder="Rp 0"
                        />
                      </Input>
                    </VStack>

                    <VStack className="gap-2">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Keterangan <Text className="text-error-500">*</Text>
                      </Text>
                      <Input className="rounded-xl border-outline-100 bg-background-50">
                        <InputField
                          value={overtimeNote}
                          onChangeText={setOvertimeNote}
                          placeholder="Contoh: Tambahan dokumentasi sesi resepsi malam"
                        />
                      </Input>
                    </VStack>

                    <HStack className="gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        action="secondary"
                        className="flex-1 rounded-xl border-outline-200"
                        onPress={() => setShowOvertimeForm(false)}
                        disabled={creatingOvertimeInvoice}
                      >
                        <ButtonText className="font-bold text-typography-600">Batal</ButtonText>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 rounded-xl bg-typography-900"
                        onPress={() => void handleCreateOvertimeInvoice()}
                        disabled={creatingOvertimeInvoice}
                      >
                        {creatingOvertimeInvoice ? (
                          <ButtonSpinner color={theme.surface} />
                        ) : (
                          <ButtonText className="font-bold text-typography-0">Buat</ButtonText>
                        )}
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              ) : null}
            </VStack>
          ) : null}

          {/* Link Drive Hasil */}
          {canManageDrive ? (
            <VStack className="gap-3">
              {drive && !driveEditMode ? (
                /* Info drive: header + info + edit/hapus */
                <>
                  <HStack className="ml-1 items-center justify-between">
                    <Heading className="text-base font-black text-typography-900">Link Drive Hasil</Heading>
                    <HStack className="gap-2">
                      <Pressable
                        onPress={() => setDriveEditMode(true)}
                        className="rounded-lg border border-outline-100 bg-background-0 px-3 py-1.5"
                      >
                        <Text className="text-xs font-bold text-typography-600">Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleDeleteDrive}
                        className="rounded-lg border border-error-200 bg-error-50 px-3 py-1.5"
                      >
                        <Text className="text-xs font-bold text-error-600">Hapus</Text>
                      </Pressable>
                    </HStack>
                  </HStack>

                  <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                    <VStack className="gap-4">
                      <HStack className="items-center gap-3">
                        <Box className="rounded-2xl bg-background-100 p-3">
                          <Ionicons name="cloud-outline" size={24} color={theme.icon} />
                        </Box>
                        <VStack className="flex-1">
                          <Text className="font-black text-typography-900 text-base">
                            {drive.drive_name}
                          </Text>
                          <Text className="text-xs text-typography-500 mt-0.5">Google Drive</Text>
                        </VStack>
                      </HStack>

                      <HStack className="gap-3">
                        <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                          <Ionicons name="image-outline" size={20} color={theme.textSoft} />
                          <Text className="text-lg font-black text-typography-900 mt-1">
                            {drive.photo_count}
                          </Text>
                          <Text className="text-[10px] font-bold uppercase text-typography-400">Foto</Text>
                        </Box>
                        <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                          <Ionicons name="videocam-outline" size={20} color={theme.textSoft} />
                          <Text className="text-lg font-black text-typography-900 mt-1">
                            {drive.video_count}
                          </Text>
                          <Text className="text-[10px] font-bold uppercase text-typography-400">Video</Text>
                        </Box>
                        {drive.file_size ? (
                          <Box className="flex-1 rounded-2xl bg-background-50 border border-outline-50 p-3 items-center">
                            <Ionicons name="server-outline" size={20} color={theme.textSoft} />
                            <Text className="text-sm font-black text-typography-900 mt-1">
                              {drive.file_size}
                            </Text>
                            <Text className="text-[10px] font-bold uppercase text-typography-400">Ukuran</Text>
                          </Box>
                        ) : null}
                      </HStack>

                      <Box className="rounded-2xl border border-outline-100 bg-background-50 px-4 py-3">
                        <Text className="text-[10px] font-bold uppercase text-typography-400 mb-1">URL Drive</Text>
                        <Text className="text-xs text-typography-600" numberOfLines={2}>
                          {drive.drive_url}
                        </Text>
                      </Box>
                    </VStack>
                  </Box>
                </>
              ) : driveEditMode ? (
                /* Form edit drive */
                <>
                  <Heading className="ml-1 text-base font-black text-typography-900">Link Drive Hasil</Heading>
                  <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                    <VStack className="gap-3">
                      <VStack className="gap-2">
                        <Text className="text-[10px] font-bold uppercase text-typography-400">
                          Nama Drive <Text className="text-error-500">*</Text>
                        </Text>
                        <Input className="rounded-xl border-outline-100 bg-background-50">
                          <InputField
                            value={driveForm.drive_name}
                            onChangeText={(v) => setDriveForm((f) => ({ ...f, drive_name: v }))}
                            placeholder="Contoh: Pernikahan Budi & Ani"
                          />
                        </Input>
                      </VStack>

                      <HStack className="gap-3">
                        <VStack className="flex-1 gap-2">
                          <Text className="text-[10px] font-bold uppercase text-typography-400">Jml Foto</Text>
                          <Input className="rounded-xl border-outline-100 bg-background-50">
                            <InputField
                              value={driveForm.photo_count}
                              onChangeText={(v) => setDriveForm((f) => ({ ...f, photo_count: v }))}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </Input>
                        </VStack>
                        <VStack className="flex-1 gap-2">
                          <Text className="text-[10px] font-bold uppercase text-typography-400">Jml Video</Text>
                          <Input className="rounded-xl border-outline-100 bg-background-50">
                            <InputField
                              value={driveForm.video_count}
                              onChangeText={(v) => setDriveForm((f) => ({ ...f, video_count: v }))}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </Input>
                        </VStack>
                        <VStack className="flex-1 gap-2">
                          <Text className="text-[10px] font-bold uppercase text-typography-400">Ukuran</Text>
                          <Input className="rounded-xl border-outline-100 bg-background-50">
                            <InputField
                              value={driveForm.file_size}
                              onChangeText={(v) => setDriveForm((f) => ({ ...f, file_size: v }))}
                              placeholder="2.3 GB"
                            />
                          </Input>
                        </VStack>
                      </HStack>

                      <VStack className="gap-2">
                        <Text className="text-[10px] font-bold uppercase text-typography-400">
                          URL Google Drive <Text className="text-error-500">*</Text>
                        </Text>
                        <Input className="rounded-xl border-outline-100 bg-background-50">
                          <InputField
                            value={driveForm.drive_url}
                            onChangeText={(v) => setDriveForm((f) => ({ ...f, drive_url: v }))}
                            placeholder="https://drive.google.com/..."
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                          />
                        </Input>
                      </VStack>

                      <HStack className="gap-3 mt-1">
                        <Button
                          size="lg"
                          variant="outline"
                          action="secondary"
                          className="flex-1 rounded-xl border-outline-200"
                          onPress={() => setDriveEditMode(false)}
                          disabled={savingDrive}
                        >
                          <ButtonText className="font-bold text-typography-600">Batal</ButtonText>
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 rounded-xl bg-typography-900"
                          onPress={() => void handleSaveDrive()}
                          disabled={savingDrive}
                        >
                          {savingDrive ? (
                            <ButtonSpinner color={theme.surface} />
                          ) : (
                            <ButtonText className="font-bold text-typography-0">Simpan Perubahan</ButtonText>
                          )}
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                </>
              ) : (
                /* Accordion: tombol tetap tampil, form drop di bawah */
                <>
                  <Pressable
                    onPress={() => setShowDriveForm((v) => !v)}
                    className="flex-row items-center justify-between rounded-2xl border border-outline-100 bg-background-0 px-5 py-4"
                  >
                    <HStack className="items-center gap-3">
                      <Ionicons name="cloud-upload-outline" size={18} color={theme.accent} />
                      <Text className="font-bold text-typography-900">Tambah Link Drive Hasil</Text>
                    </HStack>
                    <Ionicons
                      name={showDriveForm ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.textSoft}
                    />
                  </Pressable>

                  {showDriveForm ? (
                    <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                      <VStack className="gap-3">
                        <Text className="text-xs leading-relaxed text-typography-500">
                          Tambahkan link Google Drive hasil dokumentasi. Klien hanya bisa mengakses link setelah pelunasan.
                        </Text>

                        <VStack className="gap-2">
                          <Text className="text-[10px] font-bold uppercase text-typography-400">
                            Nama Drive <Text className="text-error-500">*</Text>
                          </Text>
                          <Input className="rounded-xl border-outline-100 bg-background-50">
                            <InputField
                              value={driveForm.drive_name}
                              onChangeText={(v) => setDriveForm((f) => ({ ...f, drive_name: v }))}
                              placeholder="Contoh: Pernikahan Budi & Ani"
                            />
                          </Input>
                        </VStack>

                        <HStack className="gap-3">
                          <VStack className="flex-1 gap-2">
                            <Text className="text-[10px] font-bold uppercase text-typography-400">Jml Foto</Text>
                            <Input className="rounded-xl border-outline-100 bg-background-50">
                              <InputField
                                value={driveForm.photo_count}
                                onChangeText={(v) => setDriveForm((f) => ({ ...f, photo_count: v }))}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                            </Input>
                          </VStack>
                          <VStack className="flex-1 gap-2">
                            <Text className="text-[10px] font-bold uppercase text-typography-400">Jml Video</Text>
                            <Input className="rounded-xl border-outline-100 bg-background-50">
                              <InputField
                                value={driveForm.video_count}
                                onChangeText={(v) => setDriveForm((f) => ({ ...f, video_count: v }))}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                            </Input>
                          </VStack>
                          <VStack className="flex-1 gap-2">
                            <Text className="text-[10px] font-bold uppercase text-typography-400">Ukuran</Text>
                            <Input className="rounded-xl border-outline-100 bg-background-50">
                              <InputField
                                value={driveForm.file_size}
                                onChangeText={(v) => setDriveForm((f) => ({ ...f, file_size: v }))}
                                placeholder="2.3 GB"
                              />
                            </Input>
                          </VStack>
                        </HStack>

                        <VStack className="gap-2">
                          <Text className="text-[10px] font-bold uppercase text-typography-400">
                            URL Google Drive <Text className="text-error-500">*</Text>
                          </Text>
                          <Input className="rounded-xl border-outline-100 bg-background-50">
                            <InputField
                              value={driveForm.drive_url}
                              onChangeText={(v) => setDriveForm((f) => ({ ...f, drive_url: v }))}
                              placeholder="https://drive.google.com/..."
                              autoCapitalize="none"
                              autoCorrect={false}
                              keyboardType="url"
                            />
                          </Input>
                        </VStack>

                        <HStack className="gap-3 mt-1">
                          <Button
                            size="lg"
                            variant="outline"
                            action="secondary"
                            className="flex-1 rounded-xl border-outline-200"
                            onPress={() => setShowDriveForm(false)}
                            disabled={savingDrive}
                          >
                            <ButtonText className="font-bold text-typography-600">Batal</ButtonText>
                          </Button>
                          <Button
                            size="lg"
                            className="flex-1 rounded-xl bg-typography-900"
                            onPress={() => void handleSaveDrive()}
                            disabled={savingDrive}
                          >
                            {savingDrive ? (
                              <ButtonSpinner color={theme.surface} />
                            ) : (
                              <ButtonText className="font-bold text-typography-0">Simpan Drive</ButtonText>
                            )}
                          </Button>
                        </HStack>
                      </VStack>
                    </Box>
                  ) : null}
                </>
              )}
            </VStack>
          ) : null}

          {/* Meeting */}
          {canManageMeeting ? (
            <VStack className="gap-3">
              <Heading className="ml-1 text-base font-black text-typography-900">Meeting</Heading>

              {/* Daftar meeting */}
              {meetings.length > 0 ? (
                <VStack className="gap-3">
                  {meetings.map((meeting) => {
                    const cfg = MEETING_STATUS_CONFIG[meeting.status];
                    const isActive = ["requested", "confirmed"].includes(meeting.status);
                    return (
                      <Box
                        key={meeting.id}
                        className="rounded-2xl border border-outline-100 bg-background-0 p-4"
                      >
                        <VStack className="gap-3">
                          <HStack className="justify-between items-start gap-2">
                            <VStack className="flex-1 gap-1">
                              <HStack className="items-center gap-2">
                                <Ionicons
                                  name={meeting.meeting_type === "online" ? "videocam-outline" : "people-outline"}
                                  size={16}
                                  color={theme.accent}
                                />
                                <Text className="font-black text-typography-900 text-sm">
                                  Meeting {meeting.meeting_type === "online" ? "Online" : "Offline"}
                                </Text>
                              </HStack>
                              <Text className="text-[10px] font-bold uppercase text-typography-400">
                                Dibuat oleh {meeting.created_by === "admin" ? "Admin" : "Klien"}
                              </Text>
                            </VStack>
                            <Badge action={cfg.badgeAction} variant="solid" className="rounded-lg">
                              <BadgeText className="text-[10px] font-bold uppercase">{cfg.label}</BadgeText>
                            </Badge>
                          </HStack>

                          {meeting.scheduled_at ? (
                            <HStack className="items-center gap-2 rounded-xl bg-background-50 border border-outline-50 px-3 py-2">
                              <Ionicons name="time-outline" size={15} color={theme.textSoft} />
                              <Text className="text-sm font-bold text-typography-700 flex-1">
                                {meeting.scheduled_at}
                              </Text>
                            </HStack>
                          ) : null}

                          {meeting.client_notes ? (
                            <Box className="rounded-xl bg-background-50 border border-outline-50 px-3 py-2">
                              <Text className="text-[10px] font-bold uppercase text-typography-400 mb-1">
                                Catatan Klien
                              </Text>
                              <Text className="text-xs text-typography-600">{meeting.client_notes}</Text>
                            </Box>
                          ) : null}

                          {meeting.admin_notes ? (
                            <Box className="rounded-xl bg-primary-50 border border-primary-100 px-3 py-2">
                              <Text className="text-[10px] font-bold uppercase text-primary-600 mb-1">
                                Instruksi / Info
                              </Text>
                              <Text className="text-xs text-typography-700">{meeting.admin_notes}</Text>
                            </Box>
                          ) : null}

                          {isActive ? (
                            <HStack className="gap-2">
                              {meeting.status === "requested" ? (
                                <Button
                                  size="sm"
                                  className="flex-1 rounded-xl bg-typography-900"
                                  onPress={() => void handleConfirmMeeting(meeting.id)}
                                  disabled={updatingMeetingId === meeting.id}
                                >
                                  {updatingMeetingId === meeting.id ? (
                                    <ButtonSpinner color={theme.surface} />
                                  ) : (
                                    <ButtonText className="font-bold text-typography-0 text-xs">
                                      Konfirmasi
                                    </ButtonText>
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                className="flex-1 rounded-xl bg-success-600"
                                onPress={() => void handleUpdateMeetingStatus(meeting.id, "done")}
                                disabled={updatingMeetingId === meeting.id}
                              >
                                {updatingMeetingId === meeting.id ? (
                                  <ButtonSpinner color={theme.surface} />
                                ) : (
                                  <ButtonText className="font-bold text-typography-0 text-xs">Selesai</ButtonText>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                action="negative"
                                className="flex-1 rounded-xl border-error-200"
                                onPress={() => void handleUpdateMeetingStatus(meeting.id, "cancelled")}
                                disabled={updatingMeetingId === meeting.id}
                              >
                                <ButtonText className="font-bold text-error-600 text-xs">Batalkan</ButtonText>
                              </Button>
                            </HStack>
                          ) : null}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              ) : null}

              {/* Accordion: Jadwalkan Meeting Baru */}
              <Pressable
                onPress={() => setShowMeetingForm((v) => !v)}
                className="flex-row items-center justify-between rounded-2xl border border-outline-100 bg-background-0 px-5 py-4"
              >
                <HStack className="items-center gap-3">
                  <Ionicons name="calendar-outline" size={18} color={theme.accent} />
                  <Text className="font-bold text-typography-900">Jadwalkan Meeting Baru</Text>
                </HStack>
                <Ionicons
                  name={showMeetingForm ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textSoft}
                />
              </Pressable>

              {showMeetingForm ? (
                <Box className="rounded-3xl border border-outline-100 bg-background-0 p-5">
                  <VStack className="gap-3">
                    <HStack className="gap-2">
                      {(["online", "offline"] as const).map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => setMeetingForm((f) => ({ ...f, meeting_type: type }))}
                          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                            meetingForm.meeting_type === type
                              ? "border-primary-300 bg-primary-50"
                              : "border-outline-100 bg-background-50"
                          }`}
                        >
                          <Ionicons
                            name={type === "online" ? "videocam-outline" : "people-outline"}
                            size={16}
                            color={meetingForm.meeting_type === type ? theme.accent : theme.textSoft}
                          />
                          <Text
                            className={`text-sm font-bold ${
                              meetingForm.meeting_type === type
                                ? "text-primary-600"
                                : "text-typography-500"
                            }`}
                          >
                            {type === "online" ? "Online" : "Offline"}
                          </Text>
                        </Pressable>
                      ))}
                    </HStack>

                    <VStack className="gap-2">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        Jadwal <Text className="text-error-500">*</Text>
                      </Text>
                      <Input className="rounded-xl border-outline-100 bg-background-50">
                        <InputField
                          value={meetingForm.scheduled_at}
                          onChangeText={(v) => setMeetingForm((f) => ({ ...f, scheduled_at: v }))}
                          placeholder="Contoh: Sabtu, 3 Mei 2026 pkl 14.00"
                        />
                      </Input>
                    </VStack>

                    <VStack className="gap-2">
                      <Text className="text-[10px] font-bold uppercase text-typography-400">
                        {meetingForm.meeting_type === "online"
                          ? "Instruksi / Info Tambahan"
                          : "Lokasi & Instruksi"}
                      </Text>
                      <Input className="rounded-xl border-outline-100 bg-background-50">
                        <InputField
                          value={meetingForm.admin_notes}
                          onChangeText={(v) => setMeetingForm((f) => ({ ...f, admin_notes: v }))}
                          placeholder={
                            meetingForm.meeting_type === "online"
                              ? "Contoh: Admin akan menghubungi via WhatsApp"
                              : "Contoh: Studio Arte Visual, Jl. Raya No. 12"
                          }
                        />
                      </Input>
                    </VStack>

                    <HStack className="gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        action="secondary"
                        className="flex-1 rounded-xl border-outline-200"
                        onPress={() => setShowMeetingForm(false)}
                        disabled={savingMeeting}
                      >
                        <ButtonText className="font-bold text-typography-600">Batal</ButtonText>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 rounded-xl bg-typography-900"
                        onPress={() => void handleCreateMeeting()}
                        disabled={savingMeeting}
                      >
                        {savingMeeting ? (
                          <ButtonSpinner color={theme.surface} />
                        ) : (
                          <ButtonText className="font-bold text-typography-0">Jadwalkan</ButtonText>
                        )}
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              ) : null}
            </VStack>
          ) : null}

          {/* Riwayat Pembayaran */}
          <VStack className="gap-3">
            <Pressable
              onPress={() => setShowPayments((v) => !v)}
              className="flex-row items-center justify-between rounded-2xl border border-outline-100 bg-background-0 px-5 py-4"
            >
              <HStack className="items-center gap-3">
                <Ionicons name="receipt-outline" size={18} color={theme.icon} />
                <Text className="font-bold text-typography-900">
                  Riwayat Pembayaran
                  {payments.length > 0 ? (
                    <Text className="text-typography-400"> ({payments.length})</Text>
                  ) : null}
                </Text>
              </HStack>
              <Ionicons
                name={showPayments ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.textSoft}
              />
            </Pressable>

            {showPayments ? (
              payments.length === 0 ? (
                <Box className="items-center rounded-3xl border border-dashed border-outline-100 bg-background-0 p-6">
                  <Ionicons name="receipt-outline" size={32} color={theme.textSoft} />
                  <Text className="mt-2 text-center text-sm text-typography-400">Belum ada pembayaran.</Text>
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
                            {payment.payment_type || "payment"} • {payment.status || "pending"}
                          </Text>
                        </VStack>
                        <Badge
                          action={payment.status === "settlement" ? "success" : "warning"}
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
              )
            ) : null}
          </VStack>

          {/* Action Buttons */}
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
                  <ButtonText className="font-bold text-error-600">Tolak</ButtonText>
                )}
              </Button>

              <Button
                size="lg"
                className="flex-1 rounded-xl bg-typography-900"
                onPress={() => handleAction("confirmed")}
                disabled={Boolean(processingStatus)}
              >
                {processingStatus === "confirmed" ? (
                  <ButtonSpinner color={theme.surface} />
                ) : (
                  <ButtonText className="font-bold text-typography-0">Acc Pesanan</ButtonText>
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
                <ButtonSpinner color={theme.surface} />
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
