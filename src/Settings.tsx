import { IClose, ILogout } from './icons';
import { platform, type Prefs } from './storage';

export function Settings(props: {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  userName: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  const p = props.prefs;
  const set = (patch: Partial<Prefs>) => props.setPrefs({ ...p, ...patch });
  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Réglages</h2>
          <button className="icon" onClick={props.onClose}>
            <IClose />
          </button>
        </div>

        <h3>Faction</h3>
        <div className="factions">
          <button className={`faction horde ${p.theme === 'horde' ? 'on' : ''}`} onClick={() => set({ theme: 'horde' })}>
            <span>⚔ Horde</span>
            <small>Lave et acier</small>
          </button>
          <button className={`faction alliance ${p.theme === 'alliance' ? 'on' : ''}`} onClick={() => set({ theme: 'alliance' })}>
            <span>⚔ Alliance</span>
            <small>Aurore et arcane</small>
          </button>
        </div>

        <h3>Conversation</h3>
        <label className="row">
          <span>Afficher la réflexion du modèle</span>
          <input type="checkbox" checked={p.showThinking} onChange={(e) => set({ showThinking: e.target.checked })} />
        </label>
        <label className="row">
          <span>Entrée envoie le message</span>
          <input type="checkbox" checked={p.sendOnEnter} onChange={(e) => set({ sendOnEnter: e.target.checked })} />
        </label>
        <label className="row">
          <span>Recherche web activée par défaut</span>
          <input type="checkbox" checked={p.webSearch} onChange={(e) => set({ webSearch: e.target.checked })} />
        </label>

        <h3>Compte</h3>
        <div className="row">
          <span>Serveur</span>
          <span className="muted tiny">{p.server}</span>
        </div>
        <div className="row">
          <span>Connecté en tant que</span>
          <span className="muted">{props.userName}</span>
        </div>
        <button className="danger-btn" onClick={props.onLogout}>
          <ILogout size={16} /> Se déconnecter
        </button>

        <p className="muted tiny center">
          Thrall {__APP_VERSION__} · {platform === 'windows' ? 'Windows' : platform === 'ios' ? 'iPhone' : 'Web'}
        </p>
      </div>
    </div>
  );
}
