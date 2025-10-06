import { z } from 'zod';

// Esquema para el paso 1: Nombre
export const registrationStep1Schema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),
});

// Esquema para el paso 2: Teléfono (opcional)
export const registrationStep2Schema = z.object({
  telefono: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
    .max(50, 'El teléfono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

// Esquema para el paso 3: Email
export const registrationStep3Schema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
});

// Esquema para el paso 4: Contraseña
export const registrationStep4Schema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type RegistrationStep1Form = z.infer<typeof registrationStep1Schema>;
export type RegistrationStep2Form = z.infer<typeof registrationStep2Schema>;
export type RegistrationStep3Form = z.infer<typeof registrationStep3Schema>;
export type RegistrationStep4Form = z.infer<typeof registrationStep4Schema>;
