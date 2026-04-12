import { supabase } from "@/lib/supabase";

export async function invokeEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Konfigurasi Supabase belum lengkap di aplikasi");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
        },
        body: JSON.stringify(body ?? {}),
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload?.error ||
        payload?.message ||
        `Gagal memanggil fungsi ${functionName}`;
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/network request failed|failed to fetch/i.test(message)) {
      throw new Error(
        "Tidak bisa terhubung ke Supabase lokal. Pastikan EXPO_PUBLIC_SUPABASE_URL bisa diakses dari perangkat ini.",
      );
    }

    throw new Error(message);
  }
}
