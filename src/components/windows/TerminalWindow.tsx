import { useMemo, useRef, useState } from "react";
import type { WindowId } from "../../terminal/types";
import { parseAndRun } from "../../terminal/commands";

type Line = { kind: "prompt" | "out"; text: string };

type Props = {
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  setActiveWindow: (id: WindowId) => void;
};

export default function TerminalWindow({ openWindow, closeWindow, setActiveWindow }: Props) {
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "ChloeOS Terminal v0.1 — type 'help'." }]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ctx = useMemo(
    () => ({
      openWindow,
      closeWindow,
      setActiveWindow,
      nowString: () =>
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    }),
    [openWindow, closeWindow, setActiveWindow]
  );

  const run = (raw: string) => {
    setLines((prev) => [...prev, { kind: "prompt", text: `> ${raw}` }]);

    const result = parseAndRun(raw, ctx);

    if (result.clear) {
      setLines([{ kind: "out", text: "" }]);
      return;
    }

    if (result.output.length) {
      setLines((prev) => [...prev, ...result.output.map((o) => ({ kind: "out" as const, text: o.value }))]);
    }
  };

  return (
    <div
      style={{ height: "100%", background: "black", color: "lime", padding: 12, fontFamily: "Consolas, monospace" }}
      onMouseDown={() => inputRef.current?.focus()}
    >
      <div style={{ height: "calc(100% - 36px)", overflow: "auto", whiteSpace: "pre-wrap" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ marginBottom: 6, color: l.kind === "prompt" ? "#7CFF7C" : "lime" }}>
            {l.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = input.trim();
          if (!trimmed) return;
          run(trimmed);
          setInput("");
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#111",
            border: "1px solid #2d2d2d",
            color: "lime",
            outline: "none",
          }}
          placeholder="Type a command… (help)"
        />
      </form>
    </div>
  );
}
