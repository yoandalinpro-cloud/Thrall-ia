import { useMemo, useState } from 'react';
import type { ChatSummary } from './api';
import { Crest, IGear, INew, IPin, ISearch, ITrash, IEdit, IClose } from './icons';
import type { Theme } from './storage';

function group(ts: number) {
  const d = new Date(ts * 1000);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return '7 derniers jours';
  if (days < 30) return '30 derniers jours';
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function Sidebar(props: {
  open: boolean;
  theme: Theme;
  chats: ChatSummary[];
  currentId: string | null;
  userName: string;
  onClose: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onSettings: () => void;
  onSearch: (q: string) => void;
}) {
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<string | null>(null);

  const groups = useMemo(() => {
    const out: [string, ChatSummary[]][] = [];
    const pinned = props.chats.filter((c) => c.pinned);
    if (pinned.length) out.push(['Épinglées', pinned]);
    for (const c of props.chats.filter((c) => !c.pinned)) {
      const g = group(c.updated_at);
      const last = out[out.length - 1];
      if (last && last[0] === g) last[1].push(c);
      else out.push([g, [c]]);
    }
    return out;
  }, [props.chats]);

  return (
    <>
      <div className={`scrim ${props.open ? 'show' : ''}`} onClick={props.onClose} />
      <aside className={`sidebar ${props.open ? 'open' : ''}`}>
        <div className="side-top">
          <div className="brand">
            <Crest theme={props.theme} />
            <span>Thrall</span>
          </div>
          <button className="icon" onClick={props.onNew} title="Nouvelle conversation">
            <INew />
          </button>
        </div>

        <div className="search">
          <ISearch size={16} />
          <input
            placeholder="Rechercher"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              props.onSearch(e.target.value);
            }}
          />
          {q && (
            <button className="icon small" onClick={() => { setQ(''); props.onSearch(''); }}>
              <IClose size={14} />
            </button>
          )}
        </div>

        <nav className="chat-list">
          {groups.map(([g, list]) => (
            <div key={g}>
              <div className="group">{g}</div>
              {list.map((c) => (
                <div key={c.id} className={`chat-item ${c.id === props.currentId ? 'active' : ''}`}>
                  <button className="chat-title" onClick={() => props.onOpen(c.id)} title={c.title}>
                    {c.title || 'Sans titre'}
                  </button>
                  <button className="icon small more" onClick={() => setMenu(menu === c.id ? null : c.id)} aria-label="Options">
                    ⋯
                  </button>
                  {menu === c.id && (
                    <div className="popover" onMouseLeave={() => setMenu(null)}>
                      <button onClick={() => { setMenu(null); props.onPin(c.id); }}>
                        <IPin size={16} /> {c.pinned ? 'Désépingler' : 'Épingler'}
                      </button>
                      <button
                        onClick={() => {
                          setMenu(null);
                          const t = prompt('Nouveau titre', c.title);
                          if (t && t.trim()) props.onRename(c.id, t.trim());
                        }}
                      >
                        <IEdit size={16} /> Renommer
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          setMenu(null);
                          if (confirm('Supprimer cette conversation ?')) props.onDelete(c.id);
                        }}
                      >
                        <ITrash size={16} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {!props.chats.length && <p className="muted tiny pad">Aucune conversation pour l'instant.</p>}
        </nav>

        <button className="side-user" onClick={props.onSettings}>
          <span className="avatar">{props.userName.slice(0, 1).toUpperCase() || '?'}</span>
          <span className="grow">{props.userName}</span>
          <IGear size={18} />
        </button>
      </aside>
    </>
  );
}
