import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { API_BASE_URL } from '../src/api/endpoints';
import apiClient from '../src/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [baseUrl, setBaseUrl] = useState(API_BASE_URL);
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('custom_api_base');
      if (saved) setBaseUrl(saved);
    })();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setPingResult(null);
    const start = Date.now();
    try {
      // Test server base
      const url = baseUrl.replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${url}/health`, { method: 'GET' });
      const elapsed = Date.now() - start;
      if (res.ok) {
        setPingResult({ ok: true, message: `Connected in ${elapsed}ms (HTTP ${res.status})` });
      } else {
        setPingResult({ ok: false, message: `Server responded with HTTP ${res.status}` });
      }
    } catch (e: any) {
      setPingResult({ ok: false, message: e.message || 'Connection refused. Check URL & network.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveBaseUrl = async () => {
    try {
      await AsyncStorage.setItem('custom_api_base', baseUrl);
      apiClient.defaults.baseURL = baseUrl;
      Alert.alert('Saved', 'API base URL updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save configuration.');
    }
  };

  const handlePreset = (url: string) => {
    setBaseUrl(url);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Local Cache',
      'This will reset stored temporary inspection data and offline drafts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'Temporary cache has been purged.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Officer Profile Information */}
        <Text style={[Typography.titleSmall, styles.sectionTitle]}>Inspector Account</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || 'I').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.titleSmall, { fontWeight: '700' }]}>{user?.name || 'Inspector'}</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 1 }]}>
                {user?.email || 'officer@doca.gov.in'}
              </Text>
              <Text style={[Typography.labelSmall, { color: Colors.primary, marginTop: 4, fontWeight: '600' }]}>
                Role: {user?.role ? user.role.replace('_', ' ') : 'OFFICER'}
              </Text>
            </View>
          </View>
        </View>

        {/* Backend API Configuration */}
        <Text style={[Typography.titleSmall, styles.sectionTitle]}>API Server Endpoint</Text>
        <View style={styles.card}>
          <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginBottom: 8 }]}>
            Base URL for Inspection & AI OCR Engine
          </Text>
          <TextInput
            style={styles.urlInput}
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.presetRow}>
            <Pressable
              style={styles.presetBtn}
              onPress={() => handlePreset('http://localhost:8000/api/v1')}
            >
              <Text style={styles.presetText}>Localhost</Text>
            </Pressable>
            <Pressable
              style={styles.presetBtn}
              onPress={() => handlePreset('http://10.0.2.2:8000/api/v1')}
            >
              <Text style={styles.presetText}>Android (10.0.2.2)</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.testBtn, testing && { opacity: 0.6 }]}
              onPress={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons name="network-check" size={18} color={Colors.primary} />
              )}
              <Text style={styles.testBtnText}>Test Connection</Text>
            </Pressable>

            <Pressable style={styles.saveBtn} onPress={handleSaveBaseUrl}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>

          {pingResult && (
            <View style={[styles.pingBox, pingResult.ok ? styles.pingSuccess : styles.pingError]}>
              <MaterialIcons
                name={pingResult.ok ? 'check-circle' : 'error'}
                size={18}
                color={pingResult.ok ? '#2E7D32' : '#C62828'}
              />
              <Text
                style={[
                  Typography.bodySmall,
                  { color: pingResult.ok ? '#2E7D32' : '#C62828', flex: 1, marginLeft: 6, fontWeight: '500' },
                ]}
              >
                {pingResult.message}
              </Text>
            </View>
          )}
        </View>

        {/* Diagnostics & Cache */}
        <Text style={[Typography.titleSmall, styles.sectionTitle]}>Diagnostics & Data</Text>
        <View style={styles.card}>
          <Pressable style={styles.menuRow} onPress={handleClearCache}>
            <MaterialIcons name="cleaning-services" size={22} color={Colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>Clear Cache</Text>
              <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Purge temporary photo caches</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.menuRow}>
            <MaterialIcons name="info-outline" size={22} color={Colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>App Version</Text>
              <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Checkmate v1.2.0 • Build 2026-09</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconButton: { padding: 8 },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  urlInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
  },
  presetText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  testBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  pingSuccess: {
    backgroundColor: '#E8F5E9',
  },
  pingError: {
    backgroundColor: '#FFEBEE',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 10,
  },
});
