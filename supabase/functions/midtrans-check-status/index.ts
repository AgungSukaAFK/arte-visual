import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const MIDTRANS_API_URL = "https://api.sandbox.midtrans.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    if (!MIDTRANS_SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id wajib diisi");

    // 1. Ambil semua payment record yang terhubung ke invoice ini
    const { data: payments, error: pError } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("created_at", { ascending: false });

    if (pError || !payments || payments.length === 0) {
      return new Response(
        JSON.stringify({
          status: "no_payment",
          message: "Belum ada pembayaran untuk invoice ini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Jika sudah ada payment settlement/capture di DB, langsung konsistenkan invoice+booking
    const settledInDb = payments.find(
      (item) => item.status === "settlement" || item.status === "capture",
    );

    const settleInvoiceAndBooking = async (payment: any) => {
      await supabase
        .from("invoices")
        .update({ status: "paid", payment_id: payment.id })
        .eq("id", invoice_id);

      const booking_id = payment.booking_id;
      const newBookingStatus =
        payment.payment_type === "dp" ? "dp_paid" : "fully_paid";

      await supabase
        .from("bookings")
        .update({ status: newBookingStatus })
        .eq("id", booking_id);

      return { booking_id, newBookingStatus };
    };

    if (settledInDb) {
      const { booking_id, newBookingStatus } =
        await settleInvoiceAndBooking(settledInDb);

      return new Response(
        JSON.stringify({
          status: "settlement",
          message: "Pembayaran sudah tercatat lunas",
          invoice_id,
          booking_id,
          booking_status: newBookingStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Cek semua order_id di Midtrans sampai ketemu transaksi lunas
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`);
    let latestStatus = payments[0]?.status || "unknown";
    let settledPayment: any = null;

    for (const payment of payments) {
      if (!payment.midtrans_order_id) continue;

      const midtransResponse = await fetch(
        `${MIDTRANS_API_URL}/${payment.midtrans_order_id}/status`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${authString}`,
          },
        },
      );

      const midtransData = await midtransResponse.json();
      const txStatus = midtransData.transaction_status;

      console.log("[midtrans-check-status] Midtrans response", {
        invoice_id,
        payment_id: payment.id,
        midtrans_order_id: payment.midtrans_order_id,
        transaction_status: txStatus,
        status_code: midtransData.status_code,
      });

      if (txStatus && txStatus !== payment.status) {
        await supabase
          .from("payments")
          .update({ status: txStatus })
          .eq("id", payment.id);
      }

      if (payment.id === payments[0]?.id && txStatus) {
        latestStatus = txStatus;
      }

      if (txStatus === "settlement" || txStatus === "capture") {
        settledPayment = payment;
        break;
      }
    }

    if (settledPayment) {
      const { booking_id, newBookingStatus } =
        await settleInvoiceAndBooking(settledPayment);

      console.log("[midtrans-check-status] Settlement processed", {
        invoice_id,
        booking_id,
        payment_id: settledPayment.id,
        new_booking_status: newBookingStatus,
      });

      return new Response(
        JSON.stringify({
          status: "settlement",
          message: "Pembayaran berhasil dikonfirmasi",
          invoice_id,
          booking_id,
          booking_status: newBookingStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Return status lainnya (pending, expire, dll)
    return new Response(
      JSON.stringify({
        status: latestStatus,
        message:
          latestStatus === "pending"
            ? "Pembayaran masih diproses"
            : latestStatus === "expire"
              ? "Pembayaran kedaluwarsa"
              : latestStatus === "cancel" || latestStatus === "deny"
                ? "Pembayaran dibatalkan"
                : `Status: ${latestStatus || "tidak diketahui"}`,
        invoice_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[midtrans-check-status] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
