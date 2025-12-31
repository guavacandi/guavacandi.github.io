export type WindowId =
  | "about"
  | "macintoshhd"
  | "terminal"
  | "phishfish"
  | "calculator"
  | "security"
  | "resume"
  | "trash"
  | "trashcode"
  | "snake";

export type TerminalCommandResult =
  | { type: "text"; value: string }
  | { type: "error"; value: string };

export type TerminalCommandContext = {
  vfsRoot: VfsNode;
  cwd: string;
  setCwd: (next: string) => void;

  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  setActiveWindow: (id: WindowId) => void;

  nowString: () => string;
};

export type VfsOpenType = "resume" | "trashcode" | "snake";

export type VfsNode =
  | {
      type: "dir";
      children: Record<string, VfsNode>;
      hidden?: boolean;
    }
  | {
      type: "file";
      content?: string;

      // if true, opening should trigger a UI action instead of displaying text
      openExternal?: boolean;

      // custom open handler (resume opens resume window)
      openType?: VfsOpenType;

      // optional asset url (PDF in /public)
      url?: string;

      locked?: boolean;
      password?: string;

      hidden?: boolean;
    };
