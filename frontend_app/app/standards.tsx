import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { fetchActiveRuleSet, RuleSetDetail, Requirement } from '../src/api/doca';

export default function StandardsScreen() {
  const router = useRouter();
  const [ruleSet, setRuleSet] = useState<RuleSetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  const loadStandards = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchActiveRuleSet();
      setRuleSet(data);
    } catch {
      setRuleSet(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStandards(); }, [loadStandards]);

  const filteredRequirements = useMemo(() => {
    if (!ruleSet?.requirements) return [];
    let items = ruleSet.requirements;
    if (mandatoryOnly) {
      items = items.filter((r) => r.is_mandatory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r) =>
        r.clause.toLowerCase().includes(q) ||
        (r.field_definition_id && r.field_definition_id.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [ruleSet, mandatoryOnly, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Legal Standards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStandards(true)} tintColor={Colors.primary} />}
      >
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <MaterialIcons name="gavel" size={24} color={Colors.textInverse} />
            <Text style={[Typography.titleMedium, { color: Colors.textInverse, fontWeight: '700', marginLeft: 8 }]}>
              {ruleSet?.version ?? 'LM-PCR-2011-v1.0'}
            </Text>
          </View>
          <Text style={[Typography.bodySmall, { color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 18 }]}>
            {ruleSet?.description ?? 'Legal Metrology (Packaged Commodities) Rules 2011 — Mandatory declarations & packaging standards gazetted under Section 52.'}
          </Text>
          <View style={styles.bannerPills}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {ruleSet?.requirements_count ?? 10} Statutory Rules
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.pillText}>Active Enforcement</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clause (e.g. Rule 6, MRP, Net Wt)..."
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

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !mandatoryOnly && styles.filterChipActive]}
            onPress={() => setMandatoryOnly(false)}
          >
            <Text style={[styles.filterChipText, !mandatoryOnly && styles.filterChipTextActive]}>
              All Requirements ({ruleSet?.requirements?.length ?? 0})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, mandatoryOnly && styles.filterChipActive]}
            onPress={() => setMandatoryOnly(true)}
          >
            <Text style={[styles.filterChipText, mandatoryOnly && styles.filterChipTextActive]}>
              Mandatory Only
            </Text>
          </Pressable>
        </View>

        {/* Requirements List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
              Loading Legal Metrology standard requirements...
            </Text>
          </View>
        ) : filteredRequirements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="menu-book" size={48} color={Colors.borderLight} />
            <Text style={[Typography.titleSmall, { marginTop: 12, color: Colors.textSecondary }]}>
              No requirements found
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textTertiary, marginTop: 4 }]}>
              Try adjusting your search query.
            </Text>
          </View>
        ) : (
          filteredRequirements.map((req, idx) => (
            <View key={req.id || String(idx)} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View style={styles.clauseBadge}>
                  <Text style={styles.clauseText}>{req.clause}</Text>
                </View>
                {req.is_mandatory ? (
                  <View style={styles.mandatoryBadge}>
                    <Text style={styles.mandatoryText}>MANDATORY</Text>
                  </View>
                ) : (
                  <View style={styles.conditionalBadge}>
                    <Text style={styles.conditionalText}>CONDITIONAL</Text>
                  </View>
                )}
              </View>

              <Text style={[Typography.titleSmall, { fontWeight: '700', color: Colors.textPrimary, marginTop: 8 }]}>
                {req.field_definition_id ? req.field_definition_id.replace(/_/g, ' ') : 'Standard Declaration'}
              </Text>

              <View style={styles.criteriaGrid}>
                <View style={styles.criteriaItem}>
                  <MaterialIcons name="text-fields" size={16} color={Colors.primary} />
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                    Min Height: {req.min_font_height_mm != null ? `${req.min_font_height_mm}mm` : 'Per First Schedule'}
                  </Text>
                </View>

                <View style={styles.criteriaItem}>
                  <MaterialIcons
                    name={req.contrast_required ? "contrast" : "brightness-low"}
                    size={16}
                    color={req.contrast_required ? Colors.primary : Colors.textTertiary}
                  />
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                    {req.contrast_required ? 'High Contrast Required' : 'Standard Contrast'}
                  </Text>
                </View>

                <View style={styles.criteriaItem}>
                  <MaterialIcons
                    name={req.clearance_required ? "aspect-ratio" : "crop-free"}
                    size={16}
                    color={req.clearance_required ? Colors.primary : Colors.textTertiary}
                  />
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                    {req.clearance_required ? 'Clearance Border Required' : 'Standard Clearance'}
                  </Text>
                </View>

                <View style={styles.criteriaItem}>
                  <MaterialIcons
                    name={req.requires_principal_display ? "view-agenda" : "crop-portrait"}
                    size={16}
                    color={req.requires_principal_display ? '#E65100' : Colors.textTertiary}
                  />
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                    {req.requires_principal_display ? 'Principal Display Panel (PDP)' : 'Any Visible Panel'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.referenceFooter}>
          <MaterialIcons name="info-outline" size={18} color={Colors.textTertiary} />
          <Text style={[Typography.labelSmall, { color: Colors.textTertiary, flex: 1, marginLeft: 8 }]}>
            Department of Consumer Affairs, Legal Metrology Division. Verified against Official Gazette of India notifications.
          </Text>
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
  bannerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ruleCard: {
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
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clauseBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clauseText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  mandatoryBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mandatoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C62828',
    letterSpacing: 0.5,
  },
  conditionalBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  criteriaGrid: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 8,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  referenceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
});
