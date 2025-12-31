import { useEffect, useMemo, useRef, useState } from "react";
import { parseAndRun } from "../../terminal/commands";
import type {
  TerminalCommandContext,
  TerminalCommandResult,
  WindowId,
  VfsNode,
} from "../../terminal/types";

type Props = {
  isOpen: boolean;
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  setActiveWindow: (id: WindowId) => void;
  vfsRoot: VfsNode;
  cwd: string;
  setCwd: (next: string) => void;
};

const USER = "visitor";
const HOST = "ChloeOS";

const formatCwd = (cwd: string) => {
  if (cwd === "/home") return "~";
  if (cwd.startsWith("/home/")) return "~/" + cwd.slice("/home/".length);
  return cwd;
};

const PromptView = ({ prompt }: { prompt: string }) => {
  const at = prompt.indexOf(":");
  const userHost = at >= 0 ? prompt.slice(0, at) : prompt;
  const pathPart = at >= 0 ? prompt.slice(at) : "";

  return (
    <span className="chloe-terminal__prompt">
      <span className="chloe-terminal__user">{userHost}</span>
      <span className="chloe-terminal__path">{pathPart}</span>
    </span>
  );
};

type Line =
  | { kind: "cmd"; prompt: string; input: string }
  | { kind: "out"; chunks: TerminalCommandResult[] };

export default function TerminalWindow({
  isOpen,
  openWindow,
  closeWindow,
  setActiveWindow,
  vfsRoot,
  cwd,
  setCwd,
}: Props) {
  const [lines, setLines] = useState<Line[]>([
    {
      kind: "out",
      chunks: [
        { type: "text", value: "Welcome to ChloeOS.\nType 'help' for commands." },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    // double-tap focus is surprisingly effective across browsers
    hiddenInputRef.current?.focus();
    requestAnimationFrame(() => hiddenInputRef.current?.focus());
  };

  useEffect(() => {
    const onFocusTerminal = () => focusInput();
    window.addEventListener("focus-terminal", onFocusTerminal);
    return () => window.removeEventListener("focus-terminal", onFocusTerminal);
  }, []);

  const currentPrompt = useMemo(
    () => `${USER}@${HOST}:${formatCwd(cwd)}$`,
    [cwd]
  );

  // Focus when opened
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => focusInput(), 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [lines, input]);

  const ctx: TerminalCommandContext = useMemo(
    () => ({
      vfsRoot,
      cwd,
      setCwd,
      openWindow,
      closeWindow,
      setActiveWindow,
      nowString: () =>
        new Date().toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
    }),
    [vfsRoot, cwd, setCwd, openWindow, closeWindow, setActiveWindow]
  );

  const runCommand = () => {
    const cmd = input.trimEnd();
    const promptSnapshot = currentPrompt;

    setLines((prev) => [...prev, { kind: "cmd", prompt: promptSnapshot, input: cmd }]);

    const { output, clear } = parseAndRun(cmd, ctx);

    setInput("");
    setCursorPos(0);

    if (clear) {
      setLines([]);
      return;
    }

    if (output.length) {
      setLines((prev) => [...prev, { kind: "out", chunks: output }]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      runCommand();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (cursorPos === 0) return;
      setInput((v) => v.slice(0, cursorPos - 1) + v.slice(cursorPos));
      setCursorPos((p) => p - 1);
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      if (cursorPos >= input.length) return;
      setInput((v) => v.slice(0, cursorPos) + v.slice(cursorPos + 1));
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCursorPos((p) => Math.max(0, p - 1));
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setCursorPos((p) => Math.min(input.length, p + 1));
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setInput((v) => v.slice(0, cursorPos) + e.key + v.slice(cursorPos));
      setCursorPos((p) => p + 1);
    }
  };

  return (
    <div
      className="chloe-terminal"
      onMouseDownCapture={() => focusInput()}
      onClickCapture={() => focusInput()}
    >
      <input
        ref={hiddenInputRef}
        value={input}
        onChange={() => {}}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          left: 0,
          top: 0,
          border: "none",
          padding: 0,
          margin: 0,
          pointerEvents: "none",
        }}
      />

      <div ref={containerRef} className="chloe-terminal__screen">
        {lines.map((line, i) =>
          line.kind === "cmd" ? (
            <div key={i} className="chloe-terminal__line">
              <PromptView prompt={line.prompt} /> <span>{line.input}</span>
            </div>
          ) : (
            <div key={i} className="chloe-terminal__line">
              {line.chunks.map((c, j) => (
                <span key={j}>{c.type === "text" ? c.value : ""}</span>
              ))}
            </div>
          )
        )}

        <div className="chloe-terminal__line">
          <PromptView prompt={currentPrompt} /> <span>{input.slice(0, cursorPos)}</span>
          <span className="chloe-terminal__cursor" />
          <span>{input.slice(cursorPos)}</span>
        </div>
      </div>
    </div>
  );
}
