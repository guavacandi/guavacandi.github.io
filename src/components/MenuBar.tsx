
import { useEffect, useMemo, useRef, useState } from "react";

type MenuKey = "apple" | "application" | "file" | "links" | "view" | "special";

type MenuItem =
  | { type: "item"; label: string; onClick: () => void; disabled?: boolean }
  | { type: "divider" };

type Props = {
  clock: string;

  // hooks into your app:
  openWindow: (id: "about" | "macintoshhd" | "terminal" | "phishfish" | "calculator") => void;

  // "Benchoff-style" actions:
  showAboutWebsite?: () => void;        // About This Website...
  createCalculator?: () => void;        // Calculator
  toggleSound?: () => void;             // Sound
  openPage?: (slug: string) => void;    // openPage('Babelscope') etc.
  background: string;                   // current background key
  setBackground: (key: string) => void; // setBackground('MacOS') etc.
  toggleTheme?: () => void;             // Switch to Modern Theme
};

export default function MenuBar({
  clock,
  openWindow,
  showAboutWebsite,
  createCalculator,
  toggleSound,
  openPage,
  background,
  setBackground,
  toggleTheme,
}: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const menus: Record<MenuKey, MenuItem[]> = useMemo(() => {
  

    const check = (key: string) => (background === key ? "✔ " : "");

    return {
      apple: [
        {
          type: "item",
          label: "About This Website...",
          onClick: () => (showAboutWebsite ? showAboutWebsite() : openWindow("about")),
        },
        { type: "divider" },
        {
          type: "item",
          label: "Calculator",
          onClick: () => (createCalculator ? createCalculator() : openWindow("calculator")),
        },
        { type: "divider" },
        
      ],

      application: [
        // Keep a couple placeholders so it feels real:
        { type: "item", label: "About Finder...", onClick: () => openWindow("about") },
        { type: "divider" },
        { type: "item", label: "Hide Finder", onClick: () => setOpenMenu(null) },
      ],

      file: [
        // These mirror his list (you can trim anytime)
       // { type: "item", label: "Babelscope", onClick: () => safeOpenPage("Babelscope") },

      ],

      links: [
        { type: "item", label: "Email", onClick: () => (window.location.href = "mailto:ngchloe1123@gmail.com") },
        { type: "item", label: "Linkedin", onClick: () => window.open("https://www.linkedin.com/in/ngchloe1123/", "_blank") },
      ],

      view: [
        { type: "item", label: `${check("MacOS")}MacOS`, onClick: () => setBackground("MacOS") },
        { type: "item", label: `${check("cats")}Cats`, onClick: () => setBackground("cats") },
        { type: "item", label: `${check("galaxy")}Galaxy`, onClick: () => setBackground("galaxy") },
        { type: "item", label: `${check("flowers")}Flowers`, onClick: () => setBackground("flowers") },
        { type: "item", label: `${check("lake")}Lake`, onClick: () => setBackground("lake") },
        { type: "item", label: `${check("cyberpunk")}Cyberpunk`, onClick: () => setBackground("cyberpunk") },
      ],

      special: [
        //{
          //type: "item",
         // label: "Switch to Modern Theme",
          //onClick: () => (toggleTheme ? toggleTheme() : console.log("toggleTheme not provided")),
        //},
      ],
    };
  }, [background, createCalculator, openPage, openWindow, setBackground, showAboutWebsite, toggleSound, toggleTheme]);

  function toggleMenu(key: MenuKey, el: HTMLElement) {
    setOpenMenu((prev) => (prev === key ? null : key));
    setAnchorRect(el.getBoundingClientRect());
  }

  // close on outside click + Esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (barRef.current && !barRef.current.contains(target)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const items = openMenu ? menus[openMenu] : [];

  return (
    <div className="menubar" ref={barRef}>
      <div className="menubar-left">
        <button className="menubar-item app-menu" onMouseDown={(e) => { e.preventDefault(); toggleMenu("apple", e.currentTarget); }}>
          <span className="apple-icon" aria-hidden />
        </button>

        {(["file", "links", "view", "special"] as const).map((key) => (
          <button
            key={key}
            className={`menubar-item ${openMenu === key ? "is-open" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleMenu(key, e.currentTarget);
            }}
          >
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <div className="menubar-right">
        <div className="clock">{clock}</div>

        <button
          className={`menubar-item app-menu ${openMenu === "application" ? "is-open" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleMenu("application", e.currentTarget);
          }}
        >
          <img src="/assets/images/finder-icon.png" alt="" className="app-icon" />
          <span className="app-name">Finder</span>
        </button>
      </div>

      {openMenu && anchorRect && (
        <div
          className="dropdown-menu open"
          style={{
            left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 240)),
            top: anchorRect.bottom,
          }}
        >
          {items.map((it, idx) => {
            if (it.type === "divider") return <div className="dropdown-divider" key={`d-${idx}`} />;
            return (
              <div
                key={`${openMenu}-${idx}`}
                className="dropdown-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  it.onClick();
                  setOpenMenu(null);
                }}
              >
                {it.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
