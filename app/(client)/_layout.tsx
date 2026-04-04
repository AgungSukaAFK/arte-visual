import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";

export default function ClientLayout() {
  const { session, role, isLoading } = useAuth();

  // Tampilkan loading saat mengecek sesi
  if (isLoading) {
    return (
      <Center className="flex-1">
        <Spinner size="large" />
      </Center>
    );
  }

  // Jika belum login, tendang ke halaman login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Jika dia Admin tapi nyasar ke route Client, tendang ke Admin
  if (role === "admin") {
    return <Redirect href="/(admin)" />;
  }

  // Jika aman, tampilkan halaman-halaman Client
  return <Stack screenOptions={{ headerShown: false }} />;
}
