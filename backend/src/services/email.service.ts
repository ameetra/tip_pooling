import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_EMAIL = process.env.FROM_EMAIL || 'ameet.rawal1@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'Tip Pooling';

export interface TipEmailData {
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

export async function sendTipEmail(data: TipEmailData): Promise<void> {
  const subject = `Your tips for ${data.entryDate} — ${data.restaurantName}`;
  const body = buildEmailBody(data);

  await ses.send(new SendEmailCommand({
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: { ToAddresses: [data.employeeEmail] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body }, Text: { Data: buildPlainText(data) } },
    },
  }));
}

function buildEmailBody(d: TipEmailData): string {
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
  <p style="color:#888; font-size:12px;">This is an automated message from your tip management system.</p>
</body>
</html>`;
}

function buildPlainText(d: TipEmailData): string {
  return `${d.restaurantName} — Tip Summary for ${d.entryDate}

Hi ${d.employeeName},

Shift(s): ${d.shifts.join(', ') || '—'}
Hours worked: ${d.hours.toFixed(1)}
Tips earned: $${d.finalTips.toFixed(2)}
Total pay (wages + tips): $${d.totalPay.toFixed(2)}
Effective hourly rate: $${d.effectiveHourlyRate.toFixed(2)}/hr

This is an automated message from your tip management system.`;
}
