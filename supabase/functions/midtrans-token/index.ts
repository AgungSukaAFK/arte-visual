import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!
const MIDTRANS_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { booking_id, payment_type, dp_percentage } = await req.json()

    // 1. Ambil detail booking & paket
    const { data: booking, error: bError } = await supabase
      .from('bookings')
      .select('*, packages(name, price)')
      .eq('id', booking_id)
      .single()

    if (bError || !booking) throw new Error('Booking tidak ditemukan')

    // 2. Hitung nominal
    const total_price = booking.packages.price
    let amount = total_price
    
    if (payment_type === 'dp') {
      amount = (total_price * (dp_percentage || 50)) / 100
    } else if (payment_type === 'final') {
      // Ambil sisa pembayaran (Total - DP yang sudah sukses)
      const { data: paid } = await supabase
        .from('payments')
        .select('amount')
        .eq('booking_id', booking_id)
        .eq('status', 'settlement')
      
      const totalPaid = (paid || []).reduce((acc: number, p: any) => acc + p.amount, 0)
      amount = total_price - totalPaid
    }

    // 3. Buat order_id unik untuk Midtrans
    const midtrans_order_id = `AV-${booking_id.slice(0, 8)}-${payment_type}-${Date.now()}`

    // 4. Request Snap Token ke Midtrans
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`)
    const midtransBody = {
      transaction_details: {
        order_id: midtrans_order_id,
        gross_amount: Math.round(amount),
      },
      item_details: [{
        id: booking.package_id,
        price: Math.round(amount),
        quantity: 1,
        name: `Arte Visual: ${booking.packages.name} (${payment_type.toUpperCase()})`,
      }],
      customer_details: {
        first_name: "Klien",
        phone: booking.phone_number,
      }
    }

    const midtransResponse = await fetch(MIDTRANS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(midtransBody),
    })

    const midtransData = await midtransResponse.json()

    if (!midtransData.token) {
       throw new Error(`Midtrans Error: ${JSON.stringify(midtransData)}`)
    }

    // 5. Simpan ke tabel payments
    const { error: pError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        amount: Math.round(amount),
        payment_type,
        midtrans_order_id,
        snap_token: midtransData.token,
        status: 'pending'
      })

    if (pError) throw pError

    return new Response(JSON.stringify(midtransData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
