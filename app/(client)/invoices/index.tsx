import React, { useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

export default function ClientInvoicesScreen() {
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      void fetchInvoices();
    }, []),
  );

  const fetchInvoices = async () => {
    setLoading(true);

    const { data, error } = await supabase
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
          created_at,
          bookings(
            id,
            event_date,
            packages(id, name)
          )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ClientInvoices] Failed to fetch invoices", error);
      setInvoices([]);
      setLoading(false);
      return;
    }

    setInvoices(data || []);
    setLoading(false);
  };

  const formatRupiah = (angka: any) => {
    if (!angka) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== "paid",
  );
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");

  const isLockedFinalInvoice = (invoice: any) => {
    if (invoice.invoice_type !== "pelunasan") return false;

    const dpInvoice = invoices.find(
      (item) =>
        item.booking_id === invoice.booking_id && item.invoice_type === "dp",
    );

    return !!dpInvoice && dpInvoice.status !== "paid";
  };

  const renderInvoiceCard = (invoice: any, muted = false) => {
    const locked = isLockedFinalInvoice(invoice);

    return (
      <Box
        key={invoice.id}
        className={`rounded-2xl border border-outline-100 p-4 ${
          muted ? "bg-background-50 opacity-60" : "bg-background-0"
        }`}
      >
        <VStack className="gap-3">
          <HStack className="items-start justify-between gap-3">
            <VStack className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-typography-400">
                {invoice.invoice_type === "dp"
                  ? `DP ${invoice.dp_percentage ?? 50}%`
                  : invoice.invoice_type === "lembur"
                    ? "Lembur"
                    : "Pelunasan"}
              </Text>
              <Heading className="mt-1 text-lg font-black text-typography-900">
                {formatRupiah(invoice.amount)}
              </Heading>
              <Text className="mt-1 text-xs text-typography-500">
                #{invoice.invoice_number}
              </Text>
              <Text className="mt-1 text-sm text-typography-600">
                {invoice.bookings?.packages?.name || "Paket Layanan"} ·{" "}
                {invoice.bookings?.event_date || "Tanggal belum tersedia"}
              </Text>
            </VStack>

            <Badge
              action={
                invoice.status === "paid"
                  ? "success"
                  : locked
                    ? "muted"
                    : "warning"
              }
              variant="solid"
              className="rounded-lg"
            >
              <BadgeText className="text-[10px] font-bold uppercase">
                {invoice.status === "paid"
                  ? "Lunas"
                  : locked
                    ? "Terkunci"
                    : "Belum Bayar"}
              </BadgeText>
            </Badge>
          </HStack>

          {locked ? (
            <Box className="rounded-xl border border-outline-100 bg-background-50 px-3 py-2">
              <Text className="text-xs text-typography-500">
                Pelunasan bisa dibayar setelah invoice DP lunas.
              </Text>
            </Box>
          ) : null}

          <HStack className="justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              action="secondary"
              className="rounded-xl border-outline-200"
              onPress={() =>
                router.push(`/(client)/orders/${invoice.booking_id}`)
              }
            >
              <ButtonText className="text-xs font-bold text-typography-700">
                Detail Pesanan
              </ButtonText>
            </Button>
            <Button
              size="sm"
              variant="outline"
              action="secondary"
              className="rounded-xl border-outline-200"
              onPress={() =>
                router.push({
                  pathname: "/(client)/invoices/[id]",
                  params: {
                    id: invoice.id,
                    from: "invoice-list",
                    bookingId: invoice.booking_id,
                  },
                })
              }
            >
              <ButtonText className="text-xs font-bold text-typography-700">
                Lihat Detail
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <VStack className="gap-1 bg-background-50 px-6 pb-4 pt-8">
        <HStack className="items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-xl border border-outline-100 bg-background-0 p-2"
          >
            <Ionicons name="chevron-back" size={20} color={theme.icon} />
          </TouchableOpacity>
          <VStack>
            <Text className="text-sm font-medium uppercase tracking-widest text-typography-500">
              Tagihan Saya
            </Text>
            <Heading className="text-2xl font-extrabold text-typography-900">
              Daftar Invoice
            </Heading>
          </VStack>
        </HStack>
      </VStack>

      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" />
        </Center>
      ) : invoices.length === 0 ? (
        <Center className="flex-1 px-6">
          <Box className="w-full rounded-3xl border border-outline-100 bg-background-0 p-8">
            <VStack className="items-center gap-3">
              <Ionicons name="receipt-outline" size={48} color={theme.icon} />
              <Heading className="text-center text-lg font-bold text-typography-900">
                Belum Ada Invoice
              </Heading>
              <Text className="text-center text-sm leading-relaxed text-typography-500">
                Invoice akan muncul di sini setelah admin menyetujui pesanan dan
                tagihan dibuat.
              </Text>
            </VStack>
          </Box>
        </Center>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-20 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="gap-6">
            <VStack className="gap-3">
              <Heading className="text-lg font-bold text-typography-900">
                Belum Dibayar
              </Heading>
              {unpaidInvoices.length > 0 ? (
                <VStack className="gap-3">
                  {unpaidInvoices.map((invoice) => renderInvoiceCard(invoice))}
                </VStack>
              ) : (
                <Box className="rounded-2xl border border-outline-100 bg-background-0 p-4">
                  <Text className="text-sm text-typography-500">
                    Tidak ada invoice yang menunggu pembayaran.
                  </Text>
                </Box>
              )}
            </VStack>

            <VStack className="gap-3">
              <Heading className="text-lg font-bold text-typography-900">
                Sudah Dibayar
              </Heading>
              {paidInvoices.length > 0 ? (
                <VStack className="gap-3">
                  {paidInvoices.map((invoice) =>
                    renderInvoiceCard(invoice, true),
                  )}
                </VStack>
              ) : (
                <Box className="rounded-2xl border border-outline-100 bg-background-0 p-4">
                  <Text className="text-sm text-typography-500">
                    Belum ada invoice yang sudah lunas.
                  </Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
