import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, type ReactNode } from "react";

interface Props {
  children: string;
}

function CodeBlock({ className, children }: { className?: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const lang = className?.replace("language-", "") ?? "";
  const code = String(children).replace(/\n$/, "");
  const lines = code.split("\n").length;
  const isLong = lines > 6;

  return (
    <div className="my-2 rounded-lg border border-[var(--border)]/40 bg-[#0d1117] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60"
      >
        <span className="font-mono">{lang || "code"}</span>
        <span className="opacity-50">{lines} lines</span>
        {isLong && (
          <span className="ml-auto opacity-40">{expanded ? "▲ collapse" : "▼ expand"}</span>
        )}
      </button>
      <pre
        className={`overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-[var(--text-primary)] ${
          isLong && !expanded ? "max-h-[7.5rem]" : "max-h-[30rem]"
        } overflow-y-auto`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Markdown({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="mb-2 mt-3 text-lg font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 text-[15px] font-semibold">{children}</h3>,

        // Paragraphs
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

        // Lists
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="text-[15px]">{children}</li>,

        // Code
        code: ({ className, children, ...props }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return <CodeBlock className={className}>{children}</CodeBlock>;
          }
          return (
            <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--accent)]" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,

        // Links
        a: ({ href, children }) => (
          <a href={href} className="text-[var(--accent)] underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-[var(--accent)]/40 pl-3 text-[var(--text-secondary)] italic">
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-[var(--border)] px-2 py-1 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-b border-[var(--border)]/30 px-2 py-1">{children}</td>
        ),

        // Horizontal rule
        hr: () => <hr className="my-3 border-[var(--border)]/40" />,

        // Strong / em
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
