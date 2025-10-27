
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  children?: React.ReactNode;
  style?: any;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  style,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={style}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityLabel={accessibilityLabel}
  >
    {children}
  </TouchableOpacity>
);
