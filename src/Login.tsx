import { useState } from 'react';
import { OpenWebUI } from './api';
import { Crest } from './icons';
import type { Theme } from './storage';

export function Login(props: {
  server: string;
  theme: Theme;
  onDone: (server: string, token: string) => void;
}) {
  const [server, setServer] = useState(props.server);
  const [mode, setMode] = useState<'password' | 'key'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const base = server.trim().replace(/\/+$/, '');
    try {
      let token: string;
      if (mode === 'password') {
        token = (await OpenWebUI.signin(base, email.trim(), password)).token;
      } else {
        token = key.trim();
      }
      await new OpenWebUI(base, token).me(); // vérifie que ça marche
      props.onDone(base, token);
    } catch (e: any) {
      setErr(
        e?.message === 'Failed to fetch' || e?.name === 'TypeError'
          ? "Serveur injoignable. Vérifie l'adresse, ta connexion (ou le VPN)."
          : e?.message || String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-crest">
          <Crest theme={props.theme} size={64} />
        </div>
        <h1>Thrall</h1>
        <p className="muted">Connexion à ton Open WebUI</p>

        <label>
          Adresse du serveur
          <input value={server} onChange={(e) => setServer(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" required />
        </label>

        <div className="seg">
          <button type="button" className={mode === 'password' ? 'on' : ''} onClick={() => setMode('password')}>
            E-mail
          </button>
          <button type="button" className={mode === 'key' ? 'on' : ''} onClick={() => setMode('key')}>
            Clé API
          </button>
        </div>

        {mode === 'password' ? (
          <>
            <label>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="off" required />
            </label>
            <label>
              Mot de passe
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
          </>
        ) : (
          <label>
            Clé API (Open WebUI › Réglages › Compte)
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoCapitalize="off" required />
          </label>
        )}

        {err && <div className="error">{err}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="muted tiny">Le jeton est gardé dans le coffre sécurisé de l'appareil, jamais ailleurs.</p>
      </form>
    </div>
  );
}
