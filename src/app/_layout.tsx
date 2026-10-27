import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { UI } from '@/constants/ui';

const tema = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: UI.primario,
    background: UI.fondo,
    card: UI.tarjeta,
    text: UI.texto,
    border: UI.borde,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={tema}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: UI.fondo },
        }}
      />
    </ThemeProvider>
  );
}
