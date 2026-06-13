import { Box, Typography } from '@mui/material';
import { useTenant } from '../context/TenantContext';

// `login` = stacked on a light card; `header` = inline on the colored AppBar.
export default function VenueBrand({ variant = 'login' }: { variant?: 'login' | 'header' }) {
  const { name, logoUrl } = useTenant();
  const header = variant === 'header';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ...(header ? {} : { mb: 2 }) }}>
      {logoUrl && (
        <Box component="img" src={logoUrl} alt={name}
          sx={{ height: header ? 32 : 44, maxWidth: header ? 160 : 220, objectFit: 'contain' }} />
      )}
      <Typography variant={header ? 'h6' : 'h5'} noWrap sx={{ fontWeight: 600 }}>
        {name || 'Gratify'}
      </Typography>
    </Box>
  );
}
