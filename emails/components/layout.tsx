import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const colors = {
  background: "#f8f7f5",
  card: "#ffffff",
  text: "#181512",
  muted: "#756f69",
  border: "#e8e2dc",
  primary: "#bf4f1f",
};

export function PulseEmailLayout({
  preview,
  title,
  children,
  footer,
}: {
  preview: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <Container style={{ maxWidth: "580px", padding: "32px 18px" }}>
          <Section
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              padding: "28px",
            }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: "13px",
                fontWeight: 700,
                margin: "0 0 12px",
              }}
            >
              Pulse
            </Text>
            <Heading
              style={{
                color: colors.text,
                fontSize: "24px",
                lineHeight: "1.25",
                margin: "0 0 18px",
              }}
            >
              {title}
            </Heading>
            {children}
          </Section>
          <Section style={{ padding: "18px 4px 0" }}>
            {footer}
            <Text
              style={{
                color: colors.muted,
                fontSize: "12px",
                lineHeight: "18px",
                margin: "12px 0 0",
              }}
            >
              Pulse helps you turn small actions into Proof of the person you
              are becoming.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailText({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: "15px",
        lineHeight: "24px",
        margin: "0 0 14px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: colors.primary,
        borderRadius: "8px",
        color: "#ffffff",
        display: "inline-block",
        fontSize: "14px",
        fontWeight: 700,
        padding: "11px 16px",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export function UnsubscribeFooter({ href }: { href: string }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: "12px",
        lineHeight: "18px",
        margin: 0,
      }}
    >
      You are receiving product emails from Pulse.{" "}
      <Link
        href={href}
        style={{ color: colors.muted, textDecoration: "underline" }}
      >
        Unsubscribe
      </Link>
      .
    </Text>
  );
}
