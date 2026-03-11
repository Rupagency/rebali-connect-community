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
 * Fetch from Supabase REST API directly using fetch(), bypassing the
 * JS client's internal _getSession() lock that causes deadlocks.
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
  const sessionRef = useRef<Session | null>(null);

  // Keep ref in sync
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Fetch profile using raw fetch to avoid Supabase client deadlock
  const fetchProfile = useCallback(async (userId: string) => {
    const token = sessionRef.current?.access_token;
    if (!token) {
      console.warn('[Auth] fetchProfile: no access token available');
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    try {
      console.log('[Auth] fetchProfile for:', userId);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const [profileData, rolesData] = await Promise.all([
        supabaseRest(`profiles?id=eq.${userId}&select=*&limit=1`, token),
        supabaseRest(`user_roles?user_id=eq.${userId}&select=role`, token),
      ]);

      clearTimeout(timer);

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
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // When user/session changes, fetch profile (deferred to escape auth lock)
  useEffect(() => {
    if (user && session?.access_token) {
      const timer = setTimeout(() => fetchProfile(user.id), 50);
      return () => clearTimeout(timer);
    } else if (!user) {
      setProfile(null);
      setIsAdmin(false);
    }
  }, [user?.id, session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;

    // 1. Restore session from storage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      console.log('[Auth] getSession:', s ? s.user.id : 'null');
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('[Auth] getSession error:', err);
      if (mounted) setLoading(false);
    });

    // 2. Listen for auth changes — NO Supabase queries here!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] authChange:', _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
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
