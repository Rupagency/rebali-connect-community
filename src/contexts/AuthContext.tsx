import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const initialSessionHandled = useRef(false);

  const fetchProfile = async (userId: string) => {
    console.log('[Auth] fetchProfile for:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    console.log('[Auth] profile result:', { data: !!data, error: error?.message });
    setProfile(data);

    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    console.log('[Auth] roles result:', { roles, error: rolesErr?.message });
    setIsAdmin(roles?.some(r => r.role === 'admin') || false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // 1. Register listener FIRST (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid async inside callback (Supabase recommendation)
          setTimeout(() => {
            fetchProfile(session.user.id).then(() => {
              if (!initialSessionHandled.current) {
                initialSessionHandled.current = true;
                setLoading(false);
              }
            });
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          if (!initialSessionHandled.current) {
            initialSessionHandled.current = true;
            setLoading(false);
          }
        }
      }
    );

    // 2. Then get session — the listener above will handle the INITIAL_SESSION event
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If listener hasn't fired yet (edge case), handle it here
      if (!initialSessionHandled.current) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then(() => {
            if (!initialSessionHandled.current) {
              initialSessionHandled.current = true;
              setLoading(false);
            }
          });
        } else {
          initialSessionHandled.current = true;
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear state immediately to prevent render-time navigate loops
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
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
