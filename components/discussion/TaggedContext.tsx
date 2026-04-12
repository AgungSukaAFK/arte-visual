import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { appThemePalette } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Props = {
  bookingId?: string | null;
  invoiceId?: string | null;
  packageId?: string | null;
};

type TagData = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  targetPath: string | null;
};

export default function TaggedContext({
  bookingId,
  invoiceId,
  packageId,
}: Props) {
  const router = useRouter();
  const { role } = useAuth();
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const [items, setItems] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next: TagData[] = [];

        if (bookingId) {
          const { data } = await supabase
            .from("bookings")
            .select("event_date,status")
            .eq("id", bookingId)
            .maybeSingle();

          if (data) {
            next.push({
              label: "Booking",
              value: `${data.event_date || "-"} (${data.status || "-"})`,
              icon: "calendar-outline",
              targetPath:
                role === "admin"
                  ? `/(admin)/orders/${bookingId}`
                  : `/(client)/orders/${bookingId}`,
            });
          }
        }

        if (invoiceId) {
          const { data } = await supabase
            .from("invoices")
            .select("invoice_type,amount,booking_id")
            .eq("id", invoiceId)
            .maybeSingle();

          if (data) {
            next.push({
              label: "Invoice",
              value: `${data.invoice_type || "-"} • Rp ${Number(data.amount || 0).toLocaleString("id-ID")}`,
              icon: "receipt-outline",
              targetPath:
                role === "admin"
                  ? data.booking_id
                    ? `/(admin)/orders/${data.booking_id}`
                    : null
                  : `/(client)/invoices/${invoiceId}`,
            });
          }
        }

        if (packageId) {
          const { data } = await supabase
            .from("packages")
            .select("name,price")
            .eq("id", packageId)
            .maybeSingle();

          if (data) {
            next.push({
              label: "Paket",
              value: `${data.name || "-"} • Rp ${Number(data.price || 0).toLocaleString("id-ID")}`,
              icon: "grid-outline",
              targetPath:
                role === "admin" ? "/(admin)/packages" : "/(client)/packages",
            });
          }
        }

        if (!cancelled) {
          setItems(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [bookingId, invoiceId, packageId, role]);

  if (!bookingId && !invoiceId && !packageId) {
    return null;
  }

  if (loading) {
    return (
      <View style={{ marginTop: 8, alignItems: "flex-start" }}>
        <ActivityIndicator size="small" color={palette.icon} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {items.map((item) => (
        <Pressable
          key={`${item.label}:${item.value}`}
          onPress={
            item.targetPath
              ? () => router.push(item.targetPath as any)
              : undefined
          }
          disabled={!item.targetPath}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: palette.borderSubtle,
            backgroundColor: palette.accentSoft,
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          <Ionicons name={item.icon} size={14} color={palette.icon} />
          <Text
            style={{
              color: palette.textStrong,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {item.label}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: palette.textMuted, fontSize: 12, maxWidth: 180 }}
          >
            {item.value}
          </Text>
          {item.targetPath ? (
            <Ionicons
              name="chevron-forward"
              size={14}
              color={palette.icon}
              style={{ marginLeft: "auto" }}
            />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
