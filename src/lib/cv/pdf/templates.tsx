import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CV } from "@prisma/client";

type PdfTemplate = "professional" | "modern" | "creative";
type BodyTheme = PdfTemplate;

export type CvPdfProps = {
  cv: CV;
  template: PdfTemplate;
};

/** Single-column sections + canonical headings → best ATS extraction order (modern/creative décor is header-only). */
const professionalBase = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.38 },
  header: { marginBottom: 14 },
  name: { fontSize: 20, fontWeight: 700, color: "#0F172A" },
  title: { fontSize: 12, color: "#334155", marginTop: 2 },
  meta: { fontSize: 10, color: "#475569", marginTop: 6 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#0D2137", marginBottom: 6 },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 2 },
  bulletDot: { width: 10, textAlign: "center" },
  muted: { color: "#475569" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#E2E8F0" },
});

const modernPdf = StyleSheet.create({
  page: {
    padding: 36,
    paddingTop: 28,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.42,
    backgroundColor: "#FAFAFA",
    color: "#1E293B",
  },
  headerRow: { flexDirection: "row", marginBottom: 18 },
  rule: { width: 7, backgroundColor: "#1D9E75" },
  headerInner: { flex: 1, paddingLeft: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#CBD5E1" },
  name: { fontSize: 23, fontWeight: 700, color: "#0F172A" },
  headline: { fontSize: 12, fontWeight: 700, color: "#0F766E", marginTop: 6 },
  meta: { fontSize: 10, color: "#64748B", marginTop: 8 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#0F4C75", letterSpacing: 0.8 },
  titleRule: { height: 2, backgroundColor: "#1D9E75", width: 52, marginTop: 5, marginBottom: 2 },
  muted: { color: "#475569" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#94D3BD",
    backgroundColor: "#F0FDF4",
  },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 2 },
  bulletDot: { width: 10, textAlign: "center", color: "#0F766E" },
});

const creativePdf = StyleSheet.create({
  page: { fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.42, backgroundColor: "#FFFFFF" },
  hero: {
    backgroundColor: "#0D2137",
    paddingHorizontal: 36,
    paddingTop: 26,
    paddingBottom: 20,
  },
  heroGold: { height: 4, backgroundColor: "#C9973A", width: "100%" },
  name: { fontSize: 24, fontWeight: 700, color: "#FFFFFF" },
  tagline: { fontSize: 12, fontWeight: 700, color: "#FDE68A", marginTop: 6 },
  meta: { fontSize: 10, color: "#CBD5E1", marginTop: 10 },
  bodyPad: { paddingHorizontal: 36, paddingTop: 20, paddingBottom: 36 },
  section: { marginTop: 14 },
  headingRow: { flexDirection: "row", alignItems: "stretch", gap: 10, marginBottom: 6 },
  goldBar: { width: 5, backgroundColor: "#C9973A", borderRadius: 1 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#0F4C75", flex: 1, paddingTop: 1 },
  muted: { color: "#475569" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D4A85A",
    backgroundColor: "#FFFBEB",
  },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 2 },
  bulletDot: { width: 10, textAlign: "center", color: "#B45309" },
});

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function lineMeta(cv: CV): string {
  const parts = [cv.email, cv.phone, cv.location].filter((x): x is string => Boolean(x && x.trim()));
  return parts.join(" · ");
}

function SectionHeading({ label, theme }: { label: string; theme: BodyTheme }) {
  if (theme === "modern") {
    return (
      <View wrap={false}>
        <Text style={modernPdf.sectionTitle}>{label}</Text>
        <View style={modernPdf.titleRule} />
      </View>
    );
  }
  if (theme === "creative") {
    return (
      <View style={creativePdf.headingRow} wrap={false}>
        <View style={creativePdf.goldBar} />
        <Text style={creativePdf.sectionTitle}>{label}</Text>
      </View>
    );
  }
  return <Text style={professionalBase.sectionTitle}>{label}</Text>;
}

function CvBodySections({ cv, theme }: { cv: CV; theme: BodyTheme }) {
  const exp = safeArray(cv.experience);
  const edu = safeArray(cv.education);
  const skills = safeArray(cv.skills);
  const summary = cv.summary?.trim();

  const sectionGap = theme === "professional" ? professionalBase.section : theme === "modern" ? modernPdf.section : creativePdf.section;
  const muted = theme === "professional" ? professionalBase.muted : theme === "modern" ? modernPdf.muted : creativePdf.muted;
  const bulletWrap = theme === "professional" ? professionalBase.bullet : theme === "modern" ? modernPdf.bullet : creativePdf.bullet;
  const bulletMark = theme === "professional" ? professionalBase.bulletDot : theme === "modern" ? modernPdf.bulletDot : creativePdf.bulletDot;
  const chips = theme === "professional" ? professionalBase.chipRow : theme === "modern" ? modernPdf.chipRow : creativePdf.chipRow;
  const chipStyle = theme === "professional" ? professionalBase.chip : theme === "modern" ? modernPdf.chip : creativePdf.chip;

  return (
    <>
      {summary ? (
        <View style={sectionGap}>
          <SectionHeading label="Summary" theme={theme} />
          <Text style={muted}>{summary}</Text>
        </View>
      ) : null}

      {exp.length ? (
        <View style={sectionGap}>
          <SectionHeading label="Experience" theme={theme} />
          {exp.slice(0, 6).map((row, i) => {
            const r = row as Record<string, unknown>;
            const title = asString(r.title);
            const company = asString(r.company);
            const desc = r.description;
            const descLines = Array.isArray(desc) ? desc.map(asString) : [asString(desc)];
            return (
              <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={{ fontWeight: 700 }}>
                  {title}
                  {company ? ` — ${company}` : ""}
                </Text>
                {descLines
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((d, j) => (
                    <View key={j} style={bulletWrap}>
                      <Text style={bulletMark}>•</Text>
                      <Text style={muted}>{d}</Text>
                    </View>
                  ))}
              </View>
            );
          })}
        </View>
      ) : null}

      {edu.length ? (
        <View style={sectionGap}>
          <SectionHeading label="Education" theme={theme} />
          {edu.slice(0, 4).map((row, i) => {
            const r = row as Record<string, unknown>;
            const degree = asString(r.degree);
            const inst = asString(r.institution);
            const field = asString(r.field);
            return (
              <Text key={i} style={muted}>
                {degree}
                {field ? `, ${field}` : ""}
                {inst ? ` — ${inst}` : ""}
              </Text>
            );
          })}
        </View>
      ) : null}

      {skills.length ? (
        <View style={sectionGap}>
          <SectionHeading label="Skills" theme={theme} />
          <View style={chips}>
            {skills.slice(0, 24).map((row, i) => {
              const r = row as Record<string, unknown>;
              const n = asString(r.name) || asString(row);
              return (
                <View key={i} style={chipStyle}>
                  <Text>{n}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

function CvHeaderClassic({ cv }: { cv: CV }) {
  return (
    <View style={professionalBase.header}>
      <Text style={professionalBase.name}>{cv.fullName ?? ""}</Text>
      <Text style={professionalBase.title}>{cv.professionalTitle ?? ""}</Text>
      <Text style={professionalBase.meta}>{lineMeta(cv)}</Text>
    </View>
  );
}

function ModernDoc({ cv }: { cv: CV }) {
  return (
    <Document>
      <Page size="A4" style={modernPdf.page}>
        <View style={modernPdf.headerRow} wrap={false}>
          <View style={modernPdf.rule} />
          <View style={modernPdf.headerInner}>
            <Text style={modernPdf.name}>{cv.fullName ?? ""}</Text>
            <Text style={modernPdf.headline}>{cv.professionalTitle ?? ""}</Text>
            <Text style={modernPdf.meta}>{lineMeta(cv)}</Text>
          </View>
        </View>
        <CvBodySections cv={cv} theme="modern" />
      </Page>
    </Document>
  );
}

function CreativeDoc({ cv }: { cv: CV }) {
  return (
    <Document>
      <Page size="A4" style={creativePdf.page}>
        <View style={creativePdf.hero} wrap={false}>
          <Text style={creativePdf.name}>{cv.fullName ?? ""}</Text>
          <Text style={creativePdf.tagline}>{cv.professionalTitle ?? ""}</Text>
          <Text style={creativePdf.meta}>{lineMeta(cv)}</Text>
        </View>
        <View style={creativePdf.heroGold} />
        <View style={creativePdf.bodyPad}>
          <CvBodySections cv={cv} theme="creative" />
        </View>
      </Page>
    </Document>
  );
}

function ProfessionalDoc({ cv }: { cv: CV }) {
  return (
    <Document>
      <Page size="A4" style={professionalBase.page}>
        <CvHeaderClassic cv={cv} />
        <CvBodySections cv={cv} theme="professional" />
      </Page>
    </Document>
  );
}

export function CvPdfDocument({ cv, template }: CvPdfProps) {
  if (template === "modern") return <ModernDoc cv={cv} />;
  if (template === "creative") return <CreativeDoc cv={cv} />;
  return <ProfessionalDoc cv={cv} />;
}
