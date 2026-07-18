import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

// Paleta mais suave e minimalista
export const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  colors: {
    brand: {
      50: '#f7f5f7',
      100: '#e9e3e9',
      200: '#d7ccd6',
      300: '#c1b1c0',
      400: '#a791a6',
      500: '#8c708b', // brand base, more muted/minimalist
      600: '#705a6f',
      700: '#554454',
      800: '#3a2d39',
      900: '#1f181f',
    },
    surface: {
      light: '#ffffff',
      dark: '#1e1e1e', // slightly lighter than pure black for dark mode
    },
    background: {
      light: '#fcfcfc',
      dark: '#121212',
    }
  },
  styles: {
    global: (props: any) => ({
      'html, body, #root': { height: '100%' },
      body: { 
        bg: props.colorMode === 'dark' ? 'background.dark' : 'background.light', 
        color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
        transitionProperty: 'background-color',
        transitionDuration: 'normal',
      },
    }),
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'full', // Mais arredondado e moderno
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: { 
          borderRadius: '2xl', // Bordas mais arredondadas
          boxShadow: props.colorMode === 'dark' ? '0 4px 6px rgba(0,0,0,0.3)' : '0 10px 30px -10px rgba(0,0,0,0.05)', // Sombras bem difusas
          bg: props.colorMode === 'dark' ? 'surface.dark' : 'surface.light',
          borderWidth: '1px',
          borderColor: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.50',
        },
      }),
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: (props: any) => ({
          field: {
            borderRadius: 'xl',
            bg: props.colorMode === 'dark' ? 'whiteAlpha.50' : 'blackAlpha.50',
            border: 'none',
            _hover: {
              bg: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.100',
            },
            _focus: {
              bg: props.colorMode === 'dark' ? 'surface.dark' : 'surface.light',
              borderWidth: '1px',
              borderColor: 'brand.500',
            }
          }
        })
      }
    }
  },
});
