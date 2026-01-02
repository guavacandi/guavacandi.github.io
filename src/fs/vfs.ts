import type { VfsNode } from "../terminal/types";

export const vfs: VfsNode = {
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        games: {
          type: "dir",
          children: {
            snake: {
              type: "dir",
              children: {}, // no snake.txt
            },
            phishfish: {
              type: "dir",
              children: {}, // no phishfish.txt
            },
          },
        },

        documents: {
          type: "dir",
          children: {
            "resume.txt": {
              type: "file",
              openExternal: true,
              openType: "resume",
              url: "/Chloe_Ng2026Resume.pdf",
              content: "Resume\n",
            },
          },
        },

        // hidden trash (not visible in terminal/finder unless allowHidden in Finder UI)
        trash: {
          type: "dir",
          hidden: true,
          children: {
            delete: {
              type: "file",
              openExternal: true,
              openType: "trashcode",
              content: "delete\n",
            },
          },
        },

        "secret.txt": {
          type: "file",
          locked: true,
          password: "safepassword",
          content: "Nice try \n\nUse: unlock secret.txt [password]\n",
          openType: "congrats",
        },
      },
    },
  },
};

const splitPath = (p: string) => p.split("/").filter(Boolean);

type LsOk = { ok: true; items: string[] };
type CdOk = { ok: true; path: string };
type CatOk = { ok: true; content: string };
type VfsErr = { ok: false; msg: string };

export const normalizePath = (cwd: string, target: string) => {
  if (!target || target === ".") return cwd;
  const base = target.startsWith("/") ? [] : splitPath(cwd);
  const parts = target.startsWith("/") ? splitPath(target) : splitPath(target);
  const stack = [...base];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }

  return "/" + stack.join("/");
};

export const getNode = (root: VfsNode, path: string): VfsNode | null => {
  const parts = splitPath(path);
  let cur: VfsNode = root;

  for (const p of parts) {
    if (cur.type !== "dir") return null;
    const next = cur.children[p];
    if (!next) return null;

    // hide hidden nodes from terminal access
    if (next.hidden) return null;

    cur = next;
  }
  return cur;
};

export const ls = (root: VfsNode, cwd: string, target?: string): LsOk | VfsErr => {
  const path = normalizePath(cwd, target || ".");
  const node = getNode(root, path);
  if (!node) return { ok: false, msg: `No such path: ${path}` };
  if (node.type !== "dir") return { ok: false, msg: `${path} is not a directory` };

  const items = Object.entries(node.children || {})
    .filter(([, child]) => !child.hidden)
    .map(([name]) => name);

  return { ok: true, items };
};

export const cd = (root: VfsNode, cwd: string, target?: string): CdOk | VfsErr => {
  if (!target) return { ok: true, path: cwd };
  const path = normalizePath(cwd, target);
  const node = getNode(root, path);
  if (!node) return { ok: false, msg: `No such directory: ${path}` };
  if (node.type !== "dir") return { ok: false, msg: `${path} is not a directory` };
  return { ok: true, path };
};

export const cat = (root: VfsNode, cwd: string, target?: string): CatOk | VfsErr => {
  if (!target) return { ok: false, msg: "Usage: cat <file>" };
  const path = normalizePath(cwd, target);
  const node = getNode(root, path);
  if (!node) return { ok: false, msg: `No such file: ${path}` };
  if (node.type !== "file") return { ok: false, msg: `${path} is not a file` };
  if (node.locked) return { ok: false, msg: `${target} is locked. Use: unlock ${target} <password>` };
  return { ok: true, content: node.content ?? "" };
};

export const unlock = (
  root: VfsNode,
  cwd: string,
  target?: string,
  password?: string
) => {
  if (!target || !password) return "Usage: unlock <file> <password>";
  const path = normalizePath(cwd, target);
  const node = getNode(root, path);
  if (!node || node.type !== "file") return `No such file: ${target}`;
  if (!node.locked) return `${target} is already unlocked.`;
  if (node.password !== password) return "Incorrect password.";
  node.locked = false;
  return `${target} unlocked.`;
};
