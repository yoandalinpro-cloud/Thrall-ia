import { useEffect, useRef, useState } from 'react';
import type { Attachment, Model, Msg } from './api';
import { Markdown } from './Markdown';
import { IBrain, ICheck, IChevron, IClip, IClose, ICopy, IEdit, IFile, IGlobe, IMic, IRefresh, ISend, IStop } from './icons';

// ---------- un message ----------
export function MessageView(props: {
  msg: Msg;
  model?: Model;
  streaming: boolean;
  isLast: boolean;
  showThinking: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
}) {
  const { msg } = props;
  const [copied, setCopied] = useState(false);
  const [thinkOpen, setThinkOpen] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="msg user">
        {!!msg.attachments?.length && <AttachmentRow items={msg.attachments} />}
        {msg.content && <div className="bubble">{msg.content}</div>}
        {props.onEdit && !props.streaming && (
          <div className="msg-actions right">
            <button className="icon small" onClick={props.onEdit} title="Modifier">
              <IEdit size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  const thinkingLive = props.streaming && props.isLast && !msg.content;
  return (
    <div className="msg assistant">
      <div className="who">
        {props.model?.image ? <img src={props.model.image} alt="" /> : <span className="dot" />}
        <span>{props.model?.name || msg.model}</span>
        {msg.webSearch && <span className="chip"><IGlobe size={12} /> web</span>}
      </div>

      {props.showThinking && msg.reasoning && (
        <div className={`think ${thinkOpen || thinkingLive ? 'open' : ''}`}>
          <button className="think-head" onClick={() => setThinkOpen(!thinkOpen)}>
            <IBrain size={15} /> {thinkingLive ? 'Réflexion en cours…' : 'Réflexion'}
            <IChevron size={14} />
          </button>
          {(thinkOpen || thinkingLive) && <div className="think-body">{msg.reasoning}</div>}
        </div>
      )}

      {msg.content ? (
        <Markdown text={msg.content} />
      ) : props.streaming && props.isLast && !msg.reasoning ? (
        <div className="typing"><span /><span /><span /></div>
      ) : null}
      {props.streaming && props.isLast && msg.content && <span className="caret" />}

      {msg.error && <div className="error">⚠ {msg.error}</div>}

      {!(props.streaming && props.isLast) && (
        <div className="msg-actions">
          <button
            className="icon small"
            title="Copier"
            onClick={async () => {
              await navigator.clipboard.writeText(msg.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <ICheck size={15} /> : <ICopy size={15} />}
          </button>
          {props.isLast && props.onRegenerate && (
            <button className="icon small" title="Régénérer" onClick={props.onRegenerate}>
              <IRefresh size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentRow({ items, onRemove }: { items: Attachment[]; onRemove?: (i: number) => void }) {
  return (
    <div className="attach-row">
      {items.map((a, i) => (
        <div key={i} className={`attach ${a.kind}`}>
          {a.kind === 'image' ? <img src={a.dataUrl} alt={a.name} /> : (<><IFile size={16} /><span>{a.name}</span></>)}
          {a.kind === 'file' && !a.fileId && onRemove && <span className="tiny muted">envoi…</span>}
          {onRemove && (
            <button className="x" onClick={() => onRemove(i)} aria-label="Retirer">
              <IClose size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- zone de saisie ----------
export function Composer(props: {
  streaming: boolean;
  webSearch: boolean;
  sendOnEnter: boolean;
  draft: string;
  setDraft: (s: string) => void;
  onToggleWeb: () => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  uploadFile: (f: File) => Promise<string>;
  transcribe: (b: Blob) => Promise<string>;
  visionOk: boolean;
}) {
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busyVoice, setBusyVoice] = useState(false);
  const [note, setNote] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [props.draft]);

  const uploading = atts.some((a) => a.kind === 'file' && !a.fileId);
  const canSend = !props.streaming && !uploading && (props.draft.trim() || atts.length);

  const send = () => {
    if (!canSend) return;
    props.onSend(props.draft.trim(), atts);
    props.setDraft('');
    setAtts([]);
    setNote('');
  };

  const addFiles = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        const dataUrl = await shrinkImage(f);
        setAtts((a) => [...a, { kind: 'image', name: f.name, dataUrl }]);
        if (!props.visionOk) setNote("Ce modèle ne voit pas les images : choisis un modèle avec la vision (ex. qwen2.5vl) pour qu'il les analyse.");
      } else {
        const tmp: Attachment = { kind: 'file', name: f.name, size: f.size };
        setAtts((a) => [...a, tmp]);
        try {
          const id = await props.uploadFile(f);
          setAtts((a) => a.map((x) => (x === tmp ? { ...x, fileId: id } : x)));
        } catch (e: any) {
          setAtts((a) => a.filter((x) => x !== tmp));
          setNote(`Envoi de ${f.name} impossible : ${e?.message || e}`);
        }
      }
    }
  };

  const toggleMic = async () => {
    if (rec) {
      rec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        setBusyVoice(true);
        try {
          const text = await props.transcribe(new Blob(chunks, { type: r.mimeType }));
          if (text) props.setDraft(props.draft ? props.draft + ' ' + text : text);
        } catch (e: any) {
          setNote(`Dictée impossible (${e?.message || e}). Astuce : utilise le micro du clavier.`);
        } finally {
          setBusyVoice(false);
        }
      };
      r.start();
      setRec(r);
    } catch {
      setNote("Micro refusé. Autorise-le dans les réglages de l'appareil, ou utilise le micro du clavier.");
    }
  };

  return (
    <div
      className="composer-wrap"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {note && (
        <div className="note" onClick={() => setNote('')}>
          {note}
        </div>
      )}
      <div className="composer">
        {!!atts.length && <AttachmentRow items={atts} onRemove={(i) => setAtts((a) => a.filter((_, j) => j !== i))} />}
        <textarea
          ref={ta}
          rows={1}
          placeholder={rec ? 'Je t’écoute… (touche le micro pour finir)' : busyVoice ? 'Transcription…' : 'Écris à Thrall…'}
          value={props.draft}
          onChange={(e) => props.setDraft(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && props.sendOnEnter && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="composer-bar">
          <input ref={fileIn} type="file" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
          <button className="icon" onClick={() => fileIn.current?.click()} title="Joindre des photos ou fichiers">
            <IClip />
          </button>
          <button className={`pill ${props.webSearch ? 'on' : ''}`} onClick={props.onToggleWeb} title="Recherche web">
            <IGlobe size={16} /> Recherche
          </button>
          <span className="grow" />
          <button className={`icon ${rec ? 'rec' : ''}`} onClick={toggleMic} disabled={busyVoice} title="Dictée">
            <IMic />
          </button>
          {props.streaming ? (
            <button className="send stop" onClick={props.onStop} title="Arrêter">
              <IStop size={18} />
            </button>
          ) : (
            <button className="send" onClick={send} disabled={!canSend} title="Envoyer">
              <ISend size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Réduit les photos (iPhone = 12 Mpx) avant envoi : max 1600 px, JPEG 85 %. */
async function shrinkImage(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
