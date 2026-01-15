import { useEffect, useState } from "react";
import DesktopIcon from "./DesktopIcon";
import Window from "./Window";
import Popups from "./Popups";
import { vfs } from "../fs/vfs";
import CongratsWindow from "./windows/CongratsWindow";
import SnakeWindow from "./windows/SnakeWindow";
import ResumeWindow from "./windows/ResumeWindow";
import CalculatorWindow from "./windows/CalculatorWindow";
import AboutWindow from "./windows/AboutWindow";
import MacintoshHDWindow from "./windows/MacintoshHDWindow";
import TerminalWindow from "./windows/TerminalWindow";
import PhishFishWindow from "./windows/PhishFishWindow";
import MenuBar from "./MenuBar";
import type { WindowId } from "../terminal/types";

type WindowState = Record<WindowId, boolean>;
type ZMap = Record<WindowId, number>;

export default function Desktop() {
  const [clock, setClock] = useState("");
  const [background, setBackground] = useState("MacOS");
  const [construction, setConstruction] = useState(false);

  const [finderStack, setFinderStack] = useState<string[]>(["/home"]);
  const finderPath = finderStack[finderStack.length - 1];

  const [cwd, setCwd] = useState("/home");
  const [trashStack, setTrashStack] = useState<string[]>(["/home/trash"]);
  const trashPath = trashStack[trashStack.length - 1];
  
  const [open, setOpen] = useState<WindowState>({
    about: false,
    macintoshhd: false,
    terminal: false,
    phishfish: false,
    calculator: false,
    security: false,
    resume: false,
    trash: false,
    trashcode: false,
    snake: false,
    congrats: false
  });

  const [z, setZ] = useState<ZMap>({
    about: 10,
    macintoshhd: 11,
    terminal: 12,
    phishfish: 13,
    calculator: 14,
    security: 15,
    resume: 16,
    trash: 17,
    trashcode: 18,
    snake: 19,
    congrats: 20,
  });

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
  
      // If click is inside ANY window, do nothing (let that window handle focus)
      const clickedInsideAWindow = !!target.closest(".window");
      if (clickedInsideAWindow) return;
  
      // If click is on desktop/background, focus terminal
      window.dispatchEvent(new Event("focus-terminal"));
    };
  
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);
  
  

  const bringToFront = (id: WindowId) => {
    const max = Math.max(...Object.values(z));
    setZ((prev) => ({ ...prev, [id]: max + 1 }));
  };

  const openWindow = (id: WindowId) => {
    setOpen((prev) => ({ ...prev, [id]: true }));
    bringToFront(id);
  };
  
  const closeWindow = (id: WindowId) => {
    setOpen((prev) => ({ ...prev, [id]: false }));
  };

  useEffect(() => {
    setOpen((prev) => ({ ...prev, security: true, terminal: true }));

    setZ((prev) => ({
      ...prev,
      terminal: 100,
      security: 101,
    }));

    setTimeout(() => {
      window.dispatchEvent(new Event("focus-terminal"));
    }, 0);
  }, []);

  
  
  return (
    <div className="system7">
      <MenuBar
        clock={clock}
        openWindow={openWindow}
        background={background}
        setBackground={setBackground}
      />

      <div className="desktop" data-bg={background}>
        <div className="iconbar">
          <DesktopIcon
            img="/assets/images/hd-icon.png"
            label="Macintosh HD"
            onClick={() => {
              setFinderStack(["/home"]);
              openWindow("macintoshhd");
            }}
          />

          <DesktopIcon
            img="/assets/images/doc-icon.png"
            label="ABOUT.ME"
            onClick={() => openWindow("about")}
          />

          <DesktopIcon
            img="assets/images/terminal.png"
            label="TERMINAL"
            onClick={() => openWindow("terminal")}
          />

          <DesktopIcon
            img="assets/images/fish.png"
            label="PHISHFISH"
            onClick={() => openWindow("phishfish")}
          />

          <DesktopIcon
            img="/assets/images/doc-icon.png"
            label="RESUME.TXT"
            onClick={() => openWindow("resume")}
          />
        </div>

        <DesktopIcon
          img="assets/images/trash.png"
          label="Recycle Bin"
          onClick={() => {    setTrashStack(["/home/trash"]);
                              openWindow("trash")}}
        />

        <Window
          id="macintoshhd-window"
          className="finder-window"
          title="Macintosh HD"
          isOpen={open.macintoshhd}
          zIndex={z.macintoshhd}
          onClose={() => {
            setFinderStack((prev) => {
              if (prev.length > 1) return prev.slice(0, -1);
              closeWindow("macintoshhd");
              return prev;
            });
          }}
          onFocus={() => bringToFront("macintoshhd")}
          width={560}
          height={320}
        >
          <MacintoshHDWindow
  vfsRoot={vfs}
  path={finderPath}
  onOpenFolder={(next) => setFinderStack((prev) => [...prev, next])}
  openWindow={openWindow}
/>

        </Window>
        {open.congrats && (
  <CongratsWindow
    id="congrats"
    isOpen={open.congrats}
    zIndex={z.congrats}
    onClose={() => closeWindow("congrats")}
    onFocus={() => bringToFront("congrats")}
  />
)}

        <Window
  id="trash-window"
  className="finder-window"
  title="Recycle Bin"
  isOpen={open.trash}
  zIndex={z.trash}
  onClose={() => {
    setTrashStack((prev) => {
      if (prev.length > 1) return prev.slice(0, -1);
      closeWindow("trash");
      return prev;
    });
  }}
  onFocus={() => bringToFront("trash")}
  width={560}
  height={320}
>
  <MacintoshHDWindow
    vfsRoot={vfs}
    path={trashPath}
    onOpenFolder={(next) => setTrashStack((prev) => [...prev, next])}
    openWindow={openWindow}
    allowHidden={true} 
  />
</Window>
<Window
  id="snake-window"
  title="Snake"
  isOpen={open.snake}
  zIndex={z.snake}
  onFocus={() => bringToFront("snake")}
  width={420}
  height={480}
  onClose={() => {
    closeWindow("snake");
    setTimeout(() => window.dispatchEvent(new Event("focus-terminal")), 0);
  }}
  
>
  <SnakeWindow />
</Window>

<Window
  id="trashcode-window"
  title=""
  isOpen={open.trashcode}
  zIndex={z.trashcode}
  onClose={() => closeWindow("trashcode")}
  onFocus={() => bringToFront("trashcode")}
  width={360}
  height={160}
  className="unlock-window"
>
  <div className="unlock-content" onMouseDown={(e) => e.stopPropagation()}>
    <div className="unlock-message" style={{ textAlign: "center" }}>
      c2FmZXN0cGFzc3dvcmQ=
    </div>

    <div className="unlock-actions">
      <button className="unlock-btn" onClick={() => closeWindow("trashcode")}>
        OK
      </button>
    </div>
  </div>
</Window>

        <Window
          id="calculator-window"
          title="Calculator"
          isOpen={open.calculator}
          zIndex={z.calculator}
          onClose={() => closeWindow("calculator")}
          onFocus={() => bringToFront("calculator")}
          width={160}
          height={255}
          className="calculator-window"
        >
          <CalculatorWindow />
        </Window>


        <Window
          id="security-window"
          title="Security Alert"
          isOpen={open.security}
          zIndex={z.security}
          onClose={() => closeWindow("security")}
          onFocus={() => bringToFront("security")}
          width={340}
          height={180}
        >
          <div style={{ fontFamily: "FindersKeepers" }}>
            <p style={{ margin: 0 }}>
              I can make your system more secure than this website! Click Links to learn more!
            </p>
          </div>
        </Window>

        <Window
          id="about-window"
          title="About.me - Profile"
          isOpen={open.about}
          zIndex={z.about}
          onClose={() => closeWindow("about")}
          onFocus={() => bringToFront("about")}
          width={700}
        >
          <AboutWindow />
        </Window>

        <Window
          id="phishfish-window"
          title="Toki’s Phish-Fish"
          isOpen={open.phishfish}
          zIndex={z.phishfish}
          onClose={() => closeWindow("phishfish")}
          onFocus={() => bringToFront("phishfish")}
          width={780}
          height={640}
        >
          <PhishFishWindow />
        </Window>

        <Window
          id="resume-window"
          title="Resume"
          isOpen={open.resume}
          zIndex={z.resume}
          onClose={() => closeWindow("resume")}
          onFocus={() => bringToFront("resume")}
          width={760}
          height={700}
        >
          <ResumeWindow />
        </Window>

        <Window
          id="terminal-window"
          title="Terminal"
          isOpen={open.terminal}
          zIndex={z.terminal}
          onClose={() => closeWindow("terminal")}
          width={700}
          height={420}
          onFocus={() => {
            bringToFront("terminal");
            window.dispatchEvent(new Event("focus-terminal"));
          }}
        >
          <TerminalWindow
            isOpen={open.terminal}
            openWindow={openWindow}
            closeWindow={closeWindow}
            setActiveWindow={(id) => bringToFront(id)}
            vfsRoot={vfs}
            cwd={cwd}
            setCwd={setCwd}
          />
        </Window>

        <Popups
          showConstruction={construction}
          onCloseConstruction={() => setConstruction(false)}
        />
      </div>
    </div>
  );
}
