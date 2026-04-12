import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons"; // Ikon bawaan Expo
import { getTabBarScreenOptions } from "../../constants/theme";
import { View } from "react-native";
import DiscussionFAB from "@/components/discussion/DiscussionFAB";

export default function ClientLayout() {
  const { session, role, isLoading } = useAuth();
  const { colorScheme } = useColorScheme();

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
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={getTabBarScreenOptions(colorScheme)}>
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

        {/* Halaman yang TIDAK muncul di Tab Bar */}
        <Tabs.Screen name="booking" options={{ href: null }} />
        <Tabs.Screen name="orders" options={{ href: null }} />
        <Tabs.Screen name="invoices/index" options={{ href: null }} />
        <Tabs.Screen name="orders/index" options={{ href: null }} />
        <Tabs.Screen name="orders/[id]" options={{ href: null }} />
        <Tabs.Screen name="orders/payment" options={{ href: null }} />
        <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
        <Tabs.Screen name="discussion" options={{ href: null }} />
      </Tabs>
      <DiscussionFAB />
    </View>
  );
}
