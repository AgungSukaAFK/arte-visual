import { Text } from "@/components/ui/text";
import { Center } from "@/components/ui/center";

export default function Login() {
  return (
    // Menggunakan Tailwind classes untuk styling
    <Center className="flex-1 bg-background-0">
      <Text className="text-xl font-bold text-typography-900">
        Ini Halaman Login
      </Text>
    </Center>
  );
}
