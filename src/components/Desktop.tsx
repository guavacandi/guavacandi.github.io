import { useEffect, useState } from "react";
import DesktopIcon from "./DesktopIcon";
import Taskbar from "./Taskbar";
import Window from "./Window";
import Popups from "./Popups";
import AboutWindow from "./windows/AboutWindow";
import LinkedinWindow from "./windows/LinkedinWindow";
import TerminalWindow from "./windows/TerminalWindow";
import PhishFishWindow from "./windows/PhishFishWindow";
import type { WindowId } from "../terminal/types";

type WindowState = Record<WindowId, boolean>;
type ZMap = Record<WindowId, number>;

export default function Desktop() {
  const [clock, setClock] = useState("");
  const [open, setOpen] = useState<WindowState>({ about: false, linkedin: false, terminal: false, phishfish: false, 
  });
  const [z, setZ] = useState<ZMap>({ about: 10, linkedin: 11, terminal: 12, phishfish: 13,
  });
  const [construction, setConstruction] = useState(false);

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
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

  return (
    <div className="desktop">
      <div className="sidebar">
        <DesktopIcon img="/images/File.PNG" label="LINKEDIN.LNK" onClick={() => openWindow("linkedin")} />
        <DesktopIcon img="/images/about.png" label="ABOUT.ME" onClick={() => openWindow("about")} />
        <DesktopIcon img="/images/cmd.JPG" label="SHELL.CMD" onClick={() => openWindow("terminal")} />
        <DesktopIcon img="/images/cmd.JPG" label="PHISHFISH.EXE" onClick={() => openWindow("phishfish")} />
      </div>

      <div className="trash-icon" onClick={() => setConstruction(true)} role="button" tabIndex={0}>
        <img src="/images/trash.ico" alt="Recycle Bin" />
        <div className="icon-label">Recycle Bin</div>
      </div>

      <Window
        id="linkedin-window"
        title="LinkedIn"
        isOpen={open.linkedin}
        zIndex={z.linkedin}
        onClose={() => closeWindow("linkedin")}
        onFocus={() => bringToFront("linkedin")}
        width={500}
      >
        <LinkedinWindow />
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
        id="terminal-window"
        title="Shell"
        isOpen={open.terminal}
        zIndex={z.terminal}
        onClose={() => closeWindow("terminal")}
        onFocus={() => bringToFront("terminal")}
        width={700}
        height={420}
      >
        <TerminalWindow
          openWindow={openWindow}
          closeWindow={closeWindow}
          setActiveWindow={(id) => bringToFront(id)}
        />
      </Window>

      <Popups showConstruction={construction} onCloseConstruction={() => setConstruction(false)} />

      <Taskbar clock={clock} />
    </div>
  );
}
