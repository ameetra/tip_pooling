import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import VenueBrand from './VenueBrand';

export default function EmployeeLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { slug } = useTenant();

  return (
    <Box>
      <AppBar position="fixed">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <VenueBrand variant="header" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && <Typography variant="body2" sx={{ opacity: 0.8 }}>{user.email}</Typography>}
            <Tooltip title="Sign out">
              <IconButton color="inherit" onClick={() => { logout(); navigate(`/${slug}/login`); }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ pt: 10, px: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
