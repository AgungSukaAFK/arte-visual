import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Redirect } from "expo-router";

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
};

// Inisialisasi Context
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ session, user, role, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
