import type { TerminalCommandContext, TerminalCommandResult, WindowId } from "./types";
import { ls as vls, cd as vcd, cat as vcat, unlock as vunlock } from "../fs/vfs";

type CommandHandler = (args: string[], ctx: TerminalCommandContext) => TerminalCommandResult[];

const asWindowId = (s: string): WindowId | null => {
  if (s === "about") return "about";
  if (s === "macintoshhd" || s === "macintosh" || s === "hd") return "macintoshhd";
  if (s === "terminal") return "terminal";
  if (s === "resume") return "resume"; // ✅ NEW
  return null;
};

export const commands: Record<string, CommandHandler> = {
  help: () => [
    {
      type: "text",
      value:
        "Commands:\nhelp\nclear\ntime\nwhoami\npwd\nls [path]\ncd [path]\ncat [file]\nunlock [file] [password]\nopen about|resume\nclose about|resume\nhint",
    },
  ],

  time: (_a, ctx) => [{ type: "text", value: ctx.nowString() }],
  whoami: () => [{ type: "text", value: "visitor — exploring ChloeOS." }],
  pwd: (_a, ctx) => [{ type: "text", value: ctx.cwd }],

  ls: (args, ctx) => {
    const res = vls(ctx.vfsRoot, ctx.cwd, args[0]);
    return [{ type: "text", value: res.ok ? res.items.join("  ") : res.msg }];
  },

  cd: (args, ctx) => {
    const res = vcd(ctx.vfsRoot, ctx.cwd, args[0]);
    if (!res.ok) return [{ type: "text", value: res.msg }];
    ctx.setCwd(res.path);
    return [];
  },

  cat: (args, ctx) => {
    const target = args[0];
    const res = vcat(ctx.vfsRoot, ctx.cwd, target);

    // ✅ NEW: if this is resume.txt, open the Resume window instead of printing
    // Works for: cat resume.txt, cat /home/documents/resume.txt, etc.
    if (res.ok) {
      const requested = (target || "").toLowerCase();
      const content = (res.content || "").toLowerCase();

      const looksLikeResume =
        requested.endsWith("resume.txt") ||
        requested === "resume" ||
        requested === "resume.txt" ||
        content.includes("chloe") && content.includes("resume"); // safe fallback

      if (looksLikeResume) {
        ctx.openWindow("resume");
        return [{ type: "text", value: "Opening resume…" }];
      }
    }

    return [{ type: "text", value: res.ok ? res.content : res.msg }];
  },

  unlock: (args, ctx) => {
    const msg = vunlock(ctx.vfsRoot, ctx.cwd, args[0], args[1]);
    return [{ type: "text", value: msg }];
  },

  open: (args, ctx) => {
    const id = asWindowId((args[0] || "").toLowerCase());
    if (!id || id === "terminal")
      return [{ type: "text", value: "Usage: open about | open resume" }];

    ctx.openWindow(id);
    return [{ type: "text", value: `Opened ${id}.` }];
  },

  close: (args, ctx) => {
    const id = asWindowId((args[0] || "").toLowerCase());
    if (!id || id === "terminal")
      return [{ type: "text", value: "Usage: close about | close resume" }];

    ctx.closeWindow(id);
    return [{ type: "text", value: `Closed ${id}.` }];
  },

  hint: () => [{ type: "text", value: "Check the trash can :D" }],
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
  if (!handler)
    return {
      output: [{ type: "text", value: `Command not found: ${cmd}. Type 'help'.` }],
    };

  return { output: handler(args, ctx) };
}
