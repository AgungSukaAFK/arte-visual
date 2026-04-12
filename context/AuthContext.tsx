import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Redirect } from "expo-router";
import type { OnlineUser } from "@/types/discussion";

// Tentukan tipe data role
type Role = "client" | "admin" | null;

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  phone_number: string | null;
} | null;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: Role;
  profile: Profile;
  isLoading: boolean;
  onlineUsers: OnlineUser[];
};

// Inisialisasi Context
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  isLoading: true,
  onlineUsers: [],
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  useEffect(() => {
    // 1. Cek sesi saat aplikasi pertama kali dibuka
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Dengarkan setiap perubahan status (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fungsi untuk mengambil detail profile dari tabel profiles
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = (await Promise.race([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout fetching profile")), 5000),
        ),
      ])) as any;

      if (data) {
        setProfile(data as Profile);
        setRole(data.role as Role);
      } else {
        setProfile(null);
        setRole(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user || !profile?.id || !profile.role) {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const channel = supabase
      .channel("online-users")
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flatMap((entries) => entries as Array<Record<string, unknown>>)
          .filter(
            (entry): entry is Record<string, unknown> & OnlineUser =>
              typeof entry.user_id === "string" &&
              (entry.role === "client" || entry.role === "admin"),
          )
          .map((entry) => ({
            user_id: entry.user_id,
            role: entry.role,
            full_name:
              typeof entry.full_name === "string" || entry.full_name === null
                ? entry.full_name
                : null,
          }));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: profile.id,
            role: profile.role,
            full_name: profile.full_name,
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setOnlineUsers([]);
    };
  }, [profile?.full_name, profile?.id, profile?.role, session?.user]);

  return (
    <AuthContext.Provider
      value={{ session, user, role, profile, isLoading, onlineUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
};
