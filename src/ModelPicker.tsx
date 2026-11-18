import { useEffect, useState } from 'react';
import type { Model } from './api';
import { ICheck, IChevron, ISearch } from './icons';

export function ModelPicker(props: { models: Model[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  const cur = props.models.find((m) => m.id === props.value);
  const f = (m: Model) => !q || (m.name + ' ' + (m.description || '')).toLowerCase().includes(q.toLowerCase());
  const agents = props.models.filter((m) => m.isAgent && f(m));
  const bases = props.models.filter((m) => !m.isAgent && f(m));

  const Item = ({ m }: { m: Model }) => (
    <button
      className={`model-item ${m.id === props.value ? 'on' : ''}`}
      onClick={() => {
        props.onChange(m.id);
        setOpen(false);
        setQ('');
      }}
    >
      {m.image ? <img src={m.image} alt="" /> : <span className="dot big" />}
      <span className="grow">
        <span className="name">{m.name}</span>
        {m.description && <span className="desc">{m.description}</span>}
      </span>
      {m.id === props.value && <ICheck size={16} />}
    </button>
  );

  return (
    <div className="picker">
      <button className="picker-btn" onClick={() => setOpen(!open)}>
        <span className="picker-name">{cur?.name || 'Choisir un agent'}</span>
        <IChevron size={16} />
      </button>
      {open && (
        <>
          <div className="scrim show light" onClick={() => setOpen(false)} />
          <div className="sheet">
            <div className="search">
              <ISearch size={16} />
              <input autoFocus placeholder="Chercher un agent" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="sheet-list">
              {!!agents.length && <div className="group">Agents</div>}
              {agents.map((m) => <Item key={m.id} m={m} />)}
              {!!bases.length && <div className="group">Modèles</div>}
              {bases.map((m) => <Item key={m.id} m={m} />)}
              {!agents.length && !bases.length && <p className="muted tiny pad">Aucun résultat.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
