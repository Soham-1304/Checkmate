import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [modalType, setModalType] = useState<'info' | 'notifications' | 'language' | null>(null);
  const [language, setLanguage] = useState<'English' | 'हिन्दी (Hindi)'>('English');
  const [notifAssignments, setNotifAssignments] = useState(true);
  const [notifViolations, setNotifViolations] = useState(true);

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

  const handleChangePassword = () => {
    Alert.alert(
      'Password Management',
      'Inspector accounts are governed by the Department of Consumer Affairs Admin Portal. To rotate or reset your credentials, submit a request to your nodal administrator.',
      [{ text: 'OK' }],
    );
  };

  // Derive display values from live user
  const displayName = user?.name ?? 'Inspector';
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Pressable style={styles.menuItem} onPress={() => setModalType('info')}>
            <MaterialIcons name="person-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Personal Information</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Server & App Preferences</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={handleChangePassword}>
            <MaterialIcons name="lock-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => setModalType('notifications')}>
            <MaterialIcons name="notifications-none" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Notification Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => setModalType('language')}>
            <MaterialIcons name="language" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Language</Text>
            <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginRight: 8 }]}>{language}</Text>
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

      {/* Info Modal */}
      <Modal visible={modalType === 'info'} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalType(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Personal Information</Text>
              <Pressable onPress={() => setModalType(null)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{displayName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Official Email</Text>
              <Text style={styles.detailValue}>{displayEmail || 'officer@doca.gov.in'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned Role</Text>
              <Text style={styles.detailValue}>{displayRole}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cadre / Department</Text>
              <Text style={styles.detailValue}>Legal Metrology Enforcement Cell</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ministry</Text>
              <Text style={styles.detailValue}>Ministry of Consumer Affairs (DoCA)</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={modalType === 'notifications'} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalType(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Notification Settings</Text>
              <Pressable onPress={() => setModalType(null)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              style={styles.toggleRow}
              onPress={() => setNotifAssignments(!notifAssignments)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>Assignment Reminders</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Alerts for upcoming inspection deadlines</Text>
              </View>
              <MaterialIcons
                name={notifAssignments ? 'toggle-on' : 'toggle-off'}
                size={36}
                color={notifAssignments ? Colors.primary : Colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={styles.toggleRow}
              onPress={() => setNotifViolations(!notifViolations)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>High-Risk Violations</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Instant alerts when repeat offenders fail</Text>
              </View>
              <MaterialIcons
                name={notifViolations ? 'toggle-on' : 'toggle-off'}
                size={36}
                color={notifViolations ? Colors.primary : Colors.textTertiary}
              />
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal */}
      <Modal visible={modalType === 'language'} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalType(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Select Language</Text>
              <Pressable onPress={() => setModalType(null)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {(['English', 'हिन्दी (Hindi)'] as const).map((lang) => (
              <Pressable
                key={lang}
                style={styles.langOption}
                onPress={() => {
                  setLanguage(lang);
                  setModalType(null);
                }}
              >
                <Text style={[Typography.bodyMedium, language === lang && { color: Colors.primary, fontWeight: '700' }]}>
                  {lang}
                </Text>
                {language === lang && (
                  <MaterialIcons name="check" size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
});
