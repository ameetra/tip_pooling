import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CircularProgress, Stack, Typography } from '@mui/material';
import { get } from '../api/client';

interface Venue { slug: string; name: string; logoUrl: string | null; }

export default function VenuePickerPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[] | null>(null);

  useEffect(() => {
    get<Venue[]>('/tenants').then(setVenues).catch(() => setVenues([]));
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Gratify</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Choose your establishment</Typography>

      {venues === null ? (
        <CircularProgress />
      ) : venues.length === 0 ? (
        <Typography color="text.secondary">No establishments found.</Typography>
      ) : (
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 420 }}>
          {venues.map((v) => (
            <Card key={v.slug} variant="outlined">
              <CardActionArea onClick={() => navigate(`/${v.slug}/manager-login`)} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-start' }}>
                {v.logoUrl && <Box component="img" src={v.logoUrl} alt={v.name} sx={{ height: 36, maxWidth: 140, objectFit: 'contain' }} />}
                <Typography variant="h6">{v.name}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
