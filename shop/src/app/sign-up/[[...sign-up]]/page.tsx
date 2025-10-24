"use client";
import { SignUp } from "@clerk/nextjs";
import { Box } from '@mui/material';

export default function SignUpPage() {
  return (
    <Box component="main" dir="rtl" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <SignUp appearance={{ elements: { card: 'shadow-lg', formButtonPrimary: 'bg-black hover:bg-gray-900' } }}
              redirectUrl="/" />
    </Box>
  );
}
