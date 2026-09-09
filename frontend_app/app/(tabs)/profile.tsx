import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace('/login');
            } catch {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  // ── Derive display values from live user or fallback
  const displayName = user?.name ?? 'Officer';
  const displayRole = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace('_', ' ')
    : 'Inspector';
  const displayEmail = user?.email ?? '';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const officerId = user?.id ? `ID: ${user.id.slice(0, 12).toUpperCase()}` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={[Typography.titleMedium, { fontWeight: '600', flex: 1, textAlign: 'left' }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[Typography.titleMedium, { color: Colors.textInverse, fontWeight: '600' }]}>{displayName}</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textInverse, opacity: 0.9, marginTop: 2 }]}>{displayRole}</Text>
            {displayEmail ? (
              <Text style={[Typography.labelSmall, { color: Colors.textInverse, opacity: 0.7, marginTop: 4 }]}>{displayEmail}</Text>
            ) : null}
            {officerId ? (
              <Text style={[Typography.labelSmall, { color: Colors.textInverse, opacity: 0.6, marginTop: 2 }]}>{officerId}</Text>
            ) : null}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Pressable style={styles.menuItem}>
            <MaterialIcons name="person-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Personal Information</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <MaterialIcons name="settings" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Preferences</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <MaterialIcons name="lock-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <MaterialIcons name="notifications-none" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Notification Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <MaterialIcons name="language" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Language</Text>
            <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginRight: 8 }]}>English</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#C62828" />
          ) : (
            <MaterialIcons name="logout" size={20} color="#C62828" />
          )}
          <Text style={styles.logoutText}>{loggingOut ? 'Signing out…' : 'Sign Out'}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4DB6AC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: 28,
    color: '#E0F2F1',
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C62828',
  },
});
