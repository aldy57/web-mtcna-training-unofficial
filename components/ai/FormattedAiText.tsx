"use client";

import { useState } from "react";

export interface FormattedAiTextProps {
  content: string;
  className?: string;
}

interface InlineToken {
  type: "text" | "strong" | "code" | "em";
  text: string;
}

function parseInlineTokens(text: string): InlineToken[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g;
  const rawParts = text.split(pattern);

  return rawParts.filter(Boolean).map((part) => {
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return { type: "strong", text: part.slice(2, -2) };
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return { type: "code", text: part.slice(1, -1) };
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return { type: "em", text: part.slice(1, -1) };
    }
    return { type: "text", text: part };
  });
}

function RenderInline({ text }: { text: string }) {
  const tokens = parseInlineTokens(text);

  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "strong") {
          return (
            <strong
              key={index}
              className="font-semibold text-foreground tracking-tight"
            >
              {token.text}
            </strong>
          );
        }
        if (token.type === "code") {
          return (
            <code
              key={index}
              className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] sm:text-xs text-accent border border-border/70"
            >
              {token.text}
            </code>
          );
        }
        if (token.type === "em") {
          return (
            <em key={index} className="italic">
              {token.text}
            </em>
          );
        }
        return <span key={index}>{token.text}</span>;
      })}
    </>
  );
}

function CodeBlockItem({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-2 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800/80 border-b border-neutral-700 text-[10px] text-neutral-400">
        <span>{lang ? lang.toUpperCase() : "ROUTEROS / CLI"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? "Tersalin ✓" : "Salin"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface BlockItem {
  type:
    | "paragraph"
    | "list_item"
    | "numbered_item"
    | "heading"
    | "code_block"
    | "empty";
  content?: string;
  num?: string;
  level?: number;
  code?: string;
  lang?: string;
}

function parseBlocks(text: string): BlockItem[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: BlockItem[] = [];
  let currentCodeBlock: { lang: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (line.trim().startsWith("```")) {
      if (currentCodeBlock) {
        blocks.push({
          type: "code_block",
          lang: currentCodeBlock.lang,
          code: currentCodeBlock.lines.join("\n"),
        });
        currentCodeBlock = null;
      } else {
        const lang = line.trim().slice(3).trim();
        currentCodeBlock = { lang, lines: [] };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.lines.push(line);
      continue;
    }

    // List item bullet
    if (/^[-*]\s+/.test(line.trim())) {
      const content = line.trim().replace(/^[-*]\s+/, "");
      blocks.push({ type: "list_item", content });
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        blocks.push({
          type: "numbered_item",
          num: match[1],
          content: match[2],
        });
        continue;
      }
    }

    // Headings
    if (/^#{1,4}\s+/.test(line.trim())) {
      const headingMatch = line.trim().match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch && headingMatch[1]) {
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          content: headingMatch[2] ?? "",
        });
        continue;
      }
    }

    // Empty line
    if (!line.trim()) {
      blocks.push({ type: "empty" });
      continue;
    }

    // Regular line
    blocks.push({ type: "paragraph", content: line });
  }

  if (currentCodeBlock) {
    blocks.push({
      type: "code_block",
      lang: currentCodeBlock.lang,
      code: currentCodeBlock.lines.join("\n"),
    });
  }

  return blocks;
}

export function FormattedAiText({
  content,
  className = "",
}: FormattedAiTextProps) {
  if (!content) {
    return null;
  }

  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-1.5 break-words font-sans ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "code_block" && block.code !== undefined) {
          return (
            <CodeBlockItem
              key={index}
              code={block.code}
              lang={block.lang}
            />
          );
        }

        if (block.type === "list_item" && block.content !== undefined) {
          return (
            <div key={index} className="flex items-start gap-2.5 my-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <div className="flex-1 leading-relaxed">
                <RenderInline text={block.content} />
              </div>
            </div>
          );
        }

        if (block.type === "numbered_item" && block.content !== undefined) {
          return (
            <div key={index} className="flex items-start gap-2 my-1">
              <span className="shrink-0 font-mono text-xs font-semibold text-muted mt-0.5">
                {block.num}.
              </span>
              <div className="flex-1 leading-relaxed">
                <RenderInline text={block.content} />
              </div>
            </div>
          );
        }

        if (block.type === "heading" && block.content !== undefined) {
          return (
            <h4
              key={index}
              className="font-semibold text-foreground text-xs sm:text-sm mt-2 pt-1 border-b border-border/40 pb-0.5"
            >
              <RenderInline text={block.content} />
            </h4>
          );
        }

        if (block.type === "empty") {
          return <div key={index} className="h-1" />;
        }

        return (
          <p key={index} className="leading-relaxed">
            <RenderInline text={block.content ?? ""} />
          </p>
        );
      })}
    </div>
  );
}

