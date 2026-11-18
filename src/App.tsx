import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthError, OpenWebUI, splitReasoning, uid, type Attachment, type ChatSummary, type Model, type Msg } from './api';
import { Composer, MessageView } from './Chat';
import { Crest, IMenu, INew } from './icons';
import { Login } from './Login';
import { ModelPicker } from './ModelPicker';
import { Settings } from './Settings';
import { Sidebar } from './Sidebar';
import { loadPrefs, savePrefs, secretGet, secretSet, type Prefs } from './storage';

const SUGGESTIONS = [
  'Quelles sont les nouvelles du jour dans le jeu vidéo ?',
  'Explique-moi simplement comment marche un VPN.',
  'Aide-moi à écrire un script bash de sauvegarde.',
  'Propose-moi un plan de sécurité pour mon homelab.',
];

export default function App() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const setPrefs = useCallback((p: Prefs) => {
    setPrefsState(p);
    savePrefs(p);
  }, []);

  const [api, setApi] = useState<OpenWebUI | null>(null);
  const [booting, setBooting] = useState(true);
  const [userName, setUserName] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [model, setModel] = useState(prefs.model);
  const [webSearch, setWebSearch] = useState(prefs.webSearch);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [sideOpen, setSideOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [banner, setBanner] = useState('');
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', prefs.theme === 'horde' ? '#120606' : '#0b0d1e');
  }, [prefs.theme]);

  // ---- démarrage : jeton enregistré ? ----
  useEffect(() => {
    (async () => {
      const token = await secretGet('token');
      if (token) {
        const a = new OpenWebUI(prefs.server, token);
        try {
          const me = await a.me();
          setUserName(me.name);
          setApi(a);
        } catch (e) {
          if (e instanceof AuthError) await secretSet('token', null);
          else {
            // serveur injoignable : on ouvre quand même, avec un bandeau
            setApi(a);
            setBanner('Serveur injoignable. Vérifie ta connexion ou le VPN.');
          }
        }
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleErr = useCallback(async (e: any) => {
    if (e instanceof AuthError) {
      await secretSet('token', null);
      setApi(null);
      return;
    }
    setBanner(e?.message === 'Failed to fetch' ? 'Serveur injoignable. Vérifie ta connexion ou le VPN.' : e?.message || String(e));
  }, []);

  const refreshChats = useCallback(async () => {
    if (!api) return;
    try {
      setChats(await api.listChats());
    } catch (e) {
      handleErr(e);
    }
  }, [api, handleErr]);

  useEffect(() => {
    if (!api) return;
    (async () => {
      try {
        const ms = await api.models();
        setModels(ms);
        setBanner('');
        if (!ms.find((m) => m.id === model)) {
          const def = ms.find((m) => /thrall/i.test(m.id + m.name)) || ms[0];
          if (def) setModel(def.id);
        }
      } catch (e) {
        handleErr(e);
      }
      refreshChats();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (model && model !== prefs.model) setPrefs({ ...prefs, model });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // défilement automatique tant qu'on est en bas
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const newChat = () => {
    abort.current?.abort();
    setChatId(null);
    setTitle('');
    setMessages([]);
    setDraft('');
    setSideOpen(false);
    setWebSearch(prefs.webSearch);
  };

  const openChat = async (id: string) => {
    if (!api) return;
    abort.current?.abort();
    setSideOpen(false);
    try {
      const c = await api.getChat(id);
      setChatId(c.id);
      setTitle(c.title);
      setMessages(c.messages);
      if (c.model && models.find((m) => m.id === c.model)) setModel(c.model);
      stick.current = true;
    } catch (e) {
      handleErr(e);
    }
  };

  // ---- envoi + streaming ----
  const run = async (history: Msg[], currentChatId: string | null, currentTitle: string) => {
    if (!api || !model) return;
    const lastUser = history[history.length - 1];
    const answer: Msg = { id: uid(), parentId: lastUser.id, role: 'assistant', content: '', model, timestamp: Date.now(), webSearch };
    let all = [...history, answer];
    setMessages(all);
    setStreaming(true);
    stick.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;

    let raw = '';
    let reasoning = '';
    let pending = false;
    const flush = () => {
      pending = false;
      const s = splitReasoning(raw);
      const r = (reasoning + (s.reasoning ? (reasoning ? '\n' : '') + s.reasoning : '')) || undefined;
      all = all.map((m) => (m.id === answer.id ? { ...m, content: s.content, reasoning: r } : m));
      setMessages(all);
    };
    try {
      const ctx = history.map((m) => (m.role === 'assistant' ? { ...m, reasoning: undefined } : m));
      for await (const d of api.stream(model, ctx, { webSearch, signal: ctrl.signal })) {
        if (d.content) raw += d.content;
        if (d.reasoning) reasoning += d.reasoning;
        if (!pending) {
          pending = true;
          requestAnimationFrame(flush);
        }
      }
      flush();
    } catch (e: any) {
      flush();
      if (e?.name !== 'AbortError') {
        if (e instanceof AuthError) return handleErr(e);
        const msg = e?.message === 'Failed to fetch' ? 'Serveur injoignable.' : e?.message || String(e);
        all = all.map((m) => (m.id === answer.id ? { ...m, error: msg } : m));
        setMessages(all);
      }
    } finally {
      setStreaming(false);
      abort.current = null;
    }

    // sauvegarde dans Open WebUI (visible aussi sur le site et les autres appareils)
    try {
      const t = currentTitle || makeTitle(history[0]?.content || 'Nouvelle conversation');
      const id = await api.saveChat(currentChatId, t, model, all);
      setChatId(id);
      setTitle(t);
      refreshChats();
    } catch (e) {
      handleErr(e);
    }
  };

  const send = (text: string, attachments: Attachment[]) => {
    const last = messages[messages.length - 1];
    const user: Msg = {
      id: uid(),
      parentId: last?.id ?? null,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length ? attachments : undefined,
    };
    run([...messages, user], chatId, title);
  };

  const regenerate = () => {
    const idx = messages.map((m) => m.role).lastIndexOf('user');
    if (idx < 0) return;
    run(messages.slice(0, idx + 1), chatId, title);
  };

  const editLastUser = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx < 0) return;
    setDraft(messages[idx].content);
    setMessages(messages.slice(0, idx));
  };

  const searchTimer = useRef<number>(0);
  const onSearch = (q: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      if (!api) return;
      try {
        setChats(q.trim() ? await api.searchChats(q.trim()) : await api.listChats());
      } catch (e) {
        handleErr(e);
      }
    }, 300);
  };

  const modelMap = useMemo(() => Object.fromEntries(models.map((m) => [m.id, m])), [models]);
  const curModel = modelMap[model];
  const lastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id;

  if (booting) {
    return (
      <div className="splash">
        <Crest theme={prefs.theme} size={72} />
      </div>
    );
  }

  if (!api) {
    return (
      <Login
        server={prefs.server}
        theme={prefs.theme}
        onDone={async (server, token) => {
          await secretSet('token', token);
          setPrefs({ ...prefs, server });
          const a = new OpenWebUI(server, token);
          setUserName((await a.me().catch(() => ({ name: '' }))).name);
          setApi(a);
        }}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        open={sideOpen}
        theme={prefs.theme}
        chats={chats}
        currentId={chatId}
        userName={userName}
        onClose={() => setSideOpen(false)}
        onNew={newChat}
        onOpen={openChat}
        onDelete={async (id) => {
          try {
            await api.deleteChat(id);
            if (id === chatId) newChat();
            refreshChats();
          } catch (e) {
            handleErr(e);
          }
        }}
        onRename={async (id, t) => {
          try {
            await api.renameChat(id, t);
            if (id === chatId) setTitle(t);
            refreshChats();
          } catch (e) {
            handleErr(e);
          }
        }}
        onPin={async (id) => {
          try {
            await api.togglePin(id);
            refreshChats();
          } catch (e) {
            handleErr(e);
          }
        }}
        onSettings={() => {
          setSideOpen(false);
          setShowSettings(true);
        }}
        onSearch={onSearch}
      />

      <main className="main">
        <header className="topbar">
          <button className="icon only-mobile" onClick={() => setSideOpen(true)} aria-label="Menu">
            <IMenu />
          </button>
          <ModelPicker models={models} value={model} onChange={setModel} />
          <span className="grow" />
          <button className="icon only-mobile" onClick={newChat} aria-label="Nouvelle conversation">
            <INew />
          </button>
        </header>

        {banner && (
          <div className="banner" onClick={() => setBanner('')}>
            {banner}
          </div>
        )}

        <div
          className="scroller"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {messages.length === 0 ? (
            <div className="empty">
              <Crest theme={prefs.theme} size={84} />
              <h1>{prefs.theme === 'horde' ? 'Lok’tar ogar' : 'Pour l’Alliance'}{userName ? `, ${userName}` : ''} !</h1>
              <p className="muted">{curModel?.description || 'Que puis-je faire pour toi ?'}</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s, [])}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {messages.map((m, i) => (
                <MessageView
                  key={m.id}
                  msg={m}
                  model={m.model ? modelMap[m.model] : undefined}
                  streaming={streaming}
                  isLast={i === messages.length - 1}
                  showThinking={prefs.showThinking}
                  onRegenerate={regenerate}
                  onEdit={m.id === lastUserId ? () => editLastUser(m.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <Composer
          streaming={streaming}
          webSearch={webSearch}
          sendOnEnter={prefs.sendOnEnter}
          draft={draft}
          setDraft={setDraft}
          onToggleWeb={() => setWebSearch(!webSearch)}
          onSend={send}
          onStop={() => abort.current?.abort()}
          uploadFile={(f) => api.uploadFile(f, f.name)}
          transcribe={(b) => api.transcribe(b)}
          visionOk={!!curModel?.vision}
        />
      </main>

      {showSettings && (
        <Settings
          prefs={prefs}
          setPrefs={setPrefs}
          userName={userName}
          onClose={() => setShowSettings(false)}
          onLogout={async () => {
            await secretSet('token', null);
            setShowSettings(false);
            newChat();
            setApi(null);
          }}
        />
      )}
    </div>
  );
}

function makeTitle(s: string) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? t.slice(0, 46).trimEnd() + '…' : t || 'Nouvelle conversation';
}
