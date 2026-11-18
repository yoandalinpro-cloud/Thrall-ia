import { memo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ICheck, ICopy } from './icons';

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'props' in (node as any)) return textOf((node as any).props.children);
  return '';
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [ok, setOk] = useState(false);
  const child: any = Array.isArray(children) ? children[0] : children;
  const lang = /language-(\w+)/.exec(child?.props?.className || '')?.[1] || 'code';
  const copy = async () => {
    await navigator.clipboard.writeText(textOf(children).replace(/\n$/, ''));
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <div className="code">
      <div className="code-head">
        <span>{lang}</span>
        <button onClick={copy} className="ghost small">
          {ok ? <ICheck size={14} /> : <ICopy size={14} />} {ok ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: CodeBlock as any,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
