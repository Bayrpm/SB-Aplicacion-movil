import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.text}>
        Paso {currentStep} de {totalSteps}
      </ThemedText>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              index < currentStep && styles.progressStepActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 300,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#007AFF',
  },
});

// Default export for expo-router route detection (these components are used as named exports elsewhere)
export default ProgressIndicator;
