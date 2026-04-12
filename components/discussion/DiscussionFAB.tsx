import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "nativewind";
import { appThemePalette } from "@/constants/theme";

export default function DiscussionFAB() {
  const { role, profile } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const [unreadCount, setUnreadCount] = useState(0);

  const isDiscussionRoute = useMemo(
    () => segments.some((segment) => String(segment).includes("discussion")),
    [segments],
  );

  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCount = async () => {
      if (role === "client") {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_id", profile.id)
          .maybeSingle();

        if (!conv?.id) {
          setUnreadCount(0);
          return;
        }

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", profile.id);

        setUnreadCount(count ?? 0);
        return;
      }

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", profile.id);

      setUnreadCount(count ?? 0);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel(`discussion-fab:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          fetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, role]);

  if (!profile || !role || isDiscussionRoute) {
    return null;
  }

  const goToDiscussion = () => {
    if (role === "admin") {
      router.push("/(admin)/discussion");
      return;
    }

    router.push("/(client)/discussion");
  };

  return (
    <Pressable
      onPress={goToDiscussion}
      style={[
        styles.fab,
        {
          backgroundColor: palette.accent,
          shadowColor: palette.shadow,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Buka panel diskusi"
    >
      <Ionicons
        name="chatbubbles-outline"
        size={24}
        color={palette.accentContrast}
      />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: palette.danger }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 92 : 82,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
    zIndex: 1000,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
