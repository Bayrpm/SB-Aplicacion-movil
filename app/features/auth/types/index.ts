export interface CitizenProfile {
  usuarioId: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  createdAt?: string;
}

export interface RegistrationStep1Data {
  nombre: string;
}

export interface RegistrationStep2Data {
  telefono?: string;
}

export interface RegistrationStep3Data {
  email: string;
}

export interface RegistrationStep4Data {
  password: string;
  confirmPassword: string;
}

export interface CompleteRegistrationData 
  extends RegistrationStep1Data, 
          RegistrationStep2Data, 
          RegistrationStep3Data {}
