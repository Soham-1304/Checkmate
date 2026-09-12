import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { fetchEntities, BusinessEntity } from '../src/api/doca';

const ENTITY_TYPES = ['ALL', 'MANUFACTURER', 'PACKER', 'IMPORTER', 'BRAND_OWNER'];

export default function EntitiesScreen() {
  const router = useRouter();
  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const loadEntities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const type = selectedType === 'ALL' ? undefined : selectedType;
      const data = await fetchEntities(searchQuery || undefined, type);
      setEntities(data);
    } catch {
      setEntities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEntities();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadEntities]);

  const getTypeBadgeStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'MANUFACTURER':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'PACKER':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'IMPORTER':
        return { bg: '#FFF3E0', text: '#E65100' };
      case 'BRAND_OWNER':
        return { bg: '#F3E5F5', text: '#7B1FA2' };
      default:
        return { bg: '#F5F5F5', text: Colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Business Entities</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search company, GSTIN, or state..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={18} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Horizontal Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {ENTITY_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <Pressable
                key={type}
                style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                  {type === 'ALL' ? 'All Entities' : type.replace('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEntities(true)} tintColor={Colors.primary} />}
      >
        <View style={styles.countRow}>
          <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
            Showing {entities.length} registered entit{entities.length === 1 ? 'y' : 'ies'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
              Loading entity records...
            </Text>
          </View>
        ) : entities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="business" size={48} color={Colors.borderLight} />
            <Text style={[Typography.titleSmall, { marginTop: 12, color: Colors.textSecondary }]}>
              No entities found
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textTertiary, marginTop: 4, textAlign: 'center' }]}>
              {searchQuery ? 'Try adjusting your search keywords.' : 'No entities match the selected category.'}
            </Text>
          </View>
        ) : (
          entities.map((entity) => {
            const badge = getTypeBadgeStyle(entity.type);
            return (
              <View key={entity.id} style={styles.entityCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.titleSmall, { fontWeight: '700', color: Colors.textPrimary }]}>
                      {entity.legal_name}
                    </Text>
                    {entity.gstin ? (
                      <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginTop: 2, fontFamily: 'monospace' }]}>
                        GSTIN: {entity.gstin}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {entity.type.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {entity.address ? (
                  <View style={styles.cardRow}>
                    <MaterialIcons name="location-on" size={16} color={Colors.textTertiary} style={{ marginTop: 2 }} />
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary, flex: 1, marginLeft: 6 }]}>
                      {entity.address}{entity.state ? `, ${entity.state}` : ''}{entity.pincode ? ` - ${entity.pincode}` : ''}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, { backgroundColor: entity.is_active ? '#2E7D32' : '#C62828' }]} />
                    <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                      {entity.is_active ? 'Active Registrant' : 'Inactive'}
                    </Text>
                  </View>
                  <Text style={[Typography.labelSmall, { color: Colors.textTertiary }]}>
                    Reg: {new Date(entity.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  countRow: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  entityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
