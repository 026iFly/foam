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

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 180,
    height: 52,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#6b7280',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  quoteTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  quoteInfo: {
    textAlign: 'right',
  },
  quoteNumber: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  quoteDate: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 10,
    paddingBottom: 5,
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
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#1f2937',
    marginBottom: 8,
  },
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
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
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  tableText: {
    fontSize: 9,
    color: '#1f2937',
  },
  summaryTable: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 10,
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#16a34a',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  rotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  rotLabel: {
    fontSize: 10,
    color: '#1d4ed8',
  },
  rotValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  terms: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  validityBadge: {
    backgroundColor: '#dcfce7',
    padding: 8,
    marginTop: 10,
    textAlign: 'center',
  },
  validityText: {
    fontSize: 9,
    color: '#166534',
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
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companyInfo.name}</Text>
            )}
            <Text style={styles.companyInfo}>
              {companyInfo.address} | {companyInfo.phone} | {companyInfo.email}
            </Text>
            <Text style={styles.companyInfo}>Org.nr: {companyInfo.orgNumber}</Text>
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
                    <Text style={{ ...styles.tableText, fontSize: 7, color: '#6b7280' }}>
                      {rec.closedCellThickness > 0 && `Slutencell: ${rec.closedCellThickness}mm`}
                      {rec.closedCellThickness > 0 && rec.openCellThickness > 0 && ' + '}
                      {rec.openCellThickness > 0 && `Oppencell: ${rec.openCellThickness}mm`}
                    </Text>
                  </View>
                  <View style={styles.tableCol2}>
                    <Text style={styles.tableText}>{rec.area} m2</Text>
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
          <Text style={styles.sectionTitle}>Kostnadssammanstallning</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total yta:</Text>
            <Text style={styles.summaryValue}>{totals.totalArea} m2</Text>
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
            Denna offert ar giltig till och med {formatDate(validUntil)}
          </Text>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Villkor</Text>
          <Text style={styles.termsText}>
            - Betalning: 30 dagar netto fran fakturadatum
          </Text>
          <Text style={styles.termsText}>
            - Arbetet utfors enligt svensk standard och BBR
          </Text>
          <Text style={styles.termsText}>
            - Alla priser ar baserade pa normala arbetsforhallanden
          </Text>
          <Text style={styles.termsText}>
            - Garanti: 10 ar pa material, 5 ar pa utfort arbete
          </Text>
          {totals.rotDeduction > 0 && (
            <Text style={styles.termsText}>
              - ROT-avdrag: Kunden ansvarar for att uppfylla kraven for ROT-avdrag
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyInfo.name} | Org.nr: {companyInfo.orgNumber} | {companyInfo.email} | {companyInfo.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuoteDocument;
