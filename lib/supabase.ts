import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth:
    Platform.OS === "web"
      ? {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        }
      : {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
});
