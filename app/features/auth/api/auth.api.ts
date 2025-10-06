import { supabase } from '@/app/shared/lib/supabase';
import type { CitizenProfile } from '../types';

/**
 * Registra un nuevo usuario en Supabase Auth
 */
export async function signUpUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Inicia sesión con email y contraseña
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Crea el perfil del ciudadano en la tabla perfiles_ciudadanos
 */
export async function upsertCitizenProfile(profile: CitizenProfile) {
  const { data, error } = await supabase
    .from('perfiles_ciudadanos')
    .upsert({
      usuario_id: profile.usuarioId,
      nombre: profile.nombre,
      email: profile.email,
      telefono: profile.telefono || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtiene el perfil del ciudadano actual
 */
export async function getCurrentCitizenProfile(userId: string) {
  const { data, error } = await supabase
    .from('perfiles_ciudadanos')
    .select('*')
    .eq('usuario_id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cierra la sesión del usuario
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
