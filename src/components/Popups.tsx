type Props = {
  showConstruction: boolean;
  onCloseConstruction: () => void;
};

export default function Popups({ showConstruction, onCloseConstruction }: Props) {
  return (
    <>
      {showConstruction && (
        <div className="error-popup">
          <div className="error-title-bar">
            <span>System Message</span>
            <div className="window-button close-button" onClick={onCloseConstruction}>
              ×
            </div>
          </div>

          <div className="error-content">
            <div className="error-icon">🚧</div>
            <div className="error-message">
              Some features are currently under construction. The terminal and recycle bin are not yet fully functional.
            </div>
          </div>

          <div className="error-buttons">
            <button className="error-ok-button" onClick={onCloseConstruction}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
