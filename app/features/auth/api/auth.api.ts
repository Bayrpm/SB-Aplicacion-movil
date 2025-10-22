import { supabase } from '@/app/shared/lib/supabase';
import { useState } from 'react';
import { Alert } from 'react-native';
/**
 * Verifica si un email ya está registrado verificando en la tabla de perfiles
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfiles_ciudadanos')
    .select('email')
    .eq('email', email.toLowerCase())
    .limit(1);

  if (error) {
    console.warn('Error verificando email:', error);
    return false; // En caso de error, permitir continuar
  }

  return data && data.length > 0;
}

/**
 * Registra un nuevo usuario en Supabase Auth con metadatos
 */
export async function signUpUser(email: string, password: string, userData?: {
  nombre?: string;
  apellido?: string;
  telefono?: string;
}) {
  const metadataToSend = {
    name: userData?.nombre || '',
    last_name: userData?.apellido || '',
    phone: userData?.telefono || ''
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadataToSend
    }
  });

  if (error) {
    // Manejar errores específicos de Supabase
    if (error.message.includes('User already registered') || 
        error.message.includes('already been registered') ||
        error.message.includes('Email address is already registered')) {
      return { 
        data: null, 
        error: { message: 'Este email ya está registrado. Intenta iniciar sesión en su lugar.' },
        user: null,
        session: null
      };
    }
    return { data: null, error, user: null, session: null };
  }
  
  return { data, error: null, user: data.user, session: data.session };
}
/**
 
Inicia sesión con email y contraseña
*/
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}


/**
 * Crea el perfil del ciudadano después del registro
 */
export async function createCitizenProfile(profileData: {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
}) {
  const { data, error } = await supabase
    .from('perfiles_ciudadanos')
    .insert([profileData])
    .select()
    .single();

  if (error) {
    // Si ya existe un perfil con este email, devolver error específico
    if (error.code === '23505') { // Violación de constraint único
      return { 
        data: null, 
        error: { message: 'Este email ya está registrado. Intenta iniciar sesión en su lugar.' }
      };
    }
    return { data: null, error };
  }
  
  return { data, error: null };
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

  return { data, error };
}

/**
 * Cierra la sesión del usuario
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
