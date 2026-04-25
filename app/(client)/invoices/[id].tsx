import React, { useState } from "react";
import { ScrollView, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

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

export default function InvoiceDetailScreen() {
  const { id, from, bookingId } = useLocalSearchParams<{
    id: string;
    from?: string;
    bookingId?: string;
  }>();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const loadInvoice = async () => {
    return supabase
      .from("invoices")
      .select(
        `
          id,
          booking_id,
          invoice_number,
          amount,
          status,
          invoice_type,
          dp_percentage,
          overtime_hours,
          overtime_rate,
          notes,
          created_at,
          bookings(
            id,
            event_date,
            phone_number,
            packages(id, name),
            profiles(id, full_name)
          )
        `,
      )
      .eq("id", id)
      .single();
  };

  const handleClose = () => {
    if (from === "invoice-list") {
      router.replace("/(client)/invoices");
      return;
    }

    const targetBookingId = bookingId || invoice?.booking_id;

    if (from === "order-detail" && targetBookingId) {
      router.replace(`/(client)/orders/${targetBookingId}`);
      return;
    }

    if (invoice?.booking_id) {
      router.replace(`/(client)/orders/${invoice.booking_id}`);
      return;
    }

    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      void fetchInvoiceDetail();
    }, [id]),
  );

  const fetchInvoiceDetail = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!id) {
      setInvoice(null);
      setErrorMessage("ID invoice tidak ditemukan.");
      setLoading(false);
      return;
    }

    const { data, error } = await loadInvoice();

    if (error) {
      console.error("[InvoiceDetail] Failed to fetch invoice", {
        invoiceId: id,
        error,
      });
      setInvoice(null);
      setErrorMessage(error.message || "Gagal memuat detail invoice.");
      setLoading(false);
      return;
    }

    setInvoice(data);
    setLoading(false);
  };

  const formatRupiah = (angka: any) => {
    if (!angka) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const isInvoicePaid = invoice?.status === "paid";
  const invoiceStatusLabel = isInvoicePaid
    ? "PAID / LUNAS"
    : "UNPAID / BELUM LUNAS";
  const invoiceStatusColor = isInvoicePaid ? "#10B981" : "#F59E0B";

  const generatePDF = async () => {
    setPrinting(true);

    // Selalu ambil data terbaru agar status cetak konsisten dengan DB.
    const { data: latestInvoice, error: latestError } = await loadInvoice();

    if (latestError || !latestInvoice) {
      console.error("[InvoiceDetail] Failed to refresh invoice before print", {
        invoiceId: id,
        error: latestError,
      });
      setPrinting(false);
      return;
    }

    setInvoice(latestInvoice);

    const isPaidLatest = latestInvoice.status === "paid";
    const statusLabelLatest = isPaidLatest
      ? "PAID / LUNAS"
      : "UNPAID / BELUM LUNAS";
    const statusColorLatest = isPaidLatest ? "#10B981" : "#F59E0B";
    const latestBooking = Array.isArray(latestInvoice.bookings)
      ? latestInvoice.bookings[0]
      : latestInvoice.bookings;
    const latestProfile = Array.isArray(latestBooking?.profiles)
      ? latestBooking?.profiles[0]
      : latestBooking?.profiles;
    const latestPackage = Array.isArray(latestBooking?.packages)
      ? latestBooking?.packages[0]
      : latestBooking?.packages;

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #111; }
            .invoice-title { font-size: 32px; font-weight: 900; margin: 20px 0; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .col { flex: 1; }
            .label { font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
            .value { font-size: 14px; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { text-align: left; padding: 15px; background: #f9f9f9; font-size: 12px; border-bottom: 1px solid #eee; }
            .table td { padding: 15px; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-section { margin-top: 40px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 10px; }
            .grand-total { font-size: 24px; font-weight: 900; color: #0284c7; }
            .footer { margin-top: 80px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            .badge { background: ${statusColorLatest}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ARTE VISUAL</div>
            <div class="badge">${statusLabelLatest}</div>
          </div>
          
          <h1 class="invoice-title">INVOICE</h1>
          
          <div class="details">
            <div class="col">
              <div class="label">Billed To</div>
              <div class="value">${latestProfile?.full_name ?? "Klien"}</div>
              <div class="value">${latestBooking?.phone_number ?? "-"}</div>
            </div>
            <div class="col" style="text-align: right;">
              <div class="label">Invoice Date</div>
              <div class="value">${new Date(latestInvoice.created_at).toLocaleDateString("id-ID")}</div>
              <div class="label" style="margin-top: 15px;">Invoice Number</div>
              <div class="value">${latestInvoice.invoice_number}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Item / Layanan</th>
                <th>Tanggal Acara</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${latestPackage?.name ?? "Paket Layanan"}</strong><br/>
                  <small style="color: #666">Tipe: ${latestInvoice.invoice_type === "dp" ? "DP" : latestInvoice.invoice_type === "lembur" ? "LEMBUR" : "PELUNASAN"}</small>
                  ${latestInvoice.invoice_type === "lembur" ? `<br/><small style="color: #666">Lembur ${latestInvoice.overtime_hours ?? 0} jam x ${formatRupiah(latestInvoice.overtime_rate)}</small>` : ""}
                </td>
                <td>${latestBooking?.event_date ?? "-"}</td>
                <td style="text-align: right;">${formatRupiah(latestInvoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span class="label">${isPaidLatest ? "Total Pembayaran" : "Total Tagihan"}</span>
              <span class="grand-total">${formatRupiah(latestInvoice.amount)}</span>
            </div>
          </div>

          <div class="footer">
            Terima kasih telah menggunakan jasa Arte Visual. Persiapkan diri Anda untuk hasil terbaik.<br/>
            Jl. Raya Serang No. 12, Banten, Indonesia • www.artevisual.id
          </div>
        </body>
      </html>
    `;

    try {
      const printModule = require("expo-print") as typeof import("expo-print");
      const sharingModule =
        require("expo-sharing") as typeof import("expo-sharing");
      const printToFileAsync = printModule.printToFileAsync;
      const shareAsync = sharingModule.shareAsync;

      if (!printToFileAsync) {
        throw new Error("Fitur export PDF belum tersedia di perangkat ini.");
      }

      if (!shareAsync) {
        throw new Error("Fitur berbagi file belum tersedia di perangkat ini.");
      }

      const { uri } = await printToFileAsync({ html });
      console.log("File has been saved to:", uri);
      if (Platform.OS === "ios") {
        await shareAsync(uri);
      } else {
        await shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Simpan Invoice",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPrinting(false);
    }
  };

  if (loading || !invoice)
    return (
      <Center className="flex-1 bg-background-50">
        {loading ? (
          <Spinner size="large" />
        ) : (
          <Box className="mx-6 w-full max-w-[360px] rounded-3xl border border-outline-100 bg-background-0 p-6">
            <VStack className="gap-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-error-700">
                Gagal Memuat Invoice
              </Text>
              <Text className="text-sm leading-relaxed text-typography-700">
                {errorMessage || "Detail invoice belum bisa dimuat."}
              </Text>
              <Button
                onPress={() => void fetchInvoiceDetail()}
                className="rounded-2xl bg-primary-600"
              >
                <ButtonText className="font-bold text-typography-0">
                  Coba Lagi
                </ButtonText>
              </Button>
              <Button
                variant="outline"
                action="secondary"
                onPress={handleClose}
                className="rounded-2xl border-outline-200"
              >
                <ButtonText className="font-bold text-typography-700">
                  Kembali
                </ButtonText>
              </Button>
            </VStack>
          </Box>
        )}
      </Center>
    );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack className="px-6 pt-6 gap-8">
          {/* Header */}
          <HStack className="items-center justify-between">
            <TouchableOpacity
              onPress={handleClose}
              className="rounded-xl border border-outline-100 bg-background-0 p-2 shadow-soft-1"
            >
              <Ionicons name="close" size={20} color={theme.icon} />
            </TouchableOpacity>
            <Heading className="text-xl font-black text-typography-900">
              Digital Invoice
            </Heading>
            <Box className="w-10" />
          </HStack>

          {/* Invoice UI Representation */}
          <Box className="overflow-hidden rounded-[40px] border border-outline-100 bg-background-0 p-8 shadow-hard-2">
            {/* Top Pattern */}
            <Box className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-bl-[100px]" />

            <VStack className="gap-10">
              {/* Logo & ID */}
              <HStack className="justify-between items-start">
                <VStack>
                  <Text className="text-typography-900 font-black text-2xl">
                    ARTE
                  </Text>
                  <Text className="text-primary-600 font-black text-2xl -mt-2">
                    VISUAL
                  </Text>
                </VStack>
                <Box
                  className={`rounded-lg px-3 py-1 ${invoice.status === "paid" ? "bg-success-500" : "bg-warning-500"}`}
                >
                  <Text className="text-[10px] font-black uppercase text-typography-0">
                    {invoice.status === "paid" ? "Lunas / Paid" : "Belum Lunas"}
                  </Text>
                </Box>
              </HStack>

              {/* Main Details */}
              <HStack className="justify-between">
                <VStack className="gap-1">
                  <Text className="text-typography-400 text-[10px] font-bold uppercase tracking-widest">
                    Atas Nama
                  </Text>
                  <Text className="text-typography-900 font-bold text-sm">
                    {invoice.bookings.profiles.full_name}
                  </Text>
                  <Text className="text-typography-500 text-xs">
                    {invoice.bookings.phone_number}
                  </Text>
                </VStack>
                <VStack className="gap-1 items-end">
                  <Text className="text-typography-400 text-[10px] font-bold uppercase tracking-widest">
                    Nomor Invoice
                  </Text>
                  <Text className="text-typography-900 font-bold text-sm">
                    #{invoice.invoice_number.slice(-8).toUpperCase()}
                  </Text>
                  <Text className="text-typography-500 text-xs">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </Text>
                </VStack>
              </HStack>

              <Box className="h-[1px] bg-outline-100 border-dashed border-t" />

              {/* Item List */}
              <VStack className="gap-4">
                <Text className="text-typography-900 font-bold text-xs uppercase tracking-widest">
                  Detail Layanan
                </Text>
                <HStack className="justify-between items-center">
                  <VStack className="flex-1 mr-4">
                    <Text className="text-typography-900 font-black text-base">
                      {invoice.bookings.packages.name}
                    </Text>
                    <Text className="text-typography-500 text-xs mt-1">
                      {invoice.invoice_type === "dp"
                        ? `DP ${invoice.dp_percentage ?? 50}%`
                        : invoice.invoice_type === "lembur"
                          ? "Lembur"
                          : "Pelunasan"}
                      {" · "}
                      Acara pada {invoice.bookings.event_date}
                    </Text>
                    {invoice.invoice_type === "lembur" ? (
                      <Text className="mt-1 text-xs text-typography-500">
                        Lembur {invoice.overtime_hours ?? 0} jam x{" "}
                        {formatRupiah(invoice.overtime_rate)}
                        {invoice.notes ? ` • ${invoice.notes}` : ""}
                      </Text>
                    ) : null}
                  </VStack>
                  <Text className="text-typography-900 font-bold text-sm">
                    {formatRupiah(invoice.amount)}
                  </Text>
                </HStack>
              </VStack>

              <Box className="bg-background-50 p-6 rounded-3xl border border-outline-50">
                <HStack className="justify-between items-center">
                  <Text className="text-typography-500 font-bold text-sm">
                    {isInvoicePaid ? "Total Dibayar" : "Total Tagihan"}
                  </Text>
                  <Text className="text-primary-600 font-black text-2xl">
                    {formatRupiah(invoice.amount)}
                  </Text>
                </HStack>
              </Box>

              <VStack className="items-center gap-2">
                <Ionicons name="barcode-outline" size={32} color={theme.borderStrong} />
                <Text className="text-typography-400 text-[10px] font-bold text-center">
                  Simpan invoice ini sebagai bukti sah pembayaran Anda.
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* Action Buttons */}
          <VStack className="gap-3">
            <Button
              size="xl"
              onPress={generatePDF}
              disabled={printing}
              className="h-14 rounded-2xl bg-primary-600"
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={theme.surface}
                style={{ marginRight: 8 }}
              />
              {printing ? (
                <ButtonSpinner color={theme.surface} />
              ) : (
                <ButtonText className="font-bold text-typography-0">
                  UNDUH PDF INVOICE
                </ButtonText>
              )}
            </Button>
            <Button
              size="xl"
              variant="outline"
              onPress={handleClose}
              className="rounded-2xl border-outline-200"
            >
              <ButtonText className="text-typography-600 font-bold">
                KEMBALI
              </ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
