import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={[Typography.titleMedium, { fontWeight: '600', flex: 1, textAlign: 'left' }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[Typography.titleMedium, { color: Colors.textInverse, fontWeight: '600' }]}>Aarav Verma</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textInverse, opacity: 0.9, marginTop: 2 }]}>Inspector</Text>
            <Text style={[Typography.labelSmall, { color: Colors.textInverse, opacity: 0.7, marginTop: 8 }]}>ID: INSP-2024-1256</Text>
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
    paddingBottom: 100, // Space for bottom nav
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
    borderColor: '#4DB6AC', // Lighter teal border
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: 28,
    color: '#E0F2F1', // Very light teal
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
  }
});
