import { Box } from '@mui/material';
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ p: 2 }} dir="rtl">
      {children}
    </Box>
  );
}

