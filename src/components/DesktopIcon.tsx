type Props = {
  img: string;
  label: string;
  onDoubleClick?: () => void;
  onClick?: () => void;
};

export default function DesktopIcon({ img, label, onClick, onDoubleClick }: Props) {
  return (
    <div
      className="desktop-icon"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex={0}
    >
      <img src={img} alt={label} />
      <div className="desktop-icon-label">{label}</div>
    </div>
  );
}
