import { clearAuthSession, supabase } from '@/app/shared/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
// No traer signInUser aquí: se usa únicamente en la pantalla de SignIn.

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
  // Permite actualizar rápidamente el estado de perfil/rol desde flows externos (p.ej. SignIn)
  setAuthState?: (payload: { profile: UserProfile | null; isInspector: boolean | undefined }) => void;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] 🔐 onAuthStateChange:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        hasRefreshToken: !!session?.refresh_token
      });
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
      // Obtener perfil e inspector directamente usando el id del usuario de la sesión
      setInspectorLoading(true);
      try {
        const userId = session.user.id;
        const [{ data: profile, error: profileError }, { data: inspectorData, error: inspectorError }] = await Promise.all([
          supabase
            .from('perfiles_ciudadanos')
            .select('*')
            .eq('usuario_id', userId)
            .maybeSingle(),
          supabase
            .from('inspectores')
            .select('id')
            .eq('usuario_id', userId)
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        setProfile(profile ?? null);
        setIsInspector(!!inspectorData);
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
    try {
      // Attempt a full clear of server session + local storage
      try {
        await clearAuthSession();
      } catch (_) {
        await supabase.auth.signOut();
      }
    } finally {
      // Ensure local auth state is cleared immediately so UI reacts to sign-out without waiting
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsInspector(undefined);
      setInspectorLoading(false);
      setRoleCheckFailed(false);
      setLoading(false);
    }
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
    setAuthState: ({ profile: p, isInspector: ins }) => {
      setProfile(p ?? null);
      setIsInspector(ins);
      setInspectorLoading(false);
    },
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
