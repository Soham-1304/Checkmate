import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

interface AppLoaderProps {
  message?: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={[Typography.bodyMedium, styles.text]}>{message}</Text>
  </View>
);

interface AppErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export const AppErrorView: React.FC<AppErrorViewProps> = ({ message, onRetry }) => (
  <View style={styles.container}>
    <Text style={[Typography.headlineSmall, { marginBottom: 8 }]}>Oops!</Text>
    <Text style={[Typography.bodyMedium, styles.text]}>{message}</Text>
    {onRetry && (
      <Text
        onPress={onRetry}
        style={[Typography.labelLarge, { color: Colors.accent, marginTop: 16 }]}
      >
        Tap to Retry
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 12,
    textAlign: 'center',
  },
});
