import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, IconButton, Tooltip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import VenueBrand from './VenueBrand';

const DRAWER_WIDTH = 220;

const managerNavItems = [
  { label: 'Tips', path: '/tips', icon: <ReceiptIcon /> },
  { label: 'Employees', path: '/employees', icon: <PeopleIcon /> },
  { label: 'Config', path: '/config', icon: <SettingsIcon /> },
  { label: 'Staff', path: '/users', icon: <AdminPanelSettingsIcon /> },
];

const shiftLeadNavItems = [
  { label: 'New Tip Entry', path: '/tips/new', icon: <ReceiptIcon /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const { slug } = useTenant();
  const navItems = user?.role === 'SHIFT_LEAD' ? shiftLeadNavItems : managerNavItems;
  const to = (path: string) => `/${slug}${path}`;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <VenueBrand variant="header" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && (
              <>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>{user.email}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, textTransform: 'capitalize', bgcolor: 'rgba(255,255,255,0.15)', px: 1, py: 0.25, borderRadius: 1 }}>
                  {user.role.toLowerCase()}
                </Typography>
              </>
            )}
            <Tooltip title="Sign out">
              <IconButton color="inherit" onClick={() => { logout(); navigate(`/${slug}/manager-login`); }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}>
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton key={item.path} selected={pathname.startsWith(to(item.path))} onClick={() => navigate(to(item.path))}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0, overflow: 'auto' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
