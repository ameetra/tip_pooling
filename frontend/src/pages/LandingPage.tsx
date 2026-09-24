import { Box, Card, CardMedia, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import MailLockIcon from '@mui/icons-material/MailLock';
import HistoryIcon from '@mui/icons-material/History';

const screenshots = [
  { src: '/landing/tip-entries.png', alt: 'Tip entries list showing published daily entries', caption: 'Track every day’s entries, published or draft' },
  { src: '/landing/payroll-report.png', alt: 'Payroll report totaling tips per employee', caption: 'Payroll-ready totals for any date range' },
  { src: '/landing/employees.png', alt: 'Employee list with per-role hourly rates', caption: 'Per-role rates for staff who wear more than one hat' },
];

const features = [
  { icon: GroupsIcon, text: 'Multi-tenant — each establishment’s data is fully isolated' },
  { icon: MailLockIcon, text: 'Password sign-in for staff, passwordless magic-link for employees' },
  { icon: HistoryIcon, text: 'Full audit trail of every change, for compliance' },
];

export default function LandingPage() {
  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, pt: 8, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>Gratify</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>Fair tip distribution, every shift.</Typography>
      </Box>

      <Box sx={{ maxWidth: 760, mx: 'auto', p: 2, pt: 6, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>See it in action</Typography>
        <Card elevation={3} sx={{ overflow: 'hidden' }}>
          <CardMedia component="img" image="/landing/tip-preview.gif" alt="Filling in a tip entry and previewing the calculated distribution live" />
        </Card>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Pool tips, add staff and hours, and preview the payout instantly — before you save.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', p: 2, pt: 6 }}>
        <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {screenshots.map((s) => (
            <Card key={s.src} elevation={2} sx={{ width: 320, overflow: 'hidden' }}>
              <CardMedia component="img" image={s.src} alt={s.alt} />
              <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>{s.caption}</Typography>
            </Card>
          ))}
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 640, mx: 'auto', p: 2, pt: 6, pb: 8 }}>
        <Stack spacing={2}>
          {features.map(({ icon: Icon, text }) => (
            <Stack key={text} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Icon color="primary" />
              <Typography color="text.secondary">{text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ px: 2, pb: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Use the link your establishment gave you to sign in.</Typography>
      </Box>
    </Box>
  );
}
