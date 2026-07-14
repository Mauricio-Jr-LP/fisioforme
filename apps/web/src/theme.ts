import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

// Paleta principal — #af77ac
export const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  colors: {
    brand: {
      50: '#f9f1f8',
      100: '#edd8eb',
      200: '#e1bede',
      300: '#d5a5d1',
      400: '#c88bc4',
      500: '#af77ac', // brand base
      600: '#8c5f89',
      700: '#694767',
      800: '#462f45',
      900: '#231822',
    },
  },
  styles: {
    global: (props: any) => ({
      'html, body, #root': { height: '100%' },
      body: { 
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50', 
        color: props.colorMode === 'dark' ? 'white' : 'gray.800' 
      },
    }),
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: { 
          borderRadius: 'xl', 
          boxShadow: 'sm',
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        },
      }),
    },
  },
});
