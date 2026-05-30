import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { appUrl } from "@/lib/email/app-url";

const DEEP_BLUE = "#0F4C75";
const TEAL = "#1D9E75";
const NAVY = "#0D2137";
const MUTED = "#6B7280";

export function EmailLayout({
  preview,
  titleEn,
  titleAr,
  children,
}: {
  preview: string;
  titleEn: string;
  titleAr?: string;
  children: ReactNode;
}) {
  const unsubscribe = appUrl("/contact");

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "Arial, Helvetica, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
          <Section
            style={{
              backgroundColor: DEEP_BLUE,
              borderRadius: "12px 12px 0 0",
              padding: "24px 28px",
              textAlign: "center",
            }}
          >
            <Heading
              style={{
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              QudrahTech
            </Heading>
            <Text style={{ color: "#A7F3D0", fontSize: 12, margin: "8px 0 0" }}>
              Know Your Potential. Shape Your Future.
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "28px",
              borderLeft: `1px solid #E5E7EB`,
              borderRight: `1px solid #E5E7EB`,
            }}
          >
            <Heading style={{ color: NAVY, fontSize: 20, margin: "0 0 4px" }}>{titleEn}</Heading>
            {titleAr ? (
              <Text style={{ color: MUTED, fontSize: 16, margin: "0 0 20px", direction: "rtl" }}>{titleAr}</Text>
            ) : null}
            {children}
          </Section>

          <Section
            style={{
              backgroundColor: "#F1F5F9",
              borderRadius: "0 0 12px 12px",
              padding: "20px 28px",
              border: `1px solid #E5E7EB`,
              borderTop: "none",
            }}
          >
            <Text style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              © {new Date().getFullYear()} QudrahTech. All rights reserved.
            </Text>
            <Link href={unsubscribe} style={{ color: TEAL, fontSize: 12 }}>
              Contact / unsubscribe preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailCta({ href, labelEn, labelAr }: { href: string; labelEn: string; labelAr?: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
      <Link
        href={href}
        style={{
          backgroundColor: TEAL,
          borderRadius: 8,
          color: "#ffffff",
          display: "inline-block",
          fontSize: 15,
          fontWeight: 600,
          padding: "14px 28px",
          textDecoration: "none",
        }}
      >
        {labelEn}
      </Link>
      {labelAr ? (
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 8, direction: "rtl" }}>{labelAr}</Text>
      ) : null}
    </Section>
  );
}

export function EmailParagraph({ en, ar }: { en: string; ar?: string }) {
  return (
    <>
      <Text style={{ color: "#374151", fontSize: 15, lineHeight: 1.6, margin: "0 0 12px" }}>{en}</Text>
      {ar ? (
        <Text style={{ color: "#374151", fontSize: 15, lineHeight: 1.6, margin: "0 0 16px", direction: "rtl" }}>
          {ar}
        </Text>
      ) : null}
    </>
  );
}

export function EmailHr() {
  return <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />;
}
