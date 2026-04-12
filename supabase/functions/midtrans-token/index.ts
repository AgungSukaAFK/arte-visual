import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const MIDTRANS_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const truncateMidtransItemName = (value: string) => value.slice(0, 50);

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    if (!MIDTRANS_SERVER_KEY) {
      console.error(
        "[midtrans-token] MIDTRANS_SERVER_KEY is missing in edge runtime",
      );
      throw new Error(
        "MIDTRANS_SERVER_KEY belum dikonfigurasi di Supabase Edge Runtime",
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id wajib diisi");

    // 1. Ambil detail invoice beserta booking & paket
    const { data: invoice, error: iError } = await supabase
      .from("invoices")
      .select("*, bookings(*, packages(name, price))")
      .eq("id", invoice_id)
      .single();

    if (iError || !invoice) throw new Error("Invoice tidak ditemukan");
    if (invoice.status === "paid") throw new Error("Invoice ini sudah dibayar");

    const booking = invoice.bookings;
    const amount = Math.round(Number(invoice.amount));
    const packageName = booking?.packages?.name?.trim() || "Paket Dokumentasi";

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Nominal invoice tidak valid");
    }

    const { data: existingPayment, error: existingPaymentError } =
      await supabase
        .from("payments")
        .select("id, snap_token, midtrans_order_id, status")
        .eq("invoice_id", invoice_id)
        .in("status", ["pending", "capture", "settlement"])
        .not("snap_token", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingPaymentError) {
      throw existingPaymentError;
    }

    if (existingPayment?.snap_token && existingPayment.status === "pending") {
      console.log("[midtrans-token] Reusing pending token", {
        invoice_id,
        payment_id: existingPayment.id,
        midtrans_order_id: existingPayment.midtrans_order_id,
      });

      return new Response(
        JSON.stringify({ token: existingPayment.snap_token }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Tentukan payment_type berdasarkan invoice_type
    const payment_type = invoice.invoice_type === "dp" ? "dp" : "full";

    // 3. Buat order_id unik untuk Midtrans
    const midtrans_order_id = `AV-${invoice.id.slice(0, 8)}-${invoice.invoice_type}-${Date.now()}`;

    // 4. Request Snap Token ke Midtrans
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const itemLabel =
      invoice.invoice_type === "dp"
        ? `DP ${invoice.dp_percentage ?? 50}%`
        : invoice.invoice_type === "lembur"
          ? `Lembur ${invoice.overtime_hours ?? 0} jam`
          : "Pelunasan";
    const itemName = truncateMidtransItemName(
      `Arte Visual: ${packageName} (${itemLabel})`,
    );
    const midtransBody = {
      transaction_details: {
        order_id: midtrans_order_id,
        gross_amount: amount,
      },
      item_details: [
        {
          id: invoice.id,
          price: amount,
          quantity: 1,
          name: itemName,
        },
      ],
      customer_details: {
        first_name: "Klien",
        phone: booking.phone_number ?? "",
      },
    };

    const midtransResponse = await fetch(MIDTRANS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(midtransBody),
    });

    const midtransData = await midtransResponse.json();

    if (!midtransResponse.ok) {
      console.error("[midtrans-token] Midtrans request failed", {
        status: midtransResponse.status,
        statusText: midtransResponse.statusText,
        response: midtransData,
      });
    }

    if (!midtransData.token) {
      throw new Error(`Midtrans Error: ${JSON.stringify(midtransData)}`);
    }

    // 5. Simpan ke tabel payments (terhubung ke invoice)
    const { error: pError } = await supabase.from("payments").insert({
      booking_id: invoice.booking_id,
      invoice_id,
      amount,
      payment_type,
      midtrans_order_id,
      snap_token: midtransData.token,
      status: "pending",
    });

    if (pError) throw pError;

    console.log("[midtrans-token] Token created", {
      invoice_id,
      invoice_type: invoice.invoice_type,
      amount,
      midtrans_order_id,
    });

    return new Response(JSON.stringify({ token: midtransData.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[midtrans-token] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
