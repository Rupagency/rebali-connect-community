import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      if (!mountedRef.current) return;

      if (profileRes.error) {
        console.error('Profile fetch error:', profileRes.error.message);
      }

      setProfile(profileRes.data ?? null);
      setIsAdmin(rolesRes.data?.some(r => r.role === 'admin') || false);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      if (mountedRef.current) {
        setProfile(null);
        setIsAdmin(false);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Set up listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mountedRef.current) return;

        // Skip INITIAL_SESSION — restoreSession handles it
        if (!initializedRef.current) return;

        // Update session + user synchronously (no async here!)
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // CRITICAL: Defer fetchProfile out of onAuthStateChange callback
          // to avoid Supabase client deadlock (client waits for callback
          // to finish before processing new requests)
          setLoading(true);
          const uid = newSession.user.id;
          setTimeout(() => {
            if (!mountedRef.current) return;
            fetchProfile(uid).finally(() => {
              if (mountedRef.current) setLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    // 2. Restore session
    const restoreSession = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await fetchProfile(s.user.id);
        }
      } catch (e) {
        console.error('Session restore error:', e);
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    };

    restoreSession();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
