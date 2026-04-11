import React from "react";
import { View, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useColorScheme } from "nativewind";

export default function PaymentWebViewScreen() {
  const { token, bookingId } = useLocalSearchParams<{ token: string, bookingId: string }>();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#FFFFFF" : "#181718";

  // URL Snap Midtrans (Sandbox)
  const snapUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`;

  // Handle navigation events if needed (optional for basic Snap)
  const onNavigationStateChange = (navState: any) => {
    // Check for Midtrans specific return URLs if you want to auto-close
    // e.g. snap-callback, finish, error
    if (navState.url.includes("finish") || navState.url.includes("error") || navState.url.includes("close")) {
        // Since we refresh data on focus in details, we can just go back
        // Or redirect to success page
        router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Mini Header to allow user to Close */}
      <View style={{
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6"
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="close" size={24} color={iconColor} />
        </TouchableOpacity>
        <VStack style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: "900", color: "#6B7280", textTransform: "uppercase" }}>Gateway Pembayaran</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>Midtrans Secure Checkout</Text>
        </VStack>
      </View>

      <WebView
        source={{ uri: snapUrl }}
        onNavigationStateChange={onNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={{ marginTop: 12, fontWeight: "bold", color: "#6B7280" }}>Mempersiapkan Pembayaran Aman...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
