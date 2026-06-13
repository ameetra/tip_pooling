import { Box, Typography } from '@mui/material';

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 2, textAlign: 'center' }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>Gratify</Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>Fair tip distribution, every shift.</Typography>
      <Typography color="text.secondary">Use the link your establishment gave you to sign in.</Typography>
    </Box>
  );
}
