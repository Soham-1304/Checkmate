import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../src/theme';
import { AppButton } from '../src/components/AppButton';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('officer@doca.gov.in');
  const [password, setPassword] = useState('Officer@12345');
  const [obscurePassword, setObscurePassword] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Details', 'Please enter both email and password.');
      return;
    }
    setErrorMessage(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Login failed. Please verify credentials.';
      setErrorMessage(msg);
      Alert.alert('Login Failed', msg);
    }
  };

  const fillDemoCreds = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrorMessage(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[Typography.headlineMedium, styles.title]}>Welcome Back</Text>
        <Text style={[Typography.bodyMedium, styles.subtitle]}>Sign in to your compliance dashboard</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[Typography.bodyLarge, styles.input]}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[Typography.bodyLarge, styles.input]}
            placeholder="••••••••"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={obscurePassword}
          />
          <MaterialIcons
            name={obscurePassword ? "visibility-off" : "visibility"}
            size={20}
            color={Colors.textSecondary}
            style={styles.inputIconRight}
            onPress={() => setObscurePassword(!obscurePassword)}
          />
        </View>

        <Text style={[Typography.labelMedium, styles.forgotPassword]}>Forgot Password?</Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color="#C62828" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <AppButton
          label="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          style={styles.loginBtn}
        />

        <View style={styles.demoSection}>
          <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginBottom: 8 }]}>QUICK DEMO LOGIN</Text>
          <View style={styles.demoRow}>
            <Pressable
              style={[styles.demoChip, email === 'officer@doca.gov.in' && styles.demoChipActive]}
              onPress={() => fillDemoCreds('officer@doca.gov.in', 'Officer@12345')}
            >
              <Text style={[styles.demoChipText, email === 'officer@doca.gov.in' && styles.demoChipTextActive]}>👮 Officer</Text>
            </Pressable>
            <Pressable
              style={[styles.demoChip, email === 'reviewer@doca.gov.in' && styles.demoChipActive]}
              onPress={() => fillDemoCreds('reviewer@doca.gov.in', 'Reviewer@12345')}
            >
              <Text style={[styles.demoChipText, email === 'reviewer@doca.gov.in' && styles.demoChipTextActive]}>🔍 Reviewer</Text>
            </Pressable>
            <Pressable
              style={[styles.demoChip, email === 'admin@doca.gov.in' && styles.demoChipActive]}
              onPress={() => fillDemoCreds('admin@doca.gov.in', 'Admin@12345')}
            >
              <Text style={[styles.demoChipText, email === 'admin@doca.gov.in' && styles.demoChipTextActive]}>👑 Admin</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.orContainer}>
          <View style={styles.divider} />
          <Text style={[Typography.labelSmall, styles.orText]}>OR</Text>
          <View style={styles.divider} />
        </View>

        <AppButton
          label="Continue as Guest (Explore App)"
          variant="outlined"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenHorizontal, paddingBottom: Spacing.massive },
  header: { marginTop: Spacing.xxxxl, marginBottom: Spacing.massive },
  logo: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.xxl,
  },
  title: { marginBottom: Spacing.sm },
  subtitle: { color: Colors.textSecondary },
  form: {},
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 12 },
  inputIconRight: { marginLeft: 12 },
  input: { flex: 1, height: 48 },
  forgotPassword: { alignSelf: 'flex-end', color: Colors.accent, marginBottom: Spacing.xxl },
  loginBtn: { marginBottom: Spacing.xxl },
  orContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xxl },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: 16, color: Colors.textTertiary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    flex: 1,
  },
  demoSection: {
    marginBottom: Spacing.lg,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  demoChipActive: {
    backgroundColor: `${Colors.primary}18`,
    borderColor: Colors.primary,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  demoChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
