import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLayout() {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center className="flex-1">
        <Spinner size="large" />
      </Center>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "client") {
    return <Redirect href="/(client)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
