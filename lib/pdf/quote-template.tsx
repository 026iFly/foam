import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { CalculationData, BuildingPartRecommendation } from '../types/quote';
import * as fs from 'fs';
import * as path from 'path';

// Load logo as base64 for PDF embedding
const logoPath = path.join(process.cwd(), 'public', 'intellifoam-logo.png');
let logoBase64: string | null = null;
try {
  const logoBuffer = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
} catch (e) {
  console.warn('Could not load logo for PDF:', e);
}

// Create styles - compact version for better fit
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 35,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  page2: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 35,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 160,
    height: 107, // Maintains 3:2 aspect ratio (1536x1024)
    marginBottom: 8,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 8,
    color: '#6b7280',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  quoteTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  quoteInfo: {
    textAlign: 'right',
  },
  quoteNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  quoteDate: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customerColumn: {
    width: '48%',
  },
  label: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 6,
  },
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableCol1: {
    width: '35%',
  },
  tableCol2: {
    width: '15%',
    textAlign: 'center',
  },
  tableCol3: {
    width: '25%',
    textAlign: 'center',
  },
  tableCol4: {
    width: '25%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  tableText: {
    fontSize: 8,
    color: '#1f2937',
  },
  tableTextSmall: {
    fontSize: 6,
    color: '#6b7280',
  },
  summaryTable: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 9,
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#16a34a',
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  rotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    marginTop: 3,
  },
  rotLabel: {
    fontSize: 9,
    color: '#1d4ed8',
  },
  rotValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  validityBadge: {
    backgroundColor: '#dcfce7',
    padding: 6,
    marginTop: 8,
    textAlign: 'center',
  },
  validityText: {
    fontSize: 8,
    color: '#166534',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 35,
    right: 35,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  // Page 2 styles
  terms: {
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginTop: 20,
  },
  termsTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  termsText: {
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  page2Header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
    paddingBottom: 10,
  },
  page2Title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
});

interface QuoteDocumentProps {
  quoteNumber: string;
  validUntil: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string;
  calculationData: CalculationData;
  companyInfo: {
    name: string;
    orgNumber: string;
    address: string;
    phone: string;
    email: string;
  };
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('sv-SE') + ' kr';
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export interface QuoteDocumentExport {
  quoteNumber: string;
  validUntil: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string;
  calculationData: CalculationData;
  companyInfo: {
    name: string;
    orgNumber: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const QuoteDocument = ({
  quoteNumber,
  validUntil,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  calculationData,
  companyInfo,
}: QuoteDocumentExport) => {
  const { recommendations, totals } = calculationData;

  return (
    <Document>
      {/* Page 1 - Quote Details */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companyInfo.name}</Text>
            )}
          </View>
        </View>

        {/* Quote Header */}
        <View style={styles.quoteHeader}>
          <View>
            <Text style={styles.quoteTitle}>OFFERT</Text>
            <Text style={styles.quoteDate}>
              Isolering med sprutskum
            </Text>
          </View>
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteNumber}>{quoteNumber}</Text>
            <Text style={styles.quoteDate}>
              Datum: {formatDate(new Date().toISOString())}
            </Text>
            <Text style={styles.quoteDate}>
              Giltig t.o.m: {formatDate(validUntil)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kundinformation</Text>
          <View style={styles.customerInfo}>
            <View style={styles.customerColumn}>
              <Text style={styles.label}>Namn</Text>
              <Text style={styles.value}>{customerName}</Text>
              <Text style={styles.label}>E-post</Text>
              <Text style={styles.value}>{customerEmail}</Text>
            </View>
            <View style={styles.customerColumn}>
              <Text style={styles.label}>Telefon</Text>
              <Text style={styles.value}>{customerPhone || '-'}</Text>
              <Text style={styles.label}>Projektadress</Text>
              <Text style={styles.value}>{customerAddress}</Text>
            </View>
          </View>
        </View>

        {/* Building Parts Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifikation</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.tableCol1}>
                <Text style={styles.tableHeaderText}>BYGGNADSDEL</Text>
              </View>
              <View style={styles.tableCol2}>
                <Text style={styles.tableHeaderText}>YTA</Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={styles.tableHeaderText}>TJOCKLEK</Text>
              </View>
              <View style={styles.tableCol4}>
                <Text style={styles.tableHeaderText}>PRIS EXKL. MOMS</Text>
              </View>
            </View>
            {recommendations.map((rec: BuildingPartRecommendation, idx: number) => {
              const isLast = idx === recommendations.length - 1;
              return (
                <View key={idx} style={isLast ? styles.tableRowLast : styles.tableRow}>
                  <View style={styles.tableCol1}>
                    <Text style={styles.tableText}>{rec.partName}</Text>
                    <Text style={styles.tableTextSmall}>
                      {rec.closedCellThickness > 0 && `Slutencell: ${rec.closedCellThickness}mm`}
                      {rec.closedCellThickness > 0 && rec.openCellThickness > 0 && ' + '}
                      {rec.openCellThickness > 0 && `Öppencell: ${rec.openCellThickness}mm`}
                    </Text>
                  </View>
                  <View style={styles.tableCol2}>
                    <Text style={styles.tableText}>{rec.area} m²</Text>
                  </View>
                  <View style={styles.tableCol3}>
                    <Text style={styles.tableText}>{rec.totalThickness} mm</Text>
                  </View>
                  <View style={styles.tableCol4}>
                    <Text style={styles.tableText}>
                      {formatCurrency(Math.round(rec.materialCost + rec.laborCost))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kostnadssammanställning</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total yta:</Text>
            <Text style={styles.summaryValue}>{totals.totalArea} m²</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Material:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.materialCostTotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Arbetskostnad ({totals.totalHours?.toFixed(1) || '-'} timmar):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.laborCostTotal)}</Text>
          </View>

          {totals.travelCost > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transport:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.travelCost)}</Text>
            </View>
          )}

          {totals.generatorCost > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Generator (ingen 3-fas):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.generatorCost)}</Text>
            </View>
          )}

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Summa exkl. moms:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.totalExclVat)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Moms (25%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.vat)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Totalt inkl. moms:</Text>
              <Text style={{ ...styles.summaryValue, fontFamily: 'Helvetica-Bold' }}>
                {formatCurrency(totals.totalInclVat)}
              </Text>
            </View>

            {totals.rotDeduction > 0 && (
              <View style={styles.rotRow}>
                <Text style={styles.rotLabel}>ROT-avdrag (30% av arbetskostnad):</Text>
                <Text style={styles.rotValue}>- {formatCurrency(totals.rotDeduction)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {totals.rotDeduction > 0 ? 'ATT BETALA EFTER ROT:' : 'ATT BETALA:'}
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.finalTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Validity Badge */}
        <View style={styles.validityBadge}>
          <Text style={styles.validityText}>
            Denna offert är giltig till och med {formatDate(validUntil)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyInfo.name} | Intelliray AB | Org.nr: 559374-0995 | Godkänd för F-skatt
          </Text>
          <Text style={styles.footerText}>
            {companyInfo.phone} | {companyInfo.email}
          </Text>
        </View>
      </Page>

      {/* Page 2 - Terms and Conditions */}
      <Page size="A4" style={styles.page2}>
        {/* Page 2 Header */}
        <View style={styles.page2Header}>
          <Text style={styles.page2Title}>Villkor - Offert {quoteNumber}</Text>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Allmänna villkor</Text>

          <Text style={styles.termsText}>
            • Betalning: 30 dagar netto från fakturadatum
          </Text>
          <Text style={styles.termsText}>
            • Arbetet utförs enligt svensk standard och Boverkets byggregler (BBR)
          </Text>
          <Text style={styles.termsText}>
            • Alla priser är baserade på normala arbetsförhållanden
          </Text>
          <Text style={styles.termsText}>
            • Garanti: 10 år på material, 5 år på utfört arbete
          </Text>
          <Text style={styles.termsText}>
            • Offerten förutsätter fri tillgång till arbetsplatsen under arbetstid
          </Text>
          <Text style={styles.termsText}>
            • Eventuella tilläggsarbeten debiteras enligt överenskommelse
          </Text>
          <Text style={styles.termsText}>
            • Vi förbehåller oss rätten till prisändringar vid väsentligt ändrade förutsättningar
          </Text>
          {totals.rotDeduction > 0 && (
            <>
              <Text style={{ ...styles.termsText, marginTop: 10 }}>
                • ROT-avdrag: Kunden ansvarar för att uppfylla kraven för ROT-avdrag enligt Skatteverkets regler
              </Text>
              <Text style={styles.termsText}>
                • ROT-avdraget förutsätter att kunden äger fastigheten och att arbetet utförs i kundens bostad
              </Text>
            </>
          )}
        </View>

        <View style={{ ...styles.terms, marginTop: 15 }}>
          <Text style={styles.termsTitle}>Teknisk information</Text>

          <Text style={styles.termsText}>
            • Våra produkter är CE-märkta enligt gällande EU-standarder
          </Text>
          <Text style={styles.termsText}>
            • Materialet följer REACH-förordningen för kemikaliesäkerhet
          </Text>
          <Text style={styles.termsText}>
            • Våra tekniker är certifierade enligt kraven för hantering av diisocyanater
          </Text>
          <Text style={styles.termsText}>
            • Arbetet utförs med hänsyn till Arbetsmiljöverkets föreskrifter (AFS)
          </Text>
        </View>

        <View style={{ ...styles.terms, marginTop: 15 }}>
          <Text style={styles.termsTitle}>Kontakt</Text>

          <Text style={styles.termsText}>
            Vid frågor om denna offert, vänligen kontakta oss:
          </Text>
          <Text style={{ ...styles.termsText, marginTop: 5 }}>
            Telefon: {companyInfo.phone}
          </Text>
          <Text style={styles.termsText}>
            E-post: {companyInfo.email}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyInfo.name} | Intelliray AB | Org.nr: 559374-0995 | Godkänd för F-skatt
          </Text>
          <Text style={styles.footerText}>
            {companyInfo.phone} | {companyInfo.email}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuoteDocument;
