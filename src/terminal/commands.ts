import type { TerminalCommandContext, TerminalCommandResult, WindowId } from "./types";

type CommandHandler = (args: string[], ctx: TerminalCommandContext) => TerminalCommandResult[];

const asWindowId = (s: string): WindowId | null => {
  if (s === "about") return "about";
  if (s === "linkedin") return "linkedin";
  if (s === "terminal") return "terminal";
  return null;
};

export const commands: Record<string, CommandHandler> = {
  help: () => [
    {
      type: "text",
      value:
        "Commands:\nhelp\nclear | cls\ntime\nwhoami\nopen about|linkedin\nclose about|linkedin\nhint",
    },
  ],
  time: (_a, ctx) => [{ type: "text", value: ctx.nowString() }],
  whoami: () => [{ type: "text", value: "chloe_ng — cybersecurity & network engineering student. type: help" }],
  open: (args, ctx) => {
    const id = asWindowId((args[0] || "").toLowerCase());
    if (!id || id === "terminal") return [{ type: "text", value: "Usage: open about | open linkedin" }];
    ctx.openWindow(id);
    return [{ type: "text", value: `Opened ${id}.` }];
  },
  close: (args, ctx) => {
    const id = asWindowId((args[0] || "").toLowerCase());
    if (!id || id === "terminal") return [{ type: "text", value: "Usage: close about | close linkedin" }];
    ctx.closeWindow(id);
    return [{ type: "text", value: `Closed ${id}.` }];
  },
  hint: () => [{ type: "text", value: "Phish tip: verify domain + hover links + beware urgency + unexpected files." }],
};

export function parseAndRun(
  input: string,
  ctx: TerminalCommandContext
): { output: TerminalCommandResult[]; clear?: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { output: [] };

  const [cmdRaw, ...args] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  if (cmd === "clear" || cmd === "cls") return { output: [], clear: true };

  const handler = commands[cmd];
  if (!handler) return { output: [{ type: "text", value: `Command not found: ${cmd}. Type 'help'.` }] };

  return { output: handler(args, ctx) };
}
