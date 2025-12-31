import React, { useEffect, useState } from "react";

type Props = {
  id: string;
  title: string;
  isOpen: boolean;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
  width?: number;
  height?: number;
  className?: string;
  children: React.ReactNode;
};

const TITLEBAR_H = 35;

export default function Window({
  id,
  title,
  isOpen,
  zIndex,
  onClose,
  onFocus,
  width,
  height,
  className,
  children,
}: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ startX: number; startY: number } | null>(null);

  const isCalculator =
    className?.includes("calculator-window") || id === "calculator-window";

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

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    zIndex,
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  };

  const centeredStyle: React.CSSProperties = {
    ...baseStyle,
    top: "50%",
    left: "50%",
    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
  };

  const calculatorStyle: React.CSSProperties = {
    ...baseStyle,
    top: "90px",
    left: "40px",
    transform: `translate(${pos.x}px, ${pos.y}px)`,
  };

  const style = isCalculator ? calculatorStyle : centeredStyle;

  // If a height is provided, constrain the content and allow scroll.
  // If no height is provided, content should hug its children.
  const contentStyle: React.CSSProperties = height
    ? {
        height: `calc(${height}px - ${TITLEBAR_H}px)`,
        overflow: "auto",
        background: "transparent",
      }
    : {
        height: "auto",
        overflow: "visible",
        background: "transparent",
      };

  return (
    <div
      id={id}
      className={`window ${className ?? ""}`}
      style={style}
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

      <div className="window-content" style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
