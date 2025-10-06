import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { RegistrationStep1 } from '../components/RegistrationStep1';
import { RegistrationStep2 } from '../components/RegistrationStep2';
import { RegistrationStep3 } from '../components/RegistrationStep3';
import { RegistrationStep4 } from '../components/RegistrationStep4';
import { useRegistration } from '../hooks/useRegistration';

const TOTAL_STEPS = 4;

export default function SignUpScreen() {
  const {
    currentStep,
    loading,
    saveStep1Data,
    saveStep2Data,
    saveStep3Data,
    saveStep4Data,
    skipStep2,
    goBack,
    cancelRegistration,
  } = useRegistration();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <RegistrationStep1 onNext={saveStep1Data} onCancel={cancelRegistration} />;
      case 2:
        return <RegistrationStep2 onNext={saveStep2Data} onSkip={skipStep2} onBack={goBack} />;
      case 3:
        return <RegistrationStep3 onNext={saveStep3Data} onBack={goBack} />;
      case 4:
        return <RegistrationStep4 onNext={saveStep4Data} onBack={goBack} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.content}>
          <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          {renderStep()}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingTop: 60 },
});