import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";

export default function PaymentWebViewScreen() {
  const { token, bookingId, invoiceId, paymentSessionId } =
    useLocalSearchParams<{
      token: string;
      bookingId: string;
      invoiceId: string;
      paymentSessionId?: string;
    }>();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const webViewRef = useRef<WebView>(null);
  const statusPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const webViewKey = `${paymentSessionId || invoiceId || "payment"}:${token || "token"}`;

  // URL Snap Midtrans (Sandbox)
  const snapUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`;

  useEffect(() => {
    return () => {
      if (statusPollingTimeoutRef.current) {
        clearTimeout(statusPollingTimeoutRef.current);
      }
    };
  }, []);

  /** Cek status pembayaran ke Midtrans. Hanya kembali jika sudah lunas. */
  const checkStatusAndReturn = async (forceReturn = false, attempt = 0) => {
    if (!invoiceId) {
      returnToOrderDetail();
      return;
    }

    setCheckingStatus(true);
    try {
      const data = await invokeEdgeFunction<{
        status?: string;
        message?: string;
      }>("midtrans-check-status", {
        invoice_id: invoiceId,
      });

      console.log("[PaymentWebView] Status check result", data);

      const status = data?.status;
      const isPaid = status === "settlement" || status === "capture";

      if (isPaid) {
        Alert.alert(
          "Pembayaran Berhasil",
          "Status pembayaran sudah lunas. Anda akan diarahkan ke detail pesanan.",
        );
        returnToOrderDetail();
        return;
      }

      if (forceReturn) {
        returnToOrderDetail();
        return;
      }

      if (status === "pending") {
        if (attempt < 5) {
          statusPollingTimeoutRef.current = setTimeout(() => {
            void checkStatusAndReturn(false, attempt + 1);
          }, 2500);
        } else {
          Alert.alert(
            "Pembayaran Sedang Diproses",
            "Pembayaran sudah tercatat, tetapi status invoice masih menunggu konfirmasi. Halaman detail pesanan akan mengecek ulang otomatis beberapa saat lagi.",
            [{ text: "Kembali ke Pesanan", onPress: returnToOrderDetail }],
          );
        }
        return;
      }

      const statusMessage =
        data?.message || "Pembayaran belum terkonfirmasi. Silakan cek lagi.";
      Alert.alert("Pembayaran Belum Lunas", statusMessage);
    } catch (err) {
      console.error("[PaymentWebView] Status check failed", err);

      if (forceReturn) {
        returnToOrderDetail();
        return;
      }

      Alert.alert(
        "Gagal Mengecek Status",
        "Tidak bisa mengecek status pembayaran saat ini. Coba lagi beberapa saat.",
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  const returnToOrderDetail = () => {
    if (statusPollingTimeoutRef.current) {
      clearTimeout(statusPollingTimeoutRef.current);
      statusPollingTimeoutRef.current = null;
    }

    if (!bookingId) {
      router.replace("/(client)/orders");
      return;
    }

    router.replace({
      pathname: "/(client)/orders/[id]",
      params: {
        id: bookingId,
        refreshedAt: Date.now().toString(),
      },
    });
  };

  const handleLeavePayment = () => {
    Alert.alert(
      "Keluar dari Pembayaran?",
      "Anda bisa kembali lagi dari detail pesanan untuk melanjutkan atau mengecek status pembayaran.",
      [
        { text: "Lanjut Bayar", style: "cancel" },
        {
          text: "Kembali ke Pesanan",
          onPress: () => void checkStatusAndReturn(true),
        },
      ],
    );
  };

  const handleBackPress = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
      return;
    }

    handleLeavePayment();
  };

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    if (
      navState.url.includes("finish") ||
      navState.url.includes("pending") ||
      navState.url.includes("status_code") ||
      navState.url.includes("transaction_status")
    ) {
      void checkStatusAndReturn();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.canvas,
          paddingTop: 32,
        }}
      >
        <HStack
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 60,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSubtle,
          }}
        >
          <TouchableOpacity
            onPress={handleBackPress}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: theme.canvasMuted,
            }}
          >
            <Ionicons
              name={canGoBack ? "arrow-back" : "close"}
              size={18}
              color={theme.icon}
            />
          </TouchableOpacity>

          <VStack style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "900",
                color: theme.textSoft,
                textTransform: "uppercase",
              }}
            >
              Checkout Midtrans
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: theme.textStrong,
              }}
            >
              Pembayaran Midtrans
            </Text>
          </VStack>

          <TouchableOpacity
            onPress={() => void checkStatusAndReturn()}
            disabled={checkingStatus}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: theme.accentSoft,
              opacity: checkingStatus ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: theme.accentStrong,
              }}
            >
              {checkingStatus ? "Mengecek..." : "Cek Status"}
            </Text>
          </TouchableOpacity>
        </HStack>

        <View
          style={{
            flex: 1,
            backgroundColor: theme.surface,
          }}
        >
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ uri: snapUrl }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            onNavigationStateChange={onNavigationStateChange}
            startInLoadingState={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("[PaymentWebView] WebView load error", nativeEvent);
              setWebViewError(
                nativeEvent.description || "Gagal memuat halaman pembayaran.",
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("[PaymentWebView] HTTP error", nativeEvent);
              setWebViewError(
                `HTTP ${nativeEvent.statusCode} saat memuat halaman pembayaran.`,
              );
            }}
            style={styles.webview}
            renderLoading={() => (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.surface,
                }}
              >
                <ActivityIndicator size="large" color={theme.accentStrong} />
                <Text
                  style={{
                    marginTop: 12,
                    fontWeight: "bold",
                    color: theme.textMuted,
                  }}
                >
                  Mempersiapkan Pembayaran Aman...
                </Text>
              </View>
            )}
          />

          {webViewError ? (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 24,
                backgroundColor: theme.surface,
              }}
            >
              <Box className="w-full rounded-3xl border border-outline-100 bg-background-0 p-6">
                <VStack style={{ gap: 10 }}>
                  <Text className="text-xs font-bold uppercase tracking-widest text-error-700">
                    Gagal Memuat Checkout
                  </Text>
                  <Text className="text-sm leading-relaxed text-typography-700">
                    {webViewError}
                  </Text>
                  <Text className="text-sm leading-relaxed text-typography-500">
                    Anda bisa kembali ke detail pesanan lalu coba lagi tanpa
                    kehilangan data transaksi.
                  </Text>
                  <HStack style={{ gap: 12, marginTop: 4 }}>
                    <Button
                      variant="outline"
                      action="secondary"
                      className="flex-1 rounded-2xl border-outline-200 bg-background-0"
                      onPress={() => {
                        setWebViewError(null);
                        webViewRef.current?.reload();
                      }}
                    >
                      <ButtonText className="font-bold text-typography-800">
                        Coba Lagi
                      </ButtonText>
                    </Button>
                    <Button
                      className="flex-1 rounded-2xl bg-typography-900"
                      onPress={() => void checkStatusAndReturn(true)}
                      disabled={checkingStatus}
                    >
                      <ButtonText className="font-bold text-typography-0">
                        Kembali
                      </ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            </View>
          ) : null}
        </View>

        <HStack
          style={{
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 16,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.borderSubtle,
          }}
        >
          <Button
            variant="outline"
            action="secondary"
            className="flex-1 rounded-2xl border-outline-200 bg-background-0"
            onPress={handleLeavePayment}
          >
            <ButtonText className="font-bold text-typography-800">
              Kembali Dulu
            </ButtonText>
          </Button>

          <Button
            className="flex-1 rounded-2xl bg-typography-900"
            onPress={() => void checkStatusAndReturn()}
            disabled={checkingStatus}
          >
            {checkingStatus ? (
              <ButtonSpinner color={theme.surface} />
            ) : (
              <ButtonText className="font-bold text-typography-0">
                Saya Sudah Selesai
              </ButtonText>
            )}
          </Button>
        </HStack>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
