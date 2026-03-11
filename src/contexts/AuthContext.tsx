import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch profile with timeout — standalone, never called inside onAuthStateChange
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('[Auth] fetchProfile for:', userId);

      // Race against a timeout to prevent infinite blocking
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('fetchProfile timeout (8s)')), 8000)
      );

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeout]);
      console.log('[Auth] profile result:', { data: !!data, error: error?.message });
      setProfile(data ?? null);

      const rolesPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const { data: roles } = await Promise.race([rolesPromise, timeout]);
      console.log('[Auth] roles:', roles);
      setIsAdmin(roles?.some(r => r.role === 'admin') || false);
    } catch (err: any) {
      console.error('[Auth] fetchProfile catch:', err?.message);
      setProfile(null);
      setIsAdmin(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // Separate effect: when user changes, fetch profile
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
      setIsAdmin(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;

    // 1. Restore session from storage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      console.log('[Auth] getSession:', s ? s.user.id : 'null');
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth changes — NO Supabase queries here!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] authChange:', _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // Profile fetch is triggered by the user state change effect above
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
