import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text size="2xl" bold={true} style={{ marginBottom: 16 }}>
          Aplikasi Siap! 🚀
        </Text>

        <Button size="md" variant="solid" action="primary">
          <ButtonText>Test Gluestack UI</ButtonText>
        </Button>
      </Box>
    </SafeAreaView>
  );
}
