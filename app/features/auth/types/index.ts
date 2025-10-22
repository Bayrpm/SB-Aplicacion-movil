export interface CitizenProfile {
  usuarioId: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  createdAt?: string;
}

export interface RegistrationStep1Data {
  nombre: string;
  apellido: string;
}

export interface RegistrationStep2Data {
  telefono?: string;
}

export interface RegistrationStep3Data {
  email: string;
  password: string;
}

export interface CompleteRegistrationData 
  extends RegistrationStep1Data, 
          RegistrationStep2Data, 
          RegistrationStep3Data {}

// Default export to satisfy expo-router scanning
const _typesPlaceholder = {} as const;
export default _typesPlaceholder;
