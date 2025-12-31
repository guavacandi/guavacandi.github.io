import { useMemo, useState } from "react";
import type { VfsNode, WindowId } from "../../terminal/types";
import Window from "../Window";

type Props = {
  vfsRoot: VfsNode;
  path: string;
  onOpenFolder: (nextPath: string) => void;
  openWindow: (id: WindowId) => void;
  allowHidden?: boolean;
};

const splitPath = (p: string) => p.split("/").filter(Boolean);

function getNode(root: VfsNode, path: string, allowHidden = false): VfsNode | null {
  const parts = splitPath(path);
  let cur: VfsNode = root;

  for (const part of parts) {
    if (cur.type !== "dir") return null;

    const next = cur.children?.[part];
    if (!next) return null;

    if (!allowHidden && next.hidden) return null;

    cur = next;
  }

  return cur;
}

function joinPath(base: string, name: string) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}

export default function MacintoshHDWindow({
  vfsRoot,
  path,
  onOpenFolder,
  openWindow,
  allowHidden = false,
}: Props) {
  const node = useMemo(
    () => getNode(vfsRoot, path, allowHidden),
    [vfsRoot, path, allowHidden]
  );

  const [unlockOpen, setUnlockOpen] = useState(false);

  if (!node || node.type !== "dir") {
    return (
      <div className="finder-view">
        <div className="finder-empty">Folder not found.</div>
      </div>
    );
  }

  const entries = Object.entries(node.children)
    .filter(([, child]) => allowHidden || !child.hidden)
    .sort(([a, aNode], [b, bNode]) => {
      if (aNode.type !== bNode.type) {
        return aNode.type === "dir" ? -1 : 1;
      }
      return a.localeCompare(b);
    });

  const handleDoubleClick = (name: string, child: VfsNode) => {
    if (child.type === "dir") {
      if (name === "snake") {
        openWindow("snake");
        return;
      }
      if (name === "phishfish") {
        openWindow("phishfish");
        return;
      }
    
      onOpenFolder(joinPath(path, name));
      return;
    }
    

    if (child.openType === "resume") {
      openWindow("resume");
      return;
    }

    if (child.openType === "trashcode") {
      openWindow("trashcode");
      return;
    }

    if (child.locked) {
      setUnlockOpen(true);
    }
  };

  return (
    <div className="finder-view">
      <div className="finder-grid">
      {entries.map(([name, child]) => {
  const isDir = child.type === "dir";

  let iconSrc = "/assets/images/doc-icon.png";
  if (isDir) {
    if (name === "snake") iconSrc = "/assets/images/snak.avif";
    else if (name === "phishfish") iconSrc = "/assets/images/fish.png";
    else iconSrc = "/assets/images/folder-icon.png";
  }

  return (
    <button
      key={name}
      type="button"
      className="finder-icon"
      onDoubleClick={() => handleDoubleClick(name, child)}
    >
      <img
        src={iconSrc}
        className="finder-icon__img"
        alt=""
        draggable={false}
      />
      <div className="finder-icon__label">{name}</div>
    </button>
  );
})}

      </div>

      {unlockOpen && (
        <Window
          id="unlock-window"
          title=""
          isOpen
          zIndex={999}
          onClose={() => setUnlockOpen(false)}
          onFocus={() => {}}
          width={360}
          height={180}
          className="unlock-window"
        >
          <div className="unlock-content">
            <div className="unlock-message">Password Locked!</div>
            <div className="unlock-actions">
              <button className="unlock-btn" onClick={() => setUnlockOpen(false)}>
                OK
              </button>
            </div>
          </div>
        </Window>
      )}
    </div>
  );
}
