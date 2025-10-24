import { createTheme, ThemeOptions } from '@mui/material/styles';
import { arEG, enUS } from '@mui/material/locale';

export type CreateAppThemeOptions = {
  mode?: 'light' | 'dark';
  dir?: 'ltr' | 'rtl';
  locale?: 'ar' | 'en' | string;
};

export function createAppTheme({ mode = 'light', dir = 'rtl', locale = 'ar' }: CreateAppThemeOptions = {}) {
  const isArabic = locale?.startsWith('ar');

  const base: ThemeOptions = {
    direction: dir,
    palette: {
      mode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#9c27b0',
      },
      error: {
        main: '#d32f2f',
      },
      success: {
        main: '#2e7d32',
      },
      warning: {
        main: '#ed6c02',
      },
      info: {
        main: '#0288d1',
      },
      background: mode === 'dark'
        ? { default: '#0a0a0a', paper: '#111111' }
        : { default: '#ffffff', paper: '#ffffff' },
    },
    shape: {
      borderRadius: 10,
    },
    spacing: 8,
    typography: {
      fontFamily: "var(--font-arabic), var(--font-arabic-2), system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'",
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
      // Increase default font size slightly for cashier-friendly UI
      fontSize: 14,
    },
    components: {
      MuiButton: {
        defaultProps: {
          size: 'medium',
          variant: 'contained',
        },
      },
      MuiIconButton: {
        defaultProps: {
          size: 'medium',
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
          fullWidth: false,
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiFormControl: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiDialog: {
        defaultProps: {
          fullWidth: true,
          maxWidth: 'sm',
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // Use logical properties to play nice with RTL
            paddingInline: 0,
            margin: 0,
          },
        },
      },
    },
  };

  const localePkg = isArabic ? arEG : enUS;
  return createTheme(base, localePkg);
}
