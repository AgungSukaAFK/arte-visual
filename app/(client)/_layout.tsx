import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons"; // Ikon bawaan Expo

export default function ClientLayout() {
  const { session, role, isLoading } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background-0">
        <Spinner size="large" />
      </Center>
    );
  }

  // Proteksi Route
  if (!session) return <Redirect href="/(auth)/login" />;
  if (role === "admin") return <Redirect href="/(admin)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Sembunyikan header bawaan karena kita bikin custom
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#181718", // Warna saat aktif
        tabBarInactiveTintColor: isDark ? "#737373" : "#A3A3A3", // Warna redup
        tabBarStyle: {
          backgroundColor: isDark ? "#181718" : "#FFFFFF",
          borderTopColor: isDark ? "#262626" : "#E5E5E5",
          elevation: 0,
          shadowOpacity: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: "Packages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color }) => (
            <Ionicons name="images-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Setting",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={24} color={color} />
          ),
        }}
      />

      {/* Halaman Booking TETAP ada di dalam (client), 
        tapi kita sembunyikan dari deretan menu Tab 
      */}
      <Tabs.Screen name="booking" options={{ href: null }} />
    </Tabs>
  );
}
