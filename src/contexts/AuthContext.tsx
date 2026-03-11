import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = "https://eddrshyqlrpxgvyxpjee.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZHJzaHlxbHJweGd2eXhwamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODI0MjYsImV4cCI6MjA4NzA1ODQyNn0.On_i0UMaMbhYVV18NTrWZiUDz6mPqVY8Hrv5URj11tc";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Direct REST call bypassing the Supabase client to avoid internal deadlocks.
 */
async function supabaseRest(path: string, accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`REST ${res.status}: ${res.statusText}`);
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const accessTokenRef = useRef<string | null>(null);

  // Fetch profile using raw fetch to avoid Supabase client deadlock
  const fetchProfile = useCallback(async (userId: string, token: string) => {
    try {
      console.log('[Auth] fetchProfile for:', userId);

      const [profileData, rolesData] = await Promise.all([
        supabaseRest(`profiles?id=eq.${userId}&select=*&limit=1`, token),
        supabaseRest(`user_roles?user_id=eq.${userId}&select=role`, token),
      ]);

      const prof = profileData?.[0] ?? null;
      console.log('[Auth] profile result:', { data: !!prof });
      setProfile(prof);

      console.log('[Auth] roles:', rolesData);
      setIsAdmin(rolesData?.some((r: any) => r.role === 'admin') || false);
    } catch (err: any) {
      console.error('[Auth] fetchProfile catch:', err?.message);
      setProfile(null);
      setIsAdmin(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = accessTokenRef.current;
    if (user && token) await fetchProfile(user.id, token);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as THE SOLE source of truth.
    // Supabase v2 fires INITIAL_SESSION first (restores from storage),
    // then SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED for subsequent changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] authChange:', event, newSession?.user?.id ?? 'null');

        setSession(newSession);
        setUser(newSession?.user ?? null);
        accessTokenRef.current = newSession?.access_token ?? null;

        // Always mark loading as done after any auth event
        setLoading(false);

        // Fetch profile in background (deferred to escape auth lock)
        if (newSession?.user && newSession.access_token) {
          const uid = newSession.user.id;
          const token = newSession.access_token;
          setTimeout(() => {
            if (mounted) fetchProfile(uid, token);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    // Safety: if onAuthStateChange never fires (shouldn't happen), unlock after 5s
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] safety timeout — forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    accessTokenRef.current = null;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: true,
      profile: null,
      isAdmin: false,
      signOut: async () => {},
      refreshProfile: async () => {},
    } as AuthContextType;
  }
  return context;
}
