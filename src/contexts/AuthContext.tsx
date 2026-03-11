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
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileRes.error) {
      console.error('Profile fetch error:', profileRes.error.message);
    }

    setProfile(profileRes.data ?? null);
    setIsAdmin(rolesRes.data?.some(r => r.role === 'admin') || false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Restore session first (single source of truth for initial load)
    const restoreSession = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await fetchProfile(s.user.id);
        }
      } catch (e) {
        console.error('Session restore error:', e);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    };

    // 2. Listen for auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        // Skip the INITIAL_SESSION event — restoreSession handles it
        if (!initializedRef.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Set loading=true so pages show spinner while profile loads
          setLoading(true);
          fetchProfile(newSession.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setProfile(null);
          setIsAdmin(false);
          // Don't set loading — already false
        }
      }
    );

    restoreSession();

    return () => {
      mounted = false;
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
