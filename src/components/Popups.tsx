import { useEffect, useMemo, useState } from "react";

type Props = {
  showConstruction: boolean;
  onCloseConstruction: () => void;
};

export default function Popups({ showConstruction, onCloseConstruction }: Props) {
  const [showSecurity, setShowSecurity] = useState(false);
  const errorSound = useMemo(() => new Audio("/audio/error.wav"), []);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowSecurity(true);
      errorSound.play().catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [errorSound]);

  return (
    <>
      {showSecurity && (
        <div className="error-popup">
          <div className="error-title-bar">
            <span>Security Alert</span>
            <div className="window-button close-button" onClick={() => setShowSecurity(false)}>
              ×
            </div>
          </div>
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <div className="error-message">
              I can make your system more secure than this website! Click LINKEDIN.LNK to learn more!
            </div>
          </div>
          <div className="error-buttons">
            <button className="error-ok-button" onClick={() => setShowSecurity(false)}>
              OK
            </button>
          </div>
        </div>
      )}

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
