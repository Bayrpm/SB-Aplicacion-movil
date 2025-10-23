import { supabase } from '@/app/shared/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserProfile } from './api/auth.api';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

interface UserProfile {
  // shape flexible, only exposing minimal fields here
  [key: string]: any;
}

interface ExtendedAuthContextType extends AuthContextType {
  isInspector: boolean | undefined;
  inspectorLoading: boolean;
  profile: UserProfile | null;
  roleCheckFailed?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isInspector, setIsInspector] = useState<undefined | boolean>(undefined);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [roleCheckFailed, setRoleCheckFailed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cuando la sesión cambia, obtener perfil y rol desde la base de datos
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!session?.user?.id) {
        if (mounted) {
          setProfile(null);
          setIsInspector(undefined);
          setInspectorLoading(false);
        }
        return;
      }

      setInspectorLoading(true);
      try {
        const res = await getUserProfile(session.user.id);
        if (!mounted) return;
  setProfile(res.profile ?? null);
  setIsInspector(typeof res.isInspector === 'boolean' ? res.isInspector : undefined);
        setRoleCheckFailed(false);
      } catch (e) {
        if (mounted) {
          setProfile(null);
          setIsInspector(false);
          setRoleCheckFailed(true);
        }
      } finally {
        if (mounted) setInspectorLoading(false);
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: ExtendedAuthContextType = {
    session,
    user,
    loading,
    signOut,
    isInspector,
    inspectorLoading,
    profile,
    roleCheckFailed,
  };

  return (
    // Type assertion because consumers expect ExtendedAuthContextType
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext) as ExtendedAuthContextType | undefined;
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export to satisfy expo-router file scan (not used as a page)
export default AuthProvider;
