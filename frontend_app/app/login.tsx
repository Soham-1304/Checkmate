import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../src/theme';
import { AppButton } from '../src/components/AppButton';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [obscurePassword, setObscurePassword] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="verified" size={28} color={Colors.accent} />
        </View>
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

        <AppButton
          label="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          style={styles.loginBtn}
        />

        <View style={styles.orContainer}>
          <View style={styles.divider} />
          <Text style={[Typography.labelSmall, styles.orText]}>OR</Text>
          <View style={styles.divider} />
        </View>

        <AppButton
          label="Continue as Guest"
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
  iconContainer: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${Colors.accent}1A`,
    borderColor: `${Colors.accent}4D`, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
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
});
