// Renders both emails (tip notification + magic link) to HTML files for preview.
import fs from 'fs';
import path from 'path';

process.env.APP_URL = process.env.APP_URL || 'https://d3vrbd8qbym3pv.cloudfront.net';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Re-implement the build functions (importing email.service.ts would try to init SES client)
const APP_URL = process.env.APP_URL!;

interface TipEmailData {
  employeeName: string;
  employeeEmail: string;
  restaurantName: string;
  entryDate: string;
  shifts: string[];
  hours: number;
  finalTips: number;
  totalPay: number;
  effectiveHourlyRate: number;
}

function buildTipEmail(d: TipEmailData, loginUrl: string): string {
  const shifts = d.shifts.join(', ') || '—';
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1976d2;">${d.restaurantName}</h2>
  <p>Hi ${d.employeeName},</p>
  <p>Here's your tip summary for <strong>${d.entryDate}</strong>:</p>
  <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
    <tr style="background:#f5f5f5;">
      <td style="padding: 8px 12px;">Shift(s)</td>
      <td style="padding: 8px 12px; text-align:right;">${shifts}</td>
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
</body>
</html>`;
}

function buildMagicLinkEmail(employeeName: string, link: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  <p>Hi ${employeeName},</p>
  <p>Click the button below to sign in and view your tip history. This link expires in <strong>15 minutes</strong> and can only be used once.</p>
  <div style="margin: 24px 0;">
    <a href="${link}" style="background:#1976d2; color:#fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold;">
      Sign in to view my tips
    </a>
  </div>
  <p style="color:#888; font-size:12px;">If you didn't request this, you can ignore this email.</p>
</body>
</html>`;
}

const sampleTip: TipEmailData = {
  employeeName: 'Maria Lopez',
  employeeEmail: 'maria.lopez@example.com',
  restaurantName: 'Demo Restaurant',
  entryDate: 'Fri, Jun 5',
  shifts: ['Lunch', 'Dinner'],
  hours: 7.5,
  finalTips: 142.38,
  totalPay: 254.88,
  effectiveHourlyRate: 33.98,
};

const loginUrl = `${APP_URL}/login?email=${encodeURIComponent(sampleTip.employeeEmail)}`;
const verifyUrl = `${APP_URL}/auth/verify?token=sample_token_a1b2c3d4e5f6`;

const outDir = path.resolve(__dirname, '../email-previews');
fs.mkdirSync(outDir, { recursive: true });

const tipPath = path.join(outDir, 'tip-email.html');
const magicPath = path.join(outDir, 'magic-link-email.html');

fs.writeFileSync(tipPath, buildTipEmail(sampleTip, loginUrl));
fs.writeFileSync(magicPath, buildMagicLinkEmail(sampleTip.employeeName, verifyUrl));

console.log('Wrote:');
console.log('  ' + tipPath);
console.log('  ' + magicPath);
console.log('\nOpen them in your browser to preview.');
