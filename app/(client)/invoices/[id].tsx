import React, { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, View, Share, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [id]);

  const fetchInvoiceDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, bookings(*, packages(*), profiles(*)), payments(*)")
      .eq("id", id)
      .single();

    if (data) setInvoice(data);
    setLoading(false);
  };

  const formatRupiah = (angka: any) => {
    if (!angka) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const generatePDF = async () => {
    setPrinting(true);
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
            .badge { background: #10B981; color: white; padding: 4px 10px; borderRadius: 4px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ARTE VISUAL</div>
            <div class="badge">PAID / LUNAS</div>
          </div>
          
          <h1 class="invoice-title">INVOICE</h1>
          
          <div class="details">
            <div class="col">
              <div class="label">Billed To</div>
              <div class="value">${invoice.bookings.profiles.full_name}</div>
              <div class="value">${invoice.bookings.phone_number}</div>
            </div>
            <div class="col" style="text-align: right;">
              <div class="label">Invoice Date</div>
              <div class="value">${new Date(invoice.created_at).toLocaleDateString('id-ID')}</div>
              <div class="label" style="margin-top: 15px;">Invoice Number</div>
              <div class="value">${invoice.invoice_number}</div>
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
                  <strong>${invoice.bookings.packages.name}</strong><br/>
                  <small style="color: #666">Tipe Pembayaran: ${invoice.payments.payment_type.toUpperCase()}</small>
                </td>
                <td>${invoice.bookings.event_date}</td>
                <td style="text-align: right;">${formatRupiah(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span class="label">Total Pembayaran</span>
              <span class="grand-total">${formatRupiah(invoice.amount)}</span>
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
        const { uri } = await Print.printToFileAsync({ html });
        console.log('File has been saved to:', uri);
        if (Platform.OS === "ios") {
            await Sharing.shareAsync(uri);
        } else {
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Simpan Invoice' });
        }
    } catch (error) {
        console.error(error);
    } finally {
        setPrinting(false);
    }
  };

  if (loading || !invoice) return <Center className="flex-1 bg-background-50"><Spinner size="large" /></Center>;

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack className="px-6 pt-6 gap-8">
           {/* Header */}
           <HStack className="items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white rounded-xl shadow-soft-1 border border-outline-100">
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
            <Heading className="text-xl font-black text-typography-900">Digital Invoice</Heading>
            <Box className="w-10" />
          </HStack>

          {/* Invoice UI Representation */}
          <Box className="bg-white rounded-[40px] p-8 shadow-hard-2 border border-outline-100 overflow-hidden">
            {/* Top Pattern */}
            <Box className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-bl-[100px]" />
            
            <VStack className="gap-10">
                {/* Logo & ID */}
                <HStack className="justify-between items-start">
                    <VStack>
                        <Text className="text-typography-900 font-black text-2xl">ARTE</Text>
                        <Text className="text-primary-600 font-black text-2xl -mt-2">VISUAL</Text>
                    </VStack>
                    <Box className="bg-success-500 px-3 py-1 rounded-lg">
                        <Text className="text-white text-[10px] font-black uppercase">Lunas / Paid</Text>
                    </Box>
                </HStack>

                {/* Main Details */}
                <HStack className="justify-between">
                    <VStack className="gap-1">
                        <Text className="text-typography-400 text-[10px] font-bold uppercase tracking-widest">Atas Nama</Text>
                        <Text className="text-typography-900 font-bold text-sm">{invoice.bookings.profiles.full_name}</Text>
                        <Text className="text-typography-500 text-xs">{invoice.bookings.phone_number}</Text>
                    </VStack>
                    <VStack className="gap-1 items-end">
                        <Text className="text-typography-400 text-[10px] font-bold uppercase tracking-widest">Nomor Invoice</Text>
                        <Text className="text-typography-900 font-bold text-sm">#{invoice.invoice_number.slice(-8).toUpperCase()}</Text>
                        <Text className="text-typography-500 text-xs">{new Date(invoice.created_at).toLocaleDateString()}</Text>
                    </VStack>
                </HStack>

                <Box className="h-[1px] bg-outline-100 border-dashed border-t" />

                {/* Item List */}
                <VStack className="gap-4">
                    <Text className="text-typography-900 font-bold text-xs uppercase tracking-widest">Detail Layanan</Text>
                    <HStack className="justify-between items-center">
                        <VStack className="flex-1 mr-4">
                            <Text className="text-typography-900 font-black text-base">{invoice.bookings.packages.name}</Text>
                            <Text className="text-typography-500 text-xs mt-1">Acara pada {invoice.bookings.event_date}</Text>
                        </VStack>
                        <Text className="text-typography-900 font-bold text-sm">{formatRupiah(invoice.amount)}</Text>
                    </HStack>
                </VStack>

                <Box className="bg-background-50 p-6 rounded-3xl border border-outline-50">
                    <HStack className="justify-between items-center">
                        <Text className="text-typography-500 font-bold text-sm">Total Dibayar</Text>
                        <Text className="text-primary-600 font-black text-2xl">{formatRupiah(invoice.amount)}</Text>
                    </HStack>
                </Box>

                <VStack className="items-center gap-2">
                    <Ionicons name="barcode-outline" size={32} color="#D1D5DB" />
                    <Text className="text-typography-400 text-[10px] font-bold text-center">Simpan invoice ini sebagai bukti sah pembayaran Anda.</Text>
                </VStack>
            </VStack>
          </Box>

          {/* Action Buttons */}
          <VStack className="gap-3">
              <Button size="xl" onPress={generatePDF} disabled={printing} className="rounded-2xl h-14 bg-typography-950">
                  <Ionicons name="download-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  {printing ? <ButtonSpinner color="white" /> : <ButtonText className="text-white font-bold">UNDUH PDF INVOICE</ButtonText>}
              </Button>
              <Button size="xl" variant="outline" onPress={() => router.back()} className="rounded-2xl border-outline-200">
                  <ButtonText className="text-typography-600 font-bold">KEMBALI</ButtonText>
              </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
