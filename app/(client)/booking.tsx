import React, { useState, useEffect, useRef } from "react";
import {
  Platform,
  View,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Keyboard,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

// Gluestack UI Components (Simplified)
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Box } from "@/components/ui/box";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import {
  CheckIcon,
  TrashIcon,
  MapPinIcon,
  ClockIcon,
  ChevronLeftIcon,
  InstagramIcon,
  PhoneIcon,
} from "@/components/ui/icon";
import { Badge, BadgeText, BadgeIcon } from "@/components/ui/badge";

import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { getAppTheme } from "../../constants/theme";

export default function BookingScreen() {
  const { date, packageId } = useLocalSearchParams<{
    date: string;
    packageId: string;
  }>();
  const { user, profile } = useAuth();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);
  const isDark = theme.mode === "dark";
  const TOAST_ID = "booking-action-toast";

  const textColorDark = theme.textStrong;
  const textColorGray = theme.textMuted;
  const bgLight = theme.canvasMuted;
  const bgLighter = theme.surfaceMuted;
  const borderColor = theme.borderSubtle;
  const bgWhite = theme.surface;
  const bgWhiteAlt = theme.surface;

  const [pkg, setPkg] = useState<any>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  // Form State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [instagramAccounts, setInstagramAccounts] = useState<string[]>([]);
  const [currentIg, setCurrentIg] = useState("");

  // Time State
  const [startTime, setStartTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Location State
  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<any>(null);
  const [mapAddress, setMapAddress] = useState(""); // Autofilled from Maps
  const [location, setLocation] = useState(""); // Manual details from client
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.2,
    longitude: 106.816666,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (packageId) {
      fetchPackageDetails();
    } else {
      setLoadingInit(false);
    }
  }, [packageId]);

  const fetchPackageDetails = async () => {
    try {
      setLoadingInit(true);
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageId)
        .single();

      if (data) setPkg(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInit(false);
    }
  };

  // Safe manual rupiah formatter
  const formatRupiah = (angka: any) => {
    if (angka === null || angka === undefined) return "Rp 0";
    const val = parseInt(angka);
    if (isNaN(val)) return "Rp 0";
    return "Rp " + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const showToast = (
    title: string,
    description: string,
    action: "success" | "error",
  ) => {
    if (!toast.isActive(TOAST_ID)) {
      toast.show({
        id: TOAST_ID,
        placement: "top",
        render: ({ id }) => (
          <Toast
            nativeID={id}
            action={action}
            variant="solid"
            className="mt-4 px-4 py-3"
          >
            <VStack className="gap-1">
              <ToastTitle className="font-bold text-typography-0">
                {title}
              </ToastTitle>
              <ToastDescription className="text-typography-0">
                {description}
              </ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    }
  };

  const addInstagramAccount = () => {
    const trimmed = currentIg.trim().replace("@", "");
    if (!trimmed) return;

    if (instagramAccounts.length >= 10) {
      showToast("Batas Tercapai", "Maksimal 10 akun Instagram.", "error");
      return;
    }

    if (instagramAccounts.includes(trimmed)) {
      showToast("Akun Duplikat", "Akun ini sudah ditambahkan.", "error");
      return;
    }

    setInstagramAccounts([...instagramAccounts, trimmed]);
    setCurrentIg("");
  };

  const removeInstagramAccount = (index: number) => {
    setInstagramAccounts(instagramAccounts.filter((_, i) => i !== index));
  };

  const fetchAddressFromCoords = async (lat: number, lon: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      if (results && results.length > 0) {
        const item = results[0];
        // Format: [Name/Street], [District], [City], [Region/Province]
        const name = item.name || item.street || "";
        const district = item.district || "";
        const city = item.city || item.subregion || "";
        const region = item.region || "";

        const fullAddress = [name, district, city, region]
          .filter((part) => part && part.length > 0)
          .join(", ");

        return fullAddress;
      }
    } catch (err) {
      console.error("Reverse Geocode Error:", err);
    }
    return null;
  };

  const fetchSuggestions = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        // Use Photon (OpenStreetMap) for as-you-type suggestions
        // Bias center set to Serang, Banten: -6.1104, 106.1517
        const minLon = 95.0,
          minLat = -11.0,
          maxLon = 141.0,
          maxLat = 6.0;
        const resp = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=10&lat=-6.1104&lon=106.1517&bbox=${minLon},${minLat},${maxLon},${maxLat}`,
        );
        const data = await resp.json();

        if (data.features) {
          // Strictly filter for Indonesia on client side as well
          const filtered = data.features.filter((f: any) => {
            const countryCode = String(
              f.properties.countrycode || "",
            ).toUpperCase();
            const country = String(f.properties.country || "").toLowerCase();
            return countryCode === "ID" || country.includes("indonesia");
          });
          setSuggestions(filtered);
        }
      } catch (err) {
        console.error("Suggestions Error:", err);
      }
    }, 500); // 500ms debounce
  };

  const selectSuggestion = (item: any) => {
    const [lon, lat] = item.geometry.coordinates;

    // Construct better label from Photon properties
    const prop = item.properties;
    const name = prop.name || prop.street || "";
    const district = prop.district || "";
    const city = prop.city || "";
    const state = prop.state || "";

    const label = [name, district, city, state]
      .filter((p) => p && p.length > 0)
      .join(", ");

    setSearchQuery(label);
    setSuggestions([]);
    Keyboard.dismiss();

    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    setLocationCoords({ latitude: lat, longitude: lon });
    setMapAddress(label); // Set the Map Address separately
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSuggestions([]);
    Keyboard.dismiss();
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setLocationCoords({ latitude, longitude });
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        showToast(
          "Lokasi Tidak Ditemukan",
          "Coba masukkan nama tempat yang lebih spesifik.",
          "error",
        );
      }
    } catch (err) {
      showToast(
        "Kesalahan Pencarian",
        "Pastikan internet menyala dan coba lagi.",
        "error",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const goToMyLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast(
          "Izin Ditolak",
          "Izin lokasi diperlukan untuk fitur ini.",
          "error",
        );
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setLocationCoords({ latitude, longitude });
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (err) {
      showToast("Kesalahan", "Gagal mendapatkan lokasi GPS.", "error");
    }
  };

  const handleBooking = async () => {
    if (!phoneNumber || !location) {
      return showToast(
        "Data Belum Lengkap",
        "Nomor telepon dan lokasi wajib diisi.",
        "error",
      );
    }

    setSubmitting(true);
    const eventStartTime = startTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Combine map address and manual details for the database
    const finalLocationString = mapAddress
      ? `${mapAddress}\nDetail: ${location}`
      : location;

    const { error } = await supabase.from("bookings").insert({
      client_id: user?.id,
      package_id: packageId,
      event_date: date,
      event_time: `${eventStartTime}:00`,
      end_time: "17:00:00",
      phone_number: phoneNumber,
      is_whatsapp: isWhatsApp,
      instagram_accounts: instagramAccounts.filter((acc) => acc.trim() !== ""),
      location: finalLocationString,
      latitude: locationCoords?.latitude,
      longitude: locationCoords?.longitude,
      notes,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      showToast("Gagal Memesan", error.message, "error");
    } else {
      showToast(
        "Pesanan Berhasil!",
        "Tim kami akan segera mengonfirmasi.",
        "success",
      );
      router.replace("/(client)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background-50"
    >
      <SafeAreaView className="flex-1">
        {loadingInit ? (
          <View className="flex-1 justify-center items-center">
            <Spinner size="large" className="text-typography-900" />
            <Text className="mt-3 text-typography-500">
              Sedang memuat data...
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <VStack className="px-6 pt-8 pb-2 gap-8">
                {/* 1. Header Section - Matched with Other Pages */}
                <VStack className="gap-4">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-row items-center gap-1 -ml-2 p-2"
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={textColorGray}
                    />
                    <Text className="text-typography-500 font-medium text-sm">
                      Kembali
                    </Text>
                  </TouchableOpacity>

                  <VStack className="gap-1">
                    <Text className="text-typography-500 font-medium text-sm tracking-widest uppercase">
                      Finalisasi Pesanan
                    </Text>
                    <Heading className="text-3xl font-extrabold text-typography-900 tracking-tight">
                      Lengkapi Detail{"\n"}Booking Anda.
                    </Heading>
                  </VStack>
                </VStack>

                {/* 2. Ringkasan Pesanan */}
                <Box className="bg-background-900 rounded-3xl p-6">
                  <VStack className="gap-4">
                    <VStack className="gap-0.5 border-b border-outline-600 pb-4">
                      <Text className="text-typography-50 text-[10px] uppercase font-bold tracking-widest">
                        Paket Pilihan
                      </Text>
                      <Heading className="text-typography-0 text-xl font-black">
                        {pkg?.name || "Layanan Pilihan"}
                      </Heading>
                    </VStack>
                    <VStack className="gap-2">
                      <HStack className="justify-between">
                        <Text className="text-typography-0 text-xs">
                          Tanggal
                        </Text>
                        <Text className="text-typography-0 text-xs font-bold">
                          {date || "-"}
                        </Text>
                      </HStack>
                      <HStack className="justify-between mt-1">
                        <Text className="text-typography-0 text-xs">
                          Estimasi
                        </Text>
                        <Text className="text-typography-0 text-lg font-black">
                          {formatRupiah(pkg?.price)}
                        </Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>

                {/* 2. Form Kontak */}
                <VStack className="gap-4">
                  <Text className="px-1 text-typography-900 font-black text-xs uppercase tracking-widest">
                    Detail Kontak
                  </Text>
                  <Box className="bg-background-0 rounded-3xl p-5 border border-outline-100 shadow-soft-1">
                    <VStack className="gap-5">
                      {/* Detail Kontak & Instagram */}
                      <VStack className="gap-6 pt-5 border-t border-outline-50">
                        {/* WhatsApp Section */}
                        <VStack className="gap-2">
                          <Text className="text-typography-900 font-bold text-xs ml-1">
                            No. WhatsApp
                          </Text>
                          <Input
                            variant="outline"
                            size="lg"
                            isDisabled={isWhatsApp && !!profile?.phone_number}
                            className="rounded-2xl bg-background-50 border-outline-200 h-14"
                          >
                            <InputField
                              placeholder="08xxxxxxxx"
                              value={phoneNumber}
                              onChangeText={setPhoneNumber}
                              keyboardType="phone-pad"
                              className="px-4 text-typography-900"
                            />
                          </Input>
                          <Checkbox
                            size="sm"
                            value="whatsapp"
                            isChecked={isWhatsApp}
                            onChange={(checked) => {
                              setIsWhatsApp(checked);
                              if (checked && profile?.phone_number)
                                setPhoneNumber(profile.phone_number);
                            }}
                            aria-label="whatsapp-profile"
                          >
                            <CheckboxIndicator>
                              <CheckboxIcon as={CheckIcon} />
                            </CheckboxIndicator>
                            <CheckboxLabel className="ml-2 text-[10px] text-typography-500">
                              Gunakan nomor profil
                            </CheckboxLabel>
                          </Checkbox>
                        </VStack>

                        {/* Instagram Section (Stable Pure Native) */}
                        <View style={{ gap: 12, marginTop: 4 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingHorizontal: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "800",
                                color: textColorDark,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Akun Instagram Client
                            </Text>
                            <View
                              style={{
                                backgroundColor: bgLight,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  color: textColorGray,
                                }}
                              >
                                {instagramAccounts.length} / 10
                              </Text>
                            </View>
                          </View>

                          {/* Row: Input + Add Button */}
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                flex: 1,
                                height: 52,
                                backgroundColor: bgLighter,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: borderColor,
                                paddingHorizontal: 16,
                                justifyContent: "center",
                              }}
                            >
                              <TextInput
                                placeholder="Username (@...)"
                                placeholderTextColor={textColorGray}
                                value={currentIg}
                                onChangeText={setCurrentIg}
                                onSubmitEditing={addInstagramAccount}
                                style={{
                                  fontSize: 14,
                                  color: textColorDark,
                                  paddingVertical: 0,
                                }}
                              />
                            </View>
                            <TouchableOpacity
                              onPress={addInstagramAccount}
                              activeOpacity={0.7}
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 14,
                                backgroundColor: theme.accent,
                                justifyContent: "center",
                                alignItems: "center",
                                shadowColor: theme.shadow,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                              }}
                            >
                              <Ionicons
                                name="add"
                                size={24}
                                color={theme.accentContrast}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Chips Area: Wrapped row of tags */}
                          {instagramAccounts.length > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 8,
                                marginTop: 4,
                              }}
                            >
                              {instagramAccounts.map((acc, index) => (
                                <View
                                  key={index}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: bgWhiteAlt,
                                    paddingLeft: 14,
                                    paddingRight: 8,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: bgLight,
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: "700",
                                      color: textColorDark,
                                    }}
                                  >
                                    @{acc}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      removeInstagramAccount(index)
                                    }
                                    activeOpacity={0.7}
                                    style={{
                                      marginLeft: 8,
                                      backgroundColor: bgLight,
                                      borderRadius: 8,
                                      padding: 2,
                                    }}
                                  >
                                    <Ionicons
                                      name="close"
                                      size={16}
                                      color={theme.textMuted}
                                    />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}

                          <Text
                            style={{
                              fontSize: 10,
                              color: textColorGray,
                              paddingHorizontal: 4,
                            }}
                          >
                            *Pencet tombol hitam untuk menambah akun. Klik nama
                            akun untuk menghapus.
                          </Text>
                        </View>
                      </VStack>
                    </VStack>
                  </Box>
                </VStack>

                {/* 3. Form Lokasi & Waktu */}
                <VStack className="gap-4">
                  <Text className="px-1 text-typography-900 font-black text-xs uppercase tracking-widest">
                    Detail Acara
                  </Text>
                  <Box className="bg-background-0 rounded-3xl p-5 border border-outline-100 shadow-soft-1">
                    <VStack className="gap-6">
                      <VStack className="gap-3">
                        <Text className="text-typography-900 font-bold text-xs ml-1">
                          Lokasi Pemotretan
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowMapModal(true)}
                          style={{
                            minHeight: 86,
                            paddingVertical: 12,
                            backgroundColor: locationCoords
                              ? isDark
                                ? theme.accentSoft
                                : theme.accentSoft
                              : bgLight,
                            borderRadius: 18,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            borderWidth: 1.5,
                            borderColor: locationCoords
                              ? theme.mapPin
                              : borderColor,
                            borderStyle: locationCoords ? "solid" : "dashed",
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: locationCoords
                                ? isDark
                                  ? theme.accent
                                  : theme.accentSoft
                                : bgWhiteAlt,
                              padding: 10,
                              borderRadius: 12,
                            }}
                          >
                            <Ionicons
                              name="map"
                              size={20}
                              color={
                                locationCoords ? theme.mapPin : textColorGray
                              }
                            />
                          </View>
                          <VStack className="flex-1 ml-4 justify-center">
                            <Text
                              style={{
                                fontSize: 13,
                                color: textColorDark,
                                fontWeight: "800",
                              }}
                            >
                              {locationCoords
                                ? "Pin Lokasi Berhasil ✓"
                                : "Pinpoint di Google Maps"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: textColorGray,
                                marginTop: 2,
                                lineHeight: 16,
                              }}
                            >
                              {mapAddress ||
                                "Tentukan titik lokasi di peta agar tim kami mudah menemukan acara Anda."}
                            </Text>
                          </VStack>
                          {locationCoords && (
                            <View
                              style={{
                                backgroundColor: theme.mapPin,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 8,
                                marginLeft: 8,
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.accentContrast,
                                  fontSize: 10,
                                  fontWeight: "900",
                                }}
                              >
                                GANTI
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <Textarea className="rounded-2xl border-outline-100 bg-background-50 h-24">
                          <TextareaInput
                            placeholder="Tuliskan detail tambahan (No. Rumah, Patokan, No. Lantai, dll)..."
                            value={location}
                            onChangeText={setLocation}
                            className="text-sm p-3 text-typography-900"
                          />
                        </Textarea>
                      </VStack>

                      <VStack className="gap-2 pt-4 border-t border-outline-50">
                        <Text className="text-typography-900 font-bold text-xs ml-1">
                          Jam Mulai Acara
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowPicker(true)}
                          style={{
                            height: 50,
                            backgroundColor: bgLight,
                            borderRadius: 12,
                            justifyContent: "center",
                            paddingHorizontal: 16,
                          }}
                        >
                          <HStack className="justify-between items-center">
                            <Text className="text-typography-950 font-black">
                              {startTime.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              WIB
                            </Text>
                            <Ionicons
                              name="time-outline"
                              size={20}
                              color={textColorDark}
                            />
                          </HStack>
                        </TouchableOpacity>
                        <Text className="text-[10px] text-typography-400 font-medium italic mt-1">
                          *Pemotretan akan berakhir otomatis pada pukul 17:00
                        </Text>

                        {showPicker && (
                          <DateTimePicker
                            value={startTime}
                            mode="time"
                            is24Hour={true}
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
                            onChange={(_, d) => {
                              setShowPicker(false);
                              if (d) setStartTime(d);
                            }}
                          />
                        )}
                      </VStack>
                    </VStack>
                  </Box>
                </VStack>

                {/* 4. Catatan */}
                <VStack className="gap-3">
                  <Text className="px-1 text-typography-900 font-black text-xs uppercase tracking-widest">
                    Catatan Tambahan
                  </Text>
                  <Textarea className="rounded-3xl border-outline-100 bg-background-0 h-24 shadow-soft-1">
                    <TextareaInput
                      placeholder="Tulis instruksi khusus untuk tim kami..."
                      value={notes}
                      onChangeText={setNotes}
                      className="text-sm p-4 text-typography-900"
                    />
                  </Textarea>
                </VStack>
              </VStack>
            </ScrollView>

            {/* Total & Confirm Footer */}
            <View
              style={{
                padding: 20,
                paddingHorizontal: 24,
                backgroundColor: bgWhite,
                borderTopWidth: 1,
                borderTopColor: borderColor,
                paddingBottom: Platform.OS === "ios" ? 34 : 20,
              }}
            >
              <Button
                size="xl"
                onPress={handleBooking}
                disabled={submitting}
                className="rounded-2xl h-14 bg-typography-950 active:bg-typography-900 shadow-hard-2"
              >
                {submitting && <ButtonSpinner className="mr-2" color="white" />}
                <ButtonText className="font-black text-typography-0">
                  KONFIRMASI PESANAN
                </ButtonText>
              </Button>
            </View>
          </View>
        )}

        {/* STABLE NATIVE MAP MODAL - 100% VISIBILITY GUARANTEED */}
        <Modal
          visible={showMapModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowMapModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: bgWhiteAlt }}>
            {/* Header Area */}
            <View
              style={{
                height: 60,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
                backgroundColor: bgWhiteAlt,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowMapModal(false)}
                style={{ padding: 8, marginLeft: -8 }}
              >
                <Ionicons name="close" size={24} color={textColorDark} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  marginLeft: 10,
                  color: textColorDark,
                }}
              >
                Pinpoint Lokasi
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: bgLight }}>
              {/* Search Control Overlay */}
              <View
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  right: 20,
                  zIndex: 100,
                  gap: 5,
                }}
              >
                <View
                  style={{
                    height: 56,
                    backgroundColor: bgWhiteAlt,
                    borderRadius: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 15,
                    elevation: 5,
                    borderWidth: 1,
                    borderColor: borderColor,
                  }}
                >
                  <Ionicons name="search" size={20} color={textColorGray} />
                  <TextInput
                    placeholder="Cari jalan, gedung, atau area..."
                    placeholderTextColor={textColorGray}
                    value={searchQuery}
                    onChangeText={fetchSuggestions}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 14,
                      color: textColorDark,
                      paddingVertical: 10,
                    }}
                  />
                  {isSearching ? (
                    <Spinner size="small" />
                  ) : (
                    <TouchableOpacity
                      onPress={handleSearch}
                      style={{
                        backgroundColor: theme.accent,
                        padding: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={theme.accentContrast}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                  <View
                    style={{
                      backgroundColor: bgWhiteAlt,
                      borderRadius: 18,
                      marginTop: 4,
                      maxHeight: 250,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 15,
                      elevation: 5,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: borderColor,
                    }}
                  >
                    <FlatList
                      data={suggestions}
                      keyExtractor={(_, i) => i.toString()}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => selectSuggestion(item)}
                          style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: borderColor,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color={textColorGray}
                            style={{ marginRight: 12 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: textColorDark,
                              }}
                              numberOfLines={1}
                            >
                              {String(
                                item.properties.name ||
                                  item.properties.street ||
                                  "Saran Lokasi",
                              )}
                            </Text>
                            <Text
                              style={{ fontSize: 12, color: textColorGray }}
                              numberOfLines={1}
                            >
                              {String(item.properties.city || "")}
                              {item.properties.city && item.properties.country
                                ? ", "
                                : ""}
                              {String(item.properties.country || "Indonesia")}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>

              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={mapRegion}
                onPress={async (e) => {
                  const coords = e.nativeEvent.coordinate;
                  setLocationCoords(coords);
                  const addr = await fetchAddressFromCoords(
                    coords.latitude,
                    coords.longitude,
                  );
                  if (addr) setSearchQuery(addr);
                }}
                onPoiClick={async (e) => {
                  const { coordinate, name } = e.nativeEvent;
                  setLocationCoords(coordinate);
                  const addr = await fetchAddressFromCoords(
                    coordinate.latitude,
                    coordinate.longitude,
                  );
                  setSearchQuery(addr || name);
                  mapRef.current?.animateToRegion(
                    {
                      ...coordinate,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    },
                    600,
                  );
                }}
                provider={Platform.OS === "android" ? "google" : undefined}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {locationCoords && <Marker coordinate={locationCoords} />}
              </MapView>

              {/* Float Buttons */}
              <TouchableOpacity
                onPress={goToMyLocation}
                style={{
                  position: "absolute",
                  bottom: 140,
                  right: 20,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: bgWhiteAlt,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 6,
                  zIndex: 50,
                }}
              >
                <Ionicons name="locate" size={26} color={textColorDark} />
              </TouchableOpacity>

              {/* Selection Summary Overlay */}
              <View
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 20,
                  right: 20,
                  backgroundColor: bgWhiteAlt,
                  borderRadius: 24,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                  elevation: 10,
                  zIndex: 40,
                }}
              >
                <View style={{ gap: 4, marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: theme.success,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Titik Terpilih
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: textColorDark,
                    }}
                    numberOfLines={1}
                  >
                    {locationCoords
                      ? String(
                          `${locationCoords.latitude.toFixed(6)}, ${locationCoords.longitude.toFixed(6)}`,
                        )
                      : "Ketuk peta untuk menandai alamat..."}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    // Sync the search query to the map address state
                    if (searchQuery) setMapAddress(searchQuery);
                    setShowMapModal(false);
                  }}
                  disabled={!locationCoords}
                  style={{
                    height: 56,
                    backgroundColor: locationCoords
                      ? isDark
                        ? theme.accent
                        : theme.accent
                      : borderColor,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: locationCoords
                        ? isDark
                          ? theme.accentContrast
                          : theme.accentContrast
                        : textColorGray,
                      fontWeight: "900",
                      fontSize: 14,
                    }}
                  >
                    KONFIRMASI LOKASI INI
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
