"use client";

import {
  parseAssistantContent,
  type AssistantBlock,
  type TextSegment,
} from "@/lib/parse-assistant-content";

function InlineText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "bold" ? (
          <strong key={index} className="font-semibold text-slate-900 dark:text-zinc-100">
            {segment.value}
          </strong>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </>
  );
}

function OrderedListBlock({
  items,
}: {
  items: Extract<AssistantBlock, { kind: "ordered" }>["items"];
}) {
  return (
    <ol className="mt-3 flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={`${item.index}-${item.title}`}
          className="flex gap-2 md:gap-3 rounded-xl border border-slate-100 dark:border-white/8 bg-slate-50/80 dark:bg-white/4 px-3 py-2.5 md:px-4 md:py-3.5 transition-colors"
        >
          <span
            className="flex h-6 w-6 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs md:text-sm font-semibold text-indigo-700 dark:text-indigo-300"
            aria-hidden
          >
            {item.index}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-zinc-100">{item.title}</p>
            <p className="mt-0.5 text-sm md:text-base text-slate-600 dark:text-zinc-400">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function UnorderedListBlock({
  items,
}: {
  items: Extract<AssistantBlock, { kind: "unordered" }>["items"];
}) {
  return (
    <ul className="mt-2 space-y-1.5 pl-0">
      {items.map((segments, index) => (
        <li key={index} className="flex items-start gap-2.5 text-sm md:text-base text-slate-700 dark:text-zinc-300">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
          <InlineText segments={segments} />
        </li>
      ))}
    </ul>
  );
}

export default function AssistantMessage({ content }: { content: string }) {
  const blocks = parseAssistantContent(content);

  return (
    <div className="space-y-2 text-sm md:text-base text-slate-700 dark:text-zinc-300 leading-relaxed">
      {blocks.map((block, index) => {
        if (block.kind === "paragraph") {
          return (
            <p key={index} className="leading-relaxed">
              <InlineText segments={block.segments} />
            </p>
          );
        }

        if (block.kind === "ordered") {
          return <OrderedListBlock key={index} items={block.items} />;
        }

        return <UnorderedListBlock key={index} items={block.items} />;
      })}
    </div>
  );
}
