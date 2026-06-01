import React from 'react';
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components';
import { render } from '@react-email/render';

interface BrandedEmailOptions {
    subject: string;
    text: string;
    badge?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    highlightCode?: string;
}

const brand = {
    page: '#f4f7fb',
    panel: '#ffffff',
    ink: '#0f172a',
    muted: '#64748b',
    border: '#dbe3ef',
    violet: '#6d28d9',
    violetDark: '#4c1d95',
    emerald: '#10b981',
};

const normalizeLines = (text: string, skipValues: string[]) => (
    text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !skipValues.includes(line))
);

function NexCvBrandedEmail({ subject, text, badge = 'NexCV', ctaLabel, ctaUrl, highlightCode }: BrandedEmailOptions) {
    const lines = normalizeLines(text, [ctaUrl || '', highlightCode || '']);
    const preview = lines[0] || subject;

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={{ margin: 0, backgroundColor: brand.page, fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <Container style={{ width: '100%', maxWidth: '620px', margin: '0 auto', padding: '32px 18px' }}>
                    <Section style={{ padding: '0 0 18px' }}>
                        <Text style={{ margin: 0, fontSize: '26px', lineHeight: '32px', fontWeight: 800, color: brand.ink }}>
                            NexCV
                        </Text>
                        <Text style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: '20px', fontWeight: 700, color: brand.violet }}>
                            AI CV builder for career-ready profiles
                        </Text>
                    </Section>

                    <Section style={{ backgroundColor: brand.panel, border: `1px solid ${brand.border}`, borderRadius: '18px', padding: '30px 30px 26px' }}>
                        <Text style={{ display: 'inline-block', margin: '0 0 14px', padding: '6px 10px', borderRadius: '999px', backgroundColor: '#ede9fe', color: brand.violetDark, fontSize: '12px', lineHeight: '16px', fontWeight: 800 }}>
                            {badge}
                        </Text>
                        <Heading style={{ margin: '0 0 18px', fontSize: '28px', lineHeight: '34px', fontWeight: 800, color: brand.ink }}>
                            {subject}
                        </Heading>

                        {lines.map((line, index) => (
                            <Text key={`${line}-${index}`} style={{ margin: index === 0 ? '0 0 14px' : '0 0 13px', fontSize: '15px', lineHeight: '24px', color: brand.ink }}>
                                {line}
                            </Text>
                        ))}

                        {highlightCode && (
                            <Section style={{ margin: '22px 0', padding: '18px', borderRadius: '14px', backgroundColor: '#f8fafc', border: `1px solid ${brand.border}`, textAlign: 'center' }}>
                                <Text style={{ margin: 0, fontSize: '34px', lineHeight: '42px', letterSpacing: '8px', fontWeight: 800, color: brand.violetDark }}>
                                    {highlightCode}
                                </Text>
                            </Section>
                        )}

                        {ctaLabel && ctaUrl && (
                            <Section style={{ margin: '24px 0 18px' }}>
                                <Button href={ctaUrl} style={{ display: 'inline-block', borderRadius: '12px', backgroundColor: brand.violet, color: '#ffffff', fontSize: '15px', lineHeight: '20px', fontWeight: 800, padding: '14px 20px', textDecoration: 'none' }}>
                                    {ctaLabel}
                                </Button>
                            </Section>
                        )}

                        {ctaUrl && (
                            <Text style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: '19px', color: brand.muted }}>
                                If the button does not work, open this link: <Link href={ctaUrl} style={{ color: brand.violet }}>{ctaUrl}</Link>
                            </Text>
                        )}

                        <Hr style={{ margin: '26px 0 18px', borderColor: brand.border }} />
                        <Text style={{ margin: 0, fontSize: '13px', lineHeight: '21px', color: brand.muted }}>
                            Need help? Reply to this email or contact support from your NexCV account.
                        </Text>
                    </Section>

                    <Text style={{ margin: '18px 0 0', textAlign: 'center', fontSize: '12px', lineHeight: '18px', color: brand.muted }}>
                        NexCV keeps your CVs, templates, and premium access ready when career timing matters.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

export const buildBrandedEmailHtml = (options: BrandedEmailOptions) => (
    render(<NexCvBrandedEmail {...options} />)
);
