import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
    try {
      console.log('[Auth] fetchProfile for:', userId);
      
      // Use Promise.race with timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('fetchProfile timeout')), 8000)
      );

      const fetchData = async () => {
        const [profileResult, rolesResult] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('user_roles').select('role').eq('user_id', userId),
        ]);
        return { profileResult, rolesResult };
      };

      const { profileResult, rolesResult } = await Promise.race([fetchData(), timeoutPromise]);

      const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const rolesData = rolesResult.status === 'fulfilled' ? rolesResult.value : null;

      console.log('[Auth] profile result:', { hasData: !!profileData?.data, error: profileData?.error?.message });
      console.log('[Auth] roles result:', { roles: rolesData?.data, error: rolesData?.error?.message });

      setProfile(profileData?.data ?? null);
      setIsAdmin(rolesData?.data?.some(r => r.role === 'admin') || false);
    } catch (err: any) {
      console.error('[Auth] fetchProfile error:', err?.message || err);
      setProfile(null);
      setIsAdmin(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Register listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange:', _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Skip if getSession already handled the initial load
          if (initializedRef.current) {
            fetchProfile(newSession.user.id);
          }
        } else {
          setProfile(null);
          setIsAdmin(false);
          if (initializedRef.current) {
            setLoading(false);
          }
        }
      }
    );

    // 2. Then get session — this is the primary initialization path
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      console.log('[Auth] getSession:', currentSession ? 'has session' : 'no session');
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }

      // Mark as initialized and unlock UI
      initializedRef.current = true;
      if (mounted) setLoading(false);
    }).catch((err) => {
      console.error('[Auth] getSession error:', err);
      initializedRef.current = true;
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
