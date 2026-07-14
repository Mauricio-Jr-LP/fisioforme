import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Paleta principal — teal/verde-água (identidade "saúde/movimento")
export const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  colors: {
    brand: {
      50: '#e6fffa',
      100: '#b2f5ea',
      200: '#81e6d9',
      300: '#4fd1c5',
      400: '#2cc3b7',
      500: '#0ba5a5',
      600: '#088585',
      700: '#066666',
      800: '#044747',
      900: '#022b2b',
    },
  },
  styles: {
    global: {
      'html, body, #root': { height: '100%' },
      body: { bg: 'gray.50', color: 'gray.800' },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
    },
    Card: {
      baseStyle: {
        container: { borderRadius: 'xl', boxShadow: 'sm' },
      },
    },
  },
});
