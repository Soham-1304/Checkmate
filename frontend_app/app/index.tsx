import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../src/theme';

export default function SplashScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Navigate immediately without delay
    router.replace('/login');
  }, []);

  return (
    <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.container}>
      {/* Background orbs */}
      <View style={[styles.orb, { top: -60, right: -60, width: 200, height: 200, backgroundColor: `${Colors.accent}1A` }]} />
      <View style={[styles.orb, { bottom: 100, left: -80, width: 250, height: 250, backgroundColor: `${Colors.primaryLight}1A` }]} />

      {/* Logo */}
      <Animated.View style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.logoGradient}>
          <MaterialIcons name="verified" size={48} color={Colors.textPrimary} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={[Typography.headlineLarge, { color: Colors.textPrimary, fontWeight: '800', letterSpacing: 1.5, marginTop: 32 }]}>
          SIH Comply
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, letterSpacing: 0.5, marginTop: 8 }]}>
          Product Compliance Intelligence
        </Text>
      </Animated.View>

      {/* Bottom badge */}
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <Text style={[Typography.caption, { color: Colors.textTertiary }]}>Ministry of Consumer Affairs</Text>
        <Text style={[Typography.caption, { color: Colors.textTertiary }]}>Smart India Hackathon 2026</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orb: { position: 'absolute', borderRadius: 999 },
  logo: { alignItems: 'center' },
  logoGradient: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 32, elevation: 10,
  },
  bottom: { position: 'absolute', bottom: 40, alignItems: 'center' },
});
