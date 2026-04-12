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
  Conversation,
  Message,
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

type ConversationWithMeta = Conversation & {
  clientName: string;
  unreadCount: number;
  lastMessagePreview: string;
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

function getMessagePreview(message?: Message | null) {
  if (!message) return "Belum ada pesan";
  if (message.content?.trim()) return message.content;
  if (message.attachment_url) return "Lampiran";
  return "Pesan";
}

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

export default function AdminDiscussionScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];
  const { profile, onlineUsers } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithMeta[]>(
    [],
  );
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

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

  const onlineSet = useMemo(
    () => new Set(onlineUsers.map((user) => user.user_id)),
    [onlineUsers],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((total, item) => total + item.unreadCount, 0),
    [conversations],
  );

  const loadConversations = useCallback(async () => {
    if (!profile?.id) return;

    const { data: convRows, error } = await supabase
      .from("conversations")
      .select("id,client_id,last_message_at")
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    const baseConversations = (convRows as Conversation[]) || [];

    const clientIds = Array.from(
      new Set(baseConversations.map((conv) => conv.client_id)),
    );

    let clientNameMap = new Map<string, string>();

    if (clientIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", clientIds);

      clientNameMap = new Map(
        (profileRows || []).map((row: any) => [
          row.id,
          row.full_name || "Klien",
        ]),
      );
    }

    const mapped = await Promise.all(
      baseConversations.map(async (conv) => {
        const [{ data: latestMessage }, { count }] = await Promise.all([
          supabase
            .from("messages")
            .select("id,content,attachment_url,created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", profile.id),
        ]);

        const preview = getMessagePreview(latestMessage as Message);

        return {
          ...conv,
          clientName: clientNameMap.get(conv.client_id) || "Klien",
          unreadCount: count || 0,
          lastMessagePreview: preview,
        };
      }),
    );

    setConversations(
      mapped.sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime(),
      ),
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

  const loadTagOptions = useCallback(async (clientId: string) => {
    const [
      { data: bookingData },
      { data: packageData },
      { data: invoiceData },
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,event_date,status")
        .eq("client_id", clientId)
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
        .eq("bookings.client_id", clientId)
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      try {
        await loadConversations();
      } catch {
        if (!cancelled) {
          Alert.alert(
            "Diskusi belum siap",
            "Gagal memuat daftar percakapan admin.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!profile?.id) return;

    const listTopic = `admin-conversation-list:${profile.id}`;
    removeRealtimeChannelsByTopic(listTopic);

    const listChannel = supabase
      .channel(listTopic)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          loadConversations();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
    };
  }, [loadConversations, profile?.id]);

  useEffect(() => {
    if (!selectedConversation || !profile?.id) return;

    loadMessages(selectedConversation.id);
    markConversationRead(selectedConversation.id);
    loadTagOptions(selectedConversation.client_id);

    const msgTopic = `admin-messages:${selectedConversation.id}`;
    removeRealtimeChannelsByTopic(msgTopic);

    const msgChannel = supabase
      .channel(msgTopic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
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

          if (inserted.sender_id !== profile.id) {
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
  }, [
    loadMessages,
    loadTagOptions,
    markConversationRead,
    profile?.id,
    selectedConversation?.client_id,
    selectedConversation?.id,
  ]);

  useEffect(() => {
    if (!selectedConversation) return;
    markConversationRead(selectedConversation.id);
  }, [markConversationRead, messages.length, selectedConversation]);

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
    if (!profile?.id || !selectedConversation?.id || isSending) return;

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
        conversation_id: selectedConversation.id,
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
      console.error("[AdminDiscussion] Send failed", error);
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

  if (!selectedConversation) {
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
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: palette.textStrong,
            }}
          >
            Diskusi Klien
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {totalUnread} pesan belum dibaca
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <OnlineBadge isOnline={onlineUsers.length > 0} showLabel />
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                {onlineUsers.length} online
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const isClientOnline = onlineSet.has(item.client_id);

            return (
              <Pressable
                onPress={() => setSelectedConversation(item)}
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
                    {item.clientName}
                  </Text>
                  <OnlineBadge isOnline={isClientOnline} showLabel={false} />
                </View>

                <Text
                  numberOfLines={1}
                  style={{ color: palette.textMuted, marginTop: 6 }}
                >
                  {item.lastMessagePreview}
                </Text>

                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: palette.textSoft, fontSize: 12 }}>
                    {new Date(item.last_message_at).toLocaleString("id-ID")}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: palette.danger,
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    );
  }

  const selectedTagSummary = [
    selectedTag.bookingId ? "Booking" : null,
    selectedTag.invoiceId ? "Invoice" : null,
    selectedTag.packageId ? "Paket" : null,
  ].filter(Boolean) as string[];

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
              onPress={() => setSelectedConversation(null)}
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
              numberOfLines={1}
            >
              {selectedConversation.clientName}
            </Text>
            <View style={{ width: 70 }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <OnlineBadge
              isOnline={onlineSet.has(selectedConversation.client_id)}
              showLabel
            />
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              Admin online:{" "}
              {onlineUsers.filter((u) => u.role === "admin").length}
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
