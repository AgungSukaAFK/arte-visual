import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json();
    const { order_id, transaction_status, gross_amount, transaction_id } =
      payload;

    // 1. Update status pembayaran di tabel payments
    const { data: payment, error: pError } = await supabase
      .from("payments")
      .update({ status: transaction_status })
      .eq("midtrans_order_id", order_id)
      .select()
      .single();

    if (pError || !payment) throw new Error("Payment record not found");

    // 2. Jika sukses (settlement/capture), update invoice & booking status
    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      const booking_id = payment.booking_id;

      // Tentukan status booking baru berdasarkan tipe pembayaran
      let newBookingStatus = "dp_paid";
      if (payment.payment_type !== "dp") {
        newBookingStatus = "fully_paid";
      }

      await supabase
        .from("bookings")
        .update({ status: newBookingStatus })
        .eq("id", booking_id);

      // Update invoice terkait ke status 'paid' dan link ke payment
      if (payment.invoice_id) {
        await supabase
          .from("invoices")
          .update({ status: "paid", payment_id: payment.id })
          .eq("id", payment.invoice_id);
      }

      console.log("[midtrans-webhook] Settlement processed", {
        order_id,
        booking_id,
        invoice_id: payment.invoice_id,
        new_booking_status: newBookingStatus,
      });
    }

    return new Response(JSON.stringify({ message: "Webhook processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
