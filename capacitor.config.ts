import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.thrall.app',
  appName: 'Thrall',
  webDir: 'dist',
  backgroundColor: '#110605',
  ios: {
    contentInset: 'never',
    scheme: 'Thrall',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
};

export default config;
