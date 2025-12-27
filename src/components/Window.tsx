import { useEffect, useState } from "react";

type Props = {
  id: string;
  title: string;
  isOpen: boolean;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
  width?: number;
  height?: number;
  children: React.ReactNode;
};

export default function Window({
  id,
  title,
  isOpen,
  zIndex,
  onClose,
  onFocus,
  width,
  height,
  children,
}: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ startX: number; startY: number } | null>(null);

  useEffect(() => {
    if (isOpen) setPos({ x: 0, y: 0 });
  }, [isOpen]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      setPos({ x: e.clientX - drag.startX, y: e.clientY - drag.startY });
    };
    const onUp = () => setDrag(null);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag]);

  if (!isOpen) return null;

  return (
    <div
      id={id}
      className="window"
      style={{
        zIndex,
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
        top: "50%",
        left: "50%",
      }}
      onMouseDown={onFocus}
    >
      <div
        className="window-titlebar"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".window-close")) return;
          onFocus();
          setDrag({ startX: e.clientX - pos.x, startY: e.clientY - pos.y });
        }}
      >
        <div
          className="window-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close"
        />
        <div className="window-title">{title}</div>
      </div>


      <div className="window-content" style={{ height: height ? `calc(${height}px - 35px)` : undefined }}>
        {children}
      </div>
    </div>
  );
}
