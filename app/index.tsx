import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "nativewind";
import { getAppTheme } from "@/constants/theme";

export default function Index() {
  const { session, role, isLoading } = useAuth();
  const { colorScheme } = useColorScheme();
  const theme = getAppTheme(colorScheme);

  const [splashDone, setSplashDone] = useState(false);
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(14)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 2200);

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [subtitleOpacity, titleOpacity, titleTranslateY]);

  if (!splashDone) {
    return (
      <Center
        className="flex-1"
        style={{
          backgroundColor: theme.canvas,
        }}
      >
        <Box className="items-center px-8">
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Heading
              className="text-center text-5xl font-black tracking-tight"
              style={{ color: theme.textStrong }}
            >
              Arte Visual
            </Heading>
          </Animated.View>

          <Animated.View
            style={{
              opacity: subtitleOpacity,
              marginTop: 10,
            }}
          >
            <Text
              className="text-center text-xs font-bold uppercase tracking-widest"
              style={{ color: theme.textSoft }}
            >
              by J_Art Photography
            </Text>
          </Animated.View>
        </Box>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center className="flex-1">
        <Spinner size="large" />
      </Center>
    );
  }

  // Arahkan sesuai status dan role
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "admin") {
    return <Redirect href="/(admin)" />;
  }

  return <Redirect href="/(client)" />;
}
