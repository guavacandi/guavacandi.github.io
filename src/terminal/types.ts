export type WindowId = "about" | "linkedin" | "terminal" | "phishfish";

export type TerminalCommandResult = { type: "text"; value: string };

export type TerminalCommandContext = {
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  setActiveWindow: (id: WindowId) => void;
  nowString: () => string;
};

