import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { isNative, platform } from './storage';
import 'highlight.js/styles/github-dark.css';
import './styles.css';

declare global {
  const __APP_VERSION__: string;
}

if (isNative) {
  // iPhone : barre d'état claire sur fond sombre, clavier qui redimensionne la vue
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Dark }).catch(() => {}));
  document.documentElement.classList.add('native-ios');
}

if (platform === 'web' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
