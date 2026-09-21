const mockSend = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn((input) => ({ input })),
}));

import { sendTipEmail, TipEmailData } from '../email.service';

const base: TipEmailData = {
  employeeName: 'Alice', employeeEmail: 'alice@example.test', restaurantName: 'Demo Restaurant', slug: 'demo', logoUrl: null,
  entryDate: '2026-09-22', roles: ['SERVER'], hours: 4, finalTips: 50, totalPay: 110, effectiveHourlyRate: 27.5,
};

const sentMessage = () => mockSend.mock.calls[mockSend.mock.calls.length - 1][0].input;

describe('sendTipEmail', () => {
  beforeEach(() => mockSend.mockClear());

  it('sends from the Gratify sender and shows wages as total pay minus tips', async () => {
    await sendTipEmail(base);
    const { Source, Message } = sentMessage();

    expect(Source).toBe('Gratify <noreply@usegratify.com>');
    expect(Message.Body.Text.Data).toContain('Wages: $60.00');
    expect(Message.Body.Text.Data).toContain('Total pay (wages + tips): $110.00');
    expect(Message.Body.Html.Data).toContain('$60.00');
  });

  it('adds no per-role split for a single-role day', async () => {
    await sendTipEmail({ ...base, roleBreakdown: [{ role: 'Server', hours: 4, tips: 50 }] });
    const { Message } = sentMessage();

    expect(Message.Body.Text.Data).not.toContain('Tips by role');
    expect(Message.Body.Html.Data).not.toContain('Tips by role');
  });

  it('shows where the tips came from when the person worked two roles', async () => {
    await sendTipEmail({
      ...base, roles: ['SERVER', 'BUSSER'], hours: 8, finalTips: 233.33, totalPay: 341.33, effectiveHourlyRate: 42.67,
      roleBreakdown: [{ role: 'Server', hours: 4, tips: 133.33 }, { role: 'Busser', hours: 4, tips: 100 }],
    });
    const { Message } = sentMessage();

    expect(Message.Body.Text.Data).toContain('Tips by role:\n  Server (4.0h): $133.33\n  Busser (4.0h): $100.00');
    expect(Message.Body.Html.Data).toContain('Tips by role');
    expect(Message.Body.Html.Data).toContain('Server · 4.0h');
    expect(Message.Body.Html.Data).toContain('$100.00');
  });
});
