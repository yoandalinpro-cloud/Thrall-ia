// Client pour l'API d'Open WebUI (compatible OpenAI).
// Docs : https://docs.openwebui.com/getting-started/api-endpoints

export interface Model {
  id: string;
  name: string;
  description?: string;
  image?: string;
  vision: boolean;
  isAgent: boolean;
}

export interface Attachment {
  kind: 'image' | 'file';
  name: string;
  /** data URL pour les images */
  dataUrl?: string;
  /** id Open WebUI pour les fichiers envoyés */
  fileId?: string;
  size?: number;
}

export interface Msg {
  id: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  model?: string;
  timestamp: number;
  attachments?: Attachment[];
  error?: string;
  webSearch?: boolean;
}

export interface ChatSummary {
  id: string;
  title: string;
  updated_at: number;
  pinned?: boolean;
}

export class AuthError extends Error {}

export function uid() {
  return crypto.randomUUID();
}

export class OpenWebUI {
  constructor(public base: string, public token: string) {
    this.base = base.replace(/\/+$/, '');
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + path, { ...init, headers: { ...headers, ...(init.headers as any) } });
    if (res.status === 401 || res.status === 403) throw new AuthError('Session expirée, reconnecte-toi.');
    if (!res.ok) throw new Error(await errorText(res));
    return res.json();
  }

  static async signin(base: string, email: string, password: string) {
    const url = base.replace(/\/+$/, '') + '/api/v1/auths/signin';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(res.status === 400 || res.status === 401 ? 'E-mail ou mot de passe incorrect.' : await errorText(res));
    const j = await res.json();
    return { token: j.token as string, name: j.name as string };
  }

  me() {
    return this.req<{ name: string; email: string; role: string; profile_image_url?: string }>('/api/v1/auths/');
  }

  async models(): Promise<Model[]> {
    const j = await this.req<{ data: any[] }>('/api/models');
    return (j.data || [])
      .filter((m) => !m?.info?.meta?.hidden && !m?.arena)
      .map((m) => {
        const meta = m.info?.meta || {};
        let img: string | undefined = meta.profile_image_url;
        if (img && img.startsWith('/')) img = this.base + img;
        return {
          id: m.id,
          name: m.name || m.id,
          description: meta.description || undefined,
          image: img,
          vision: !!meta.capabilities?.vision,
          isAgent: !!m.info?.base_model_id || m.pipe != null || m.owned_by === 'arena',
        };
      });
  }

  // ---- historique (synchronisé avec Open WebUI : même liste que sur le site) ----
  async listChats(page = 1): Promise<ChatSummary[]> {
    const j = await this.req<any[]>(`/api/v1/chats/?page=${page}`);
    return j.map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at, pinned: c.pinned }));
  }

  async searchChats(text: string): Promise<ChatSummary[]> {
    const j = await this.req<any[]>(`/api/v1/chats/search?text=${encodeURIComponent(text)}`);
    return j.map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at }));
  }

  async getChat(id: string): Promise<{ id: string; title: string; messages: Msg[]; model: string }> {
    const j = await this.req<any>(`/api/v1/chats/${id}`);
    return { id: j.id, title: j.title, ...fromOwuiChat(j.chat) };
  }

  async saveChat(id: string | null, title: string, model: string, messages: Msg[]): Promise<string> {
    const chat = toOwuiChat(title, model, messages);
    if (!id) {
      const j = await this.req<any>('/api/v1/chats/new', { method: 'POST', body: JSON.stringify({ chat }) });
      return j.id;
    }
    await this.req(`/api/v1/chats/${id}`, { method: 'POST', body: JSON.stringify({ chat }) });
    return id;
  }

  async renameChat(id: string, title: string) {
    await this.req(`/api/v1/chats/${id}`, { method: 'POST', body: JSON.stringify({ chat: { title } }) });
  }

  async deleteChat(id: string) {
    await this.req(`/api/v1/chats/${id}`, { method: 'DELETE' });
  }

  async togglePin(id: string) {
    await this.req(`/api/v1/chats/${id}/pin`, { method: 'POST' });
  }

  // ---- fichiers et voix ----
  async uploadFile(file: File | Blob, name: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file, name);
    const j = await this.req<any>('/api/v1/files/', { method: 'POST', body: fd });
    return j.id;
  }

  async transcribe(audio: Blob): Promise<string> {
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    const fd = new FormData();
    fd.append('file', audio, `dictee.${ext}`);
    const j = await this.req<any>('/api/v1/audio/transcriptions', { method: 'POST', body: fd });
    return (j.text || '').trim();
  }

  // ---- réponse en direct (streaming SSE) ----
  async *stream(
    model: string,
    history: Msg[],
    opts: { webSearch: boolean; signal: AbortSignal },
  ): AsyncGenerator<{ content?: string; reasoning?: string }> {
    const files = history
      .flatMap((m) => m.attachments || [])
      .filter((a) => a.kind === 'file' && a.fileId)
      .map((a) => ({ type: 'file', id: a.fileId }));

    const body: any = {
      model,
      stream: true,
      messages: history.map(toApiMessage),
    };
    if (files.length) body.files = files;
    if (opts.webSearch) body.features = { web_search: true };

    const res = await fetch(this.base + '/api/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (res.status === 401 || res.status === 403) throw new AuthError('Session expirée, reconnecte-toi.');
    if (!res.ok) throw new Error(await errorText(res));

    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('event-stream') || !res.body) {
      const j = await res.json();
      if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
      yield { content: j.choices?.[0]?.message?.content ?? '' };
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        let j: any;
        try {
          j = JSON.parse(data);
        } catch {
          continue;
        }
        if (j.error) throw new Error(j.error.message || j.error.detail || JSON.stringify(j.error));
        const d = j.choices?.[0]?.delta || {};
        const reasoning = d.reasoning_content ?? d.reasoning;
        if (reasoning || d.content) yield { content: d.content || undefined, reasoning: reasoning || undefined };
      }
    }
  }
}

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return j.detail || j.error?.message || j.message || `Erreur ${res.status}`;
  } catch {
    return `Erreur ${res.status} ${res.statusText}`;
  }
}

function toApiMessage(m: Msg) {
  const imgs = (m.attachments || []).filter((a) => a.kind === 'image' && a.dataUrl);
  if (m.role === 'user' && imgs.length) {
    return {
      role: 'user',
      content: [
        { type: 'text', text: m.content },
        ...imgs.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
      ],
    };
  }
  return { role: m.role, content: m.content };
}

// ---- conversion vers / depuis le format de chat d'Open WebUI ----
const THINK_RE = /^\s*<(think|thinking)>([\s\S]*?)<\/\1>\s*/;
const DETAILS_RE = /<details type="reasoning"[^>]*>\s*<summary>[\s\S]*?<\/summary>([\s\S]*?)<\/details>\s*/;

export function splitReasoning(content: string): { reasoning?: string; content: string } {
  let m = content.match(THINK_RE);
  if (m) return { reasoning: m[2].trim(), content: content.slice(m[0].length) };
  m = content.match(DETAILS_RE);
  if (m)
    return {
      reasoning: m[1].replace(/^>\s?/gm, '').trim(),
      content: content.replace(m[0], ''),
    };
  // balise <think> ouverte et pas encore fermée (pendant le streaming)
  const open = content.match(/^\s*<(think|thinking)>([\s\S]*)$/);
  if (open) return { reasoning: open[2], content: '' };
  return { content };
}

function toOwuiChat(title: string, model: string, messages: Msg[]) {
  const map: Record<string, any> = {};
  for (const m of messages) {
    const content = m.reasoning ? `<think>\n${m.reasoning}\n</think>\n\n${m.content}` : m.content;
    map[m.id] = {
      id: m.id,
      parentId: m.parentId,
      childrenIds: messages.filter((c) => c.parentId === m.id).map((c) => c.id),
      role: m.role,
      content,
      timestamp: Math.floor(m.timestamp / 1000),
      ...(m.role === 'user' ? { models: [model] } : { model: m.model || model, done: true }),
      ...(m.attachments?.length
        ? {
            files: m.attachments.map((a) =>
              a.kind === 'image'
                ? { type: 'image', url: a.dataUrl, name: a.name }
                : { type: 'file', id: a.fileId, name: a.name, size: a.size },
            ),
          }
        : {}),
      ...(m.error ? { error: { content: m.error } } : {}),
    };
  }
  const last = messages[messages.length - 1];
  return {
    title,
    models: [model],
    history: { messages: map, currentId: last?.id ?? null },
    messages: messages.map((m) => map[m.id]),
    timestamp: Date.now(),
  };
}

function fromOwuiChat(chat: any): { messages: Msg[]; model: string } {
  const map = chat?.history?.messages || {};
  const out: Msg[] = [];
  let cur: string | null = chat?.history?.currentId ?? null;
  const seen = new Set<string>();
  while (cur && map[cur] && !seen.has(cur)) {
    seen.add(cur);
    const r = map[cur];
    const { reasoning, content } = splitReasoning(r.content || '');
    out.unshift({
      id: r.id,
      parentId: r.parentId ?? null,
      role: r.role,
      content,
      reasoning,
      model: r.model,
      timestamp: (r.timestamp || 0) * 1000,
      attachments: (r.files || []).map((f: any) =>
        f.type === 'image'
          ? { kind: 'image', name: f.name || 'image', dataUrl: f.url }
          : { kind: 'file', name: f.name || f.file?.filename || 'fichier', fileId: f.id, size: f.size },
      ),
      error: r.error?.content,
    });
    cur = r.parentId;
  }
  if (!out.length && Array.isArray(chat?.messages)) {
    for (const r of chat.messages) {
      const { reasoning, content } = splitReasoning(r.content || '');
      out.push({ id: r.id || uid(), parentId: r.parentId ?? null, role: r.role, content, reasoning, model: r.model, timestamp: (r.timestamp || 0) * 1000 });
    }
  }
  return { messages: out, model: chat?.models?.[0] || '' };
}
