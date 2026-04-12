import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appThemePalette } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { uploadDiscussionAttachment } from "@/lib/discussion-attachments";
import { supabase } from "@/lib/supabase";
import MessageBubble from "@/components/discussion/MessageBubble";
import OnlineBadge from "@/components/discussion/OnlineBadge";
import type {
  AttachmentState,
  Message,
  OnlineUser,
  TagState,
} from "@/types/discussion";

function getErrorMessage(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const maybeError = error as {
      message?: string;
      error_description?: string;
      details?: string;
      code?: string;
    };
    return (
      maybeError.message ||
      maybeError.error_description ||
      maybeError.details ||
      maybeError.code ||
      "Unknown error"
    );
  }
  return "Unknown error";
}

const emptyTag: TagState = {
  bookingId: null,
  invoiceId: null,
  packageId: null,
};

type PickableBooking = {
  id: string;
  event_date: string;
  status: string;
};

type PickableInvoice = {
  id: string;
  invoice_type: string;
  amount: number;
};

type PickablePackage = {
  id: string;
  name: string;
  price: number;
};

type AdminProfile = {
  id: string;
  full_name: string | null;
  role?: string | null;
};

function removeRealtimeChannelsByTopic(topic: string) {
  supabase.getChannels().forEach((channel) => {
    const existingTopic = (channel as any)?.topic as string | undefined;
    if (!existingTopic) return;

    if (
      existingTopic === topic ||
      existingTopic === `realtime:${topic}` ||
      existingTopic.endsWith(`:${topic}`)
    ) {
      supabase.removeChannel(channel);
    }
  });
}

export default function ClientDiscussionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const { profile, onlineUsers } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);

  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminList, setAdminList] = useState<AdminProfile[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagState>(emptyTag);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(40);

  const [bookings, setBookings] = useState<PickableBooking[]>([]);
  const [invoices, setInvoices] = useState<PickableInvoice[]>([]);
  const [packages, setPackages] = useState<PickablePackage[]>([]);

  const onlineAdmins = useMemo(
    () => onlineUsers.filter((user) => user.role === "admin"),
    [onlineUsers],
  );

  const onlineAdminSet = useMemo(
    () => new Set(onlineAdmins.map((admin) => admin.user_id)),
    [onlineAdmins],
  );

  const selectedAdmin = useMemo(
    () => adminList.find((admin) => admin.id === selectedAdminId) || null,
    [adminList, selectedAdminId],
  );

  const loadTagOptions = useCallback(async () => {
    if (!profile?.id) return;

    const [
      { data: bookingData },
      { data: packageData },
      { data: invoiceData },
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,event_date,status")
        .eq("client_id", profile.id)
        .order("event_date", { ascending: false })
        .limit(20),
      supabase
        .from("packages")
        .select("id,name,price")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("invoices")
        .select("id,invoice_type,amount,bookings!inner(client_id)")
        .eq("bookings.client_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setBookings((bookingData as PickableBooking[]) || []);
    setPackages((packageData as PickablePackage[]) || []);
    setInvoices(
      ((invoiceData as unknown[]) || []).map((item: any) => ({
        id: item.id,
        invoice_type: item.invoice_type,
        amount: item.amount,
      })),
    );
  }, [profile?.id]);

  const markConversationRead = useCallback(
    async (convId: string) => {
      if (!profile?.id) return;

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .neq("sender_id", profile.id)
        .eq("is_read", false);
    },
    [profile?.id],
  );

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(full_name)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);
  }, []);

  const loadAdminDirectory = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,role")
      .eq("role", "admin")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Gagal memuat daftar admin:", error.message);
      setAdminList([]);
      return;
    }

    const rows = ((data as AdminProfile[]) || []).filter(
      (row) => row.role === "admin",
    );
    setAdminList(rows);

    if (rows.length > 0 && !selectedAdminId) {
      setSelectedAdminId(rows[0].id);
    }
  }, [selectedAdminId]);

  const setupConversation = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", profile.id)
        .maybeSingle();

      let convId = existing?.id || null;

      if (!convId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ client_id: profile.id })
          .select("id")
          .single();

        if (error) throw error;
        convId = created.id;
      }

      setConversationId(convId);
      await Promise.all([
        loadMessages(convId),
        markConversationRead(convId),
        loadTagOptions(),
        loadAdminDirectory(),
      ]);
    } catch (error) {
      Alert.alert("Diskusi belum siap", "Gagal memuat percakapan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [
    loadAdminDirectory,
    loadMessages,
    loadTagOptions,
    markConversationRead,
    profile?.id,
  ]);

  useEffect(() => {
    setupConversation();
  }, [setupConversation]);

  useEffect(() => {
    if (!conversationId || !profile?.id) return;

    const topic = `client-messages:${conversationId}`;
    removeRealtimeChannelsByTopic(topic);

    const msgChannel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const inserted = payload.new as Message;

          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", inserted.sender_id)
            .maybeSingle();

          const next = {
            ...inserted,
            sender: sender ? { full_name: sender.full_name } : null,
          };

          setMessages((prev) => [...prev, next]);

          if (inserted.sender_id !== profile.id && isChatOpen) {
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", inserted.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [conversationId, isChatOpen, profile?.id]);

  useEffect(() => {
    if (!conversationId || !isChatOpen) return;
    markConversationRead(conversationId);
  }, [conversationId, isChatOpen, markConversationRead, messages.length]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setAndroidKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const selectedTagSummary = useMemo(() => {
    const tags: string[] = [];
    if (selectedTag.bookingId) tags.push("Booking");
    if (selectedTag.invoiceId) tags.push("Invoice");
    if (selectedTag.packageId) tags.push("Paket");
    return tags;
  }, [selectedTag.bookingId, selectedTag.invoiceId, selectedTag.packageId]);

  const latestMessagePreview = useMemo(() => {
    const latest = messages[messages.length - 1];
    if (!latest) return "Belum ada pesan";
    if (latest.content?.trim()) return latest.content;
    if (latest.attachment_url) return "Lampiran";
    return "Pesan";
  }, [messages]);

  const handlePickImage = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Fitur belum tersedia",
        "Pilih gambar di web belum didukung pada saat ini.",
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin ditolak", "Berikan izin galeri terlebih dahulu.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        type: "image",
        mimeType: asset.mimeType || "image/jpeg",
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      });
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        type: "file",
        mimeType: asset.mimeType || "application/octet-stream",
        name: asset.name,
      });
    }
  };

  const handleSend = async () => {
    if (!profile?.id || !conversationId || isSending) return;
    const normalized = inputText.trim();

    if (
      !normalized &&
      !attachment &&
      !selectedTag.bookingId &&
      !selectedTag.invoiceId &&
      !selectedTag.packageId
    ) {
      return;
    }

    setIsSending(true);

    try {
      let attachmentUrl: string | null = null;
      let attachmentType: "image" | "file" | null = null;
      let attachmentName: string | null = null;

      if (attachment) {
        const uploaded = await uploadDiscussionAttachment(
          profile.id,
          attachment,
        );
        attachmentUrl = uploaded.publicUrl;
        attachmentType = attachment.type;
        attachmentName = attachment.name;
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: normalized || null,
        booking_id: selectedTag.bookingId,
        invoice_id: selectedTag.invoiceId,
        package_id: selectedTag.packageId,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
      });

      if (error) throw error;

      setInputText("");
      setInputHeight(40);
      setSelectedTag(emptyTag);
      setAttachment(null);
    } catch (error) {
      console.error("[ClientDiscussion] Send failed", error);
      Alert.alert(
        "Gagal mengirim",
        `Pesan belum terkirim. ${getErrorMessage(error)}`,
      );
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.canvas,
        }}
      >
        <ActivityIndicator size="large" color={palette.accent} />
      </SafeAreaView>
    );
  }

  if (!isChatOpen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: palette.borderSubtle,
            backgroundColor: palette.surface,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="chevron-back" size={20} color={palette.icon} />
              <Text style={{ color: palette.textMuted, fontWeight: "600" }}>
                Kembali
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: palette.textStrong,
            }}
          >
            Pilih Admin Untuk Diskusi
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Lihat admin yang online dulu, lalu mulai chat.
          </Text>
        </View>

        <FlatList
          data={adminList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const isOnline = onlineAdminSet.has(item.id);
            return (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.borderSubtle,
                  backgroundColor: palette.surface,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontWeight: "700", color: palette.textStrong }}
                  >
                    {item.full_name || "Admin"}
                  </Text>
                  <OnlineBadge isOnline={isOnline} showLabel />
                </View>

                <Text
                  numberOfLines={1}
                  style={{ color: palette.textMuted, marginTop: 6 }}
                >
                  {latestMessagePreview}
                </Text>

                <Pressable
                  onPress={() => {
                    setSelectedAdminId(item.id);
                    setIsChatOpen(true);
                  }}
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    backgroundColor: palette.accent,
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{ color: palette.accentContrast, fontWeight: "700" }}
                  >
                    Mulai Chat
                  </Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.borderSubtle,
              }}
            >
              <Text style={{ color: palette.textStrong, fontWeight: "600" }}>
                Belum ada admin terdaftar.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: palette.borderSubtle,
            backgroundColor: palette.surface,
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => setIsChatOpen(false)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="chevron-back" size={20} color={palette.icon} />
              <Text style={{ color: palette.textMuted, fontWeight: "600" }}>
                Kembali
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: palette.textStrong,
              }}
            >
              {selectedAdmin?.full_name || "Admin"}
            </Text>
            <View style={{ width: 70 }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <OnlineBadge isOnline={onlineAdmins.length > 0} showLabel />
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {onlineAdmins.length} admin online
            </Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwnMessage={item.sender_id === profile?.id}
            />
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {attachment ? (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.borderSubtle,
              backgroundColor: palette.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              numberOfLines={1}
              style={{ color: palette.textStrong, maxWidth: "82%" }}
            >
              Lampiran: {attachment.name}
            </Text>
            <Pressable onPress={() => setAttachment(null)}>
              <Ionicons name="close-circle" size={20} color={palette.danger} />
            </Pressable>
          </View>
        ) : null}

        {selectedTagSummary.length > 0 ? (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 8,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {selectedTagSummary.map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: palette.accentSoft,
                  borderWidth: 1,
                  borderColor: palette.borderSubtle,
                }}
              >
                <Text
                  style={{
                    color: palette.textStrong,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            marginBottom:
              Platform.OS === "android"
                ? Math.max(androidKeyboardHeight - insets.bottom - 8, 0)
                : 0,
            borderTopWidth: 1,
            borderTopColor: palette.borderSubtle,
            backgroundColor: palette.surface,
          }}
        >
          <Pressable onPress={handlePickImage}>
            <Ionicons name="image-outline" size={22} color={palette.icon} />
          </Pressable>
          <Pressable onPress={handlePickFile}>
            <Ionicons name="attach-outline" size={22} color={palette.icon} />
          </Pressable>
          <Pressable onPress={() => setTagModalVisible(true)}>
            <Ionicons name="pricetag-outline" size={22} color={palette.icon} />
          </Pressable>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onContentSizeChange={(event) => {
              const nextHeight = Math.min(
                Math.max(40, event.nativeEvent.contentSize.height),
                120,
              );
              setInputHeight(nextHeight);
            }}
            placeholder="Tulis pesan..."
            placeholderTextColor={palette.textSoft}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: palette.borderSubtle,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              height: inputHeight,
              maxHeight: 120,
              textAlignVertical: "top",
              color: palette.textStrong,
              backgroundColor: palette.surfaceMuted,
            }}
            multiline
            scrollEnabled={inputHeight >= 120}
          />

          <Pressable
            onPress={handleSend}
            disabled={isSending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.accent,
              opacity: isSending ? 0.6 : 1,
            }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={palette.accentContrast} />
            ) : (
              <Ionicons name="send" size={18} color={palette.accentContrast} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={tagModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "78%",
              backgroundColor: palette.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 14,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: palette.textStrong,
                }}
              >
                Tag konteks pesan
              </Text>
              <Pressable onPress={() => setTagModalVisible(false)}>
                <Ionicons name="close" size={22} color={palette.icon} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={{ color: palette.textMuted, marginBottom: 8 }}>
                Booking
              </Text>
              {bookings.map((booking) => {
                const active = selectedTag.bookingId === booking.id;
                return (
                  <Pressable
                    key={booking.id}
                    onPress={() =>
                      setSelectedTag((prev) => ({
                        ...prev,
                        bookingId: active ? null : booking.id,
                      }))
                    }
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active
                        ? palette.accent
                        : palette.borderSubtle,
                      backgroundColor: active
                        ? palette.accentSoft
                        : palette.surfaceMuted,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{ color: palette.textStrong, fontWeight: "600" }}
                    >
                      {booking.event_date}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      {booking.status}
                    </Text>
                  </Pressable>
                );
              })}

              <Text
                style={{
                  color: palette.textMuted,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                Invoice
              </Text>
              {invoices.map((invoice) => {
                const active = selectedTag.invoiceId === invoice.id;
                return (
                  <Pressable
                    key={invoice.id}
                    onPress={() =>
                      setSelectedTag((prev) => ({
                        ...prev,
                        invoiceId: active ? null : invoice.id,
                      }))
                    }
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active
                        ? palette.accent
                        : palette.borderSubtle,
                      backgroundColor: active
                        ? palette.accentSoft
                        : palette.surfaceMuted,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{ color: palette.textStrong, fontWeight: "600" }}
                    >
                      {invoice.invoice_type}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      Rp {Number(invoice.amount || 0).toLocaleString("id-ID")}
                    </Text>
                  </Pressable>
                );
              })}

              <Text
                style={{
                  color: palette.textMuted,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                Paket
              </Text>
              {packages.map((pkg) => {
                const active = selectedTag.packageId === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() =>
                      setSelectedTag((prev) => ({
                        ...prev,
                        packageId: active ? null : pkg.id,
                      }))
                    }
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active
                        ? palette.accent
                        : palette.borderSubtle,
                      backgroundColor: active
                        ? palette.accentSoft
                        : palette.surfaceMuted,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{ color: palette.textStrong, fontWeight: "600" }}
                    >
                      {pkg.name}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      Rp {Number(pkg.price || 0).toLocaleString("id-ID")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setTagModalVisible(false)}
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.accent,
                borderRadius: 12,
                paddingVertical: 11,
              }}
            >
              <Text
                style={{ color: palette.accentContrast, fontWeight: "700" }}
              >
                Selesai
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
