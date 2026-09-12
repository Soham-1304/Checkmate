import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'What are the mandatory declarations under Rule 6(1)?',
    a: 'Every package must bear: (1) Name and address of manufacturer/packer/importer, (2) Common or generic name of commodity, (3) Net quantity in standard SI units, (4) Month & year of manufacture/pre-packing, (5) Maximum Retail Price (MRP) inclusive of all taxes, and (6) Consumer care contact details.',
  },
  {
    q: 'How is font height calculated for Net Quantity?',
    a: 'Under Rule 7 & Table 1 of the Rules: For net quantity up to 50g/ml: min 1.0mm; 50g-200g/ml: min 2.0mm; 200g-1kg/l: min 4.0mm; above 1kg/l: min 6.0mm. Checkmate AI automatically verifies optical font heights against package dimensions.',
  },
  {
    q: 'What should I do if AI OCR confidence is below 60%?',
    a: 'Tap the declaration in the inspection review screen to inspect the bounding box and manually confirm or correct the extracted value before evaluating compliance.',
  },
  {
    q: 'How does MPE (Maximum Permissible Error) work?',
    a: 'The First Schedule dictates allowable deficiency for packaged quantities. Checkmate calculates exact deficiency percentage and verifies whether the package passes statutory tolerances.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const callHelpline = () => {
    Linking.openURL('tel:1915');
  };

  const openPortal = () => {
    Linking.openURL('https://consumeraffairs.nic.in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Support Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <MaterialIcons name="support-agent" size={32} color={Colors.primary} />
          </View>
          <Text style={[Typography.titleMedium, { color: Colors.textInverse, fontWeight: '700', marginTop: 12 }]}>
            National Consumer Helpline
          </Text>
          <Text style={[Typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' }]}>
            Statutory assistance for Legal Metrology officers and enforcement personnel.
          </Text>
          <View style={styles.bannerActions}>
            <Pressable style={styles.callButton} onPress={callHelpline}>
              <MaterialIcons name="call" size={18} color={Colors.primary} />
              <Text style={styles.callButtonText}>Call 1915 (Toll Free)</Text>
            </Pressable>
            <Pressable style={styles.portalButton} onPress={openPortal}>
              <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
              <Text style={styles.portalButtonText}>DoCA Portal</Text>
            </Pressable>
          </View>
        </View>

        {/* SOP Guide */}
        <Text style={[Typography.titleSmall, styles.sectionHeader]}>
          Standard Operating Procedure (SOP)
        </Text>

        <View style={styles.sopCard}>
          <View style={styles.sopStep}>
            <View style={styles.sopNumber}><Text style={styles.sopNumberText}>1</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.titleSmall, { fontWeight: '700' }]}>Sample Verification</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                Ensure sample is intact, free of torn seals, and matches assigned commodity or retailer shelf lot.
              </Text>
            </View>
          </View>

          <View style={styles.sopDivider} />

          <View style={styles.sopStep}>
            <View style={styles.sopNumber}><Text style={styles.sopNumberText}>2</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.titleSmall, { fontWeight: '700' }]}>Label Photography</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                Capture Front Principal Display Panel (PDP), Back manufacturing panel, MRP panel, and Net Quantity.
              </Text>
            </View>
          </View>

          <View style={styles.sopDivider} />

          <View style={styles.sopStep}>
            <View style={styles.sopNumber}><Text style={styles.sopNumberText}>3</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.titleSmall, { fontWeight: '700' }]}>AI Evaluation & Review</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                RapidOCR extracts declarations automatically. Verify compliance score, review findings, and generate PDF report.
              </Text>
            </View>
          </View>
        </View>

        {/* Photography Tips */}
        <Text style={[Typography.titleSmall, styles.sectionHeader]}>
          Label Photography Protocol
        </Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipRow}>
            <MaterialIcons name="wb-sunny" size={20} color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textPrimary, flex: 1, marginLeft: 10 }]}>
              Avoid overhead glare on glossy laminated pouches by angling the camera 10–15°.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <MaterialIcons name="filter-center-focus" size={20} color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textPrimary, flex: 1, marginLeft: 10 }]}>
              Ensure the entire Principal Display Panel fits inside the on-screen reticle borders.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <MaterialIcons name="zoom-in" size={20} color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textPrimary, flex: 1, marginLeft: 10 }]}>
              Add a closeup photo of the stamped batch number, date, and MRP for high-precision OCR.
            </Text>
          </View>
        </View>

        {/* FAQs */}
        <Text style={[Typography.titleSmall, styles.sectionHeader]}>
          Frequently Asked Questions
        </Text>
        {FAQS.map((faq, index) => {
          const isExpanded = expandedFaq === index;
          return (
            <Pressable
              key={index}
              style={styles.faqCard}
              onPress={() => setExpandedFaq(isExpanded ? null : index)}
            >
              <View style={styles.faqHeader}>
                <Text style={[Typography.titleSmall, { fontWeight: '600', flex: 1, color: Colors.textPrimary }]}>
                  {faq.q}
                </Text>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={Colors.textSecondary}
                />
              </View>
              {isExpanded && (
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 8, lineHeight: 20 }]}>
                  {faq.a}
                </Text>
              )}
            </Pressable>
          );
        })}
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
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  bannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  portalButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  portalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionHeader: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sopStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  sopNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sopDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
