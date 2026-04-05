import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Gluestack UI Components
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

export default function AdminUsersScreen() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
    }, []),
  );

  const fetchUsers = async () => {
    setLoading(true);
    // Ambil semua profil KECUALI admin
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (data) setUsersList(data);
    setLoading(false);
  };

  const showToast = (
    title: string,
    desc: string,
    type: "success" | "error",
  ) => {
    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast
          nativeID={id}
          action={type}
          variant="solid"
          className="mt-4 px-4 py-3"
        >
          <VStack className="gap-1">
            <ToastTitle className="font-bold text-typography-0">
              {title}
            </ToastTitle>
            <ToastDescription className="text-typography-0">
              {desc}
            </ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  };

  // --- HANDLER: BLOKIR / AKTIFKAN USER ---
  const handleToggleAccess = async (userItem: any) => {
    const isCurrentlyBanned = userItem.role === "banned";
    const actionText = isCurrentlyBanned ? "memulihkan akses" : "memblokir";
    const newRole = isCurrentlyBanned ? "client" : "banned";

    Alert.alert(
      "Konfirmasi Tindakan",
      `Apakah Anda yakin ingin ${actionText} akun ${userItem.full_name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Lanjutkan",
          style: isCurrentlyBanned ? "default" : "destructive",
          onPress: async () => {
            setProcessingId(userItem.id);
            const { error } = await supabase
              .from("profiles")
              .update({ role: newRole })
              .eq("id", userItem.id);

            setProcessingId(null);

            if (error) {
              showToast("Gagal Memperbarui", error.message, "error");
            } else {
              showToast("Berhasil", `Akses klien telah diperbarui.`, "success");
              fetchUsers(); // Refresh daftar
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      {/* Header Sticky */}
      <VStack className="px-6 pt-8 pb-4 bg-background-50 z-10 gap-1">
        <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
          Database Pelanggan
        </Text>
        <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
          Manajemen Klien.
        </Heading>
      </VStack>

      {loading ? (
        <Center className="flex-1">
          <Spinner size="large" className="text-typography-900" />
        </Center>
      ) : (
        <ScrollView
          contentContainerClassName="flex-grow pb-12 px-6"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="gap-4 mt-2">
            <HStack className="items-center justify-between mb-2">
              <Text className="text-typography-500 font-bold text-sm">
                Total Klien Terdaftar
              </Text>
              <Box className="bg-typography-900 px-3 py-1 rounded-full">
                <Text className="text-typography-0 font-bold text-xs">
                  {usersList.length}
                </Text>
              </Box>
            </HStack>

            {usersList.length === 0 ? (
              <Box className="bg-background-0 border border-outline-100 rounded-2xl p-6 items-center justify-center border-dashed mt-4">
                <Ionicons
                  name="people-outline"
                  size={32}
                  color="#A3A3A3"
                  className="mb-2"
                />
                <Text className="text-typography-500 text-center text-sm">
                  Belum ada klien yang mendaftar.
                </Text>
              </Box>
            ) : (
              usersList.map((client) => {
                const isBanned = client.role === "banned";
                const isProcessing = processingId === client.id;

                return (
                  <Box
                    key={client.id}
                    className={`bg-background-0 p-5 rounded-3xl border shadow-soft-1 relative overflow-hidden ${
                      isBanned
                        ? "border-error-200 bg-error-50/30 opacity-70"
                        : "border-outline-100"
                    }`}
                  >
                    <HStack className="gap-4 items-center">
                      {/* Avatar */}
                      <Avatar
                        size="lg"
                        className={isBanned ? "bg-error-300" : "bg-primary-500"}
                      >
                        <AvatarFallbackText className="text-typography-0">
                          {client.full_name || "Klien"}
                        </AvatarFallbackText>
                      </Avatar>

                      {/* Detail Klien */}
                      <VStack className="flex-1 gap-1">
                        <HStack className="items-center gap-2">
                          <Heading
                            className="text-typography-900 font-extrabold text-base"
                            numberOfLines={1}
                          >
                            {client.full_name || "Klien Tidak Dikenal"}
                          </Heading>
                          {isBanned && (
                            <Box className="bg-error-500 px-1.5 py-0.5 rounded">
                              <Text className="text-typography-0 text-[8px] font-bold uppercase tracking-widest">
                                Banned
                              </Text>
                            </Box>
                          )}
                        </HStack>

                        <HStack className="items-center gap-1.5 mt-0.5">
                          <Ionicons
                            name="call-outline"
                            size={14}
                            color="#737373"
                          />
                          <Text className="text-typography-500 text-sm">
                            {client.phone_number || "Belum ada nomor HP"}
                          </Text>
                        </HStack>

                        <Text className="text-typography-400 text-xs mt-1">
                          Bergabung:{" "}
                          {new Date(client.created_at).toLocaleDateString(
                            "id-ID",
                            { month: "long", year: "numeric" },
                          )}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Divider */}
                    <Box className="h-[1px] bg-outline-100 w-full my-4" />

                    {/* Aksi */}
                    <Button
                      size="md"
                      variant={isBanned ? "solid" : "outline"}
                      action={isBanned ? "positive" : "negative"}
                      className={`w-full rounded-xl ${isBanned ? "bg-typography-900" : "border-error-200"}`}
                      onPress={() => handleToggleAccess(client)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ButtonSpinner color={isBanned ? "#FFF" : "#ef4444"} />
                      ) : (
                        <HStack className="items-center gap-2">
                          <Ionicons
                            name={
                              isBanned
                                ? "shield-checkmark-outline"
                                : "ban-outline"
                            }
                            size={18}
                            color={isBanned ? "#FFF" : "#ef4444"}
                          />
                          <ButtonText
                            className={`font-bold ${isBanned ? "text-typography-0" : "text-error-600"}`}
                          >
                            {isBanned
                              ? "Pulihkan Akses Akun"
                              : "Blokir Akses Klien"}
                          </ButtonText>
                        </HStack>
                      )}
                    </Button>
                  </Box>
                );
              })
            )}
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
