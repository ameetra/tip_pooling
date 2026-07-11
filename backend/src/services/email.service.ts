import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { formatRole } from '../types/tip-calculation.types';

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@usegratify.com';
const FROM_NAME = process.env.FROM_NAME || 'Tip Pooling';
const APP_URL = process.env.APP_URL || 'https://usegratify.com';

// Escape user-controlled values before interpolating into email HTML (employee/venue names, etc.)
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface TipEmailData {
  employeeName: string;
  employeeEmail: string;
  restaurantName: string;
  slug?: string | null;
  logoUrl?: string | null;
  entryDate: string;
  roles: string[];
  hours: number;
  finalTips: number;
  totalPay: number;
  effectiveHourlyRate: number;
}

export async function sendTipEmail(data: TipEmailData): Promise<void> {
  const subject = `Your tips for ${data.entryDate} — ${data.restaurantName}`;
  const loginPath = data.slug ? `/${data.slug}/login` : '/login';
  const loginUrl = `${APP_URL}${loginPath}?email=${encodeURIComponent(data.employeeEmail)}`;
  const body = buildEmailBody(data, loginUrl);

  await ses.send(new SendEmailCommand({
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: { ToAddresses: [data.employeeEmail] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body }, Text: { Data: buildPlainText(data, loginUrl) } },
    },
  }));
}

function buildEmailBody(d: TipEmailData, loginUrl: string): string {
  const roles = esc(d.roles.map(formatRole).join(', ')) || '—';
  const name = esc(d.restaurantName);
  const employee = esc(d.employeeName);
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  ${d.logoUrl ? `<img src="${esc(d.logoUrl)}" alt="${name}" style="max-height:56px; margin-bottom:8px;" />` : ''}
  <h2 style="color: #1976d2; margin-top:0;">${name}</h2>
  <p>Hi ${employee},</p>
  <p>Here's your tip summary for <strong>${d.entryDate}</strong>:</p>
  <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
    <tr style="background:#f5f5f5;">
      <td style="padding: 8px 12px;">Role(s)</td>
      <td style="padding: 8px 12px; text-align:right;">${roles}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px;">Hours worked</td>
      <td style="padding: 8px 12px; text-align:right;">${d.hours.toFixed(1)}</td>
    </tr>
    <tr style="background:#f5f5f5;">
      <td style="padding: 8px 12px;">Tips earned</td>
      <td style="padding: 8px 12px; text-align:right;"><strong>$${d.finalTips.toFixed(2)}</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 12px;">Total pay (wages + tips)</td>
      <td style="padding: 8px 12px; text-align:right;">$${d.totalPay.toFixed(2)}</td>
    </tr>
    <tr style="background:#f5f5f5;">
      <td style="padding: 8px 12px;">Effective hourly rate</td>
      <td style="padding: 8px 12px; text-align:right;">$${d.effectiveHourlyRate.toFixed(2)}/hr</td>
    </tr>
  </table>
  <div style="margin: 24px 0;">
    <a href="${loginUrl}" style="background:#1976d2; color:#fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold;">
      View My Tip History
    </a>
  </div>
  <p style="color:#888; font-size:12px;">This is an automated message from your tip management system. Sign in with your work email to view your last 90 days of tips.</p>
  <p style="color:#bbb; font-size:11px;">Powered by Gratify</p>
</body>
</html>`;
}

export async function sendMagicLinkEmail(employeeName: string, employeeEmail: string, token: string, slug?: string | null, venueName?: string, logoUrl?: string | null): Promise<void> {
  const link = `${APP_URL}${slug ? `/${slug}` : ''}/auth/verify?token=${token}`;
  await ses.send(new SendEmailCommand({
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: { ToAddresses: [employeeEmail] },
    Message: {
      Subject: { Data: venueName ? `Your sign-in link — ${venueName}` : 'Your sign-in link' },
      Body: {
        Html: { Data: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  ${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(venueName)}" style="max-height:56px; margin-bottom:8px;" />` : ''}
  ${venueName ? `<h2 style="color:#1976d2; margin-top:0;">${esc(venueName)}</h2>` : ''}
  <p>Hi ${esc(employeeName)},</p>
  <p>Click the button below to sign in and view your tip history. This link expires in <strong>15 minutes</strong> and can only be used once.</p>
  <div style="margin: 24px 0;">
    <a href="${link}" style="background:#1976d2; color:#fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold;">
      Sign in to view my tips
    </a>
  </div>
  <p style="color:#888; font-size:12px;">If you didn't request this, you can ignore this email.</p>
  <p style="color:#bbb; font-size:11px;">Powered by Gratify</p>
</body>
</html>` },
        Text: { Data: `Hi ${employeeName},\n\nUse this link to sign in (expires in 15 minutes):\n${link}\n\nIf you didn't request this, ignore this email.` },
      },
    },
  }));
}

function buildPlainText(d: TipEmailData, loginUrl: string): string {
  return `${d.restaurantName} — Tip Summary for ${d.entryDate}

Hi ${d.employeeName},

Role(s): ${d.roles.map(formatRole).join(', ') || '—'}
Hours worked: ${d.hours.toFixed(1)}
Tips earned: $${d.finalTips.toFixed(2)}
Total pay (wages + tips): $${d.totalPay.toFixed(2)}
Effective hourly rate: $${d.effectiveHourlyRate.toFixed(2)}/hr

View your tip history: ${loginUrl}

This is an automated message from your tip management system.`;
}
