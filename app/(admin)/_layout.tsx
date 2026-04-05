import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
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

  // Proteksi Route Admin
  if (!session) return <Redirect href="/(auth)/login" />;
  if (role === "client") return <Redirect href="/(client)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#181718",
        tabBarInactiveTintColor: isDark ? "#737373" : "#A3A3A3",
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
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Pesanan",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: "Paket",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Galeri",
          tabBarIcon: ({ color }) => (
            <Ionicons name="images-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Klien",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={24} color={color} />
          ),
        }}
      />

      {/* Tambahkan baris ini di bawahnya */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
