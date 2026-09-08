import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Dimensions } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger';
export type ButtonSize = 'large' | 'medium' | 'small';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const getHeight = (size: ButtonSize) => {
  switch (size) {
    case 'large': return Dimensions.buttonHeightLg;
    case 'medium': return Dimensions.buttonHeightMd;
    case 'small': return Dimensions.buttonHeightSm;
  }
};

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  leading,
  trailing,
  isLoading = false,
  fullWidth = true,
  style,
}) => {
  const height = getHeight(size);

  const content = isLoading ? (
    <ActivityIndicator size="small" color={variant === 'primary' ? Colors.textInverse : Colors.textPrimary} />
  ) : (
    <View style={styles.row}>
      {leading && <View style={{ marginRight: 8 }}>{leading}</View>}
      <Text style={[
        Typography.button,
        { color: variant === 'primary' || variant === 'danger' ? Colors.textInverse : 
                 variant === 'outlined' || variant === 'ghost' ? Colors.textPrimary : Colors.textPrimary },
      ]}>{label}</Text>
      {trailing && <View style={{ marginLeft: 8 }}>{trailing}</View>}
    </View>
  );

  const containerStyle: ViewStyle = {
    height,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    ...(fullWidth ? { width: '100%' } : {}),
  };

  if (variant === 'primary') {
    return (
      <Pressable onPress={isLoading ? undefined : onPress} style={[fullWidth ? { width: '100%' } : {}, style]}>
        <LinearGradient
          colors={[Colors.accentDark, Colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[containerStyle, styles.primaryShadow]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    secondary: { backgroundColor: `${Colors.primaryLight}33`, borderWidth: 1, borderColor: Colors.primaryLight },
    outlined: { borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: `${Colors.error}1A`, borderWidth: 1, borderColor: `${Colors.error}80` },
  };

  return (
    <Pressable
      onPress={isLoading ? undefined : onPress}
      style={[containerStyle, variantStyles[variant], style]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShadow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
