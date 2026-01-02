import Window from "../Window";
import type { WindowId } from "../../terminal/types";

type Props = {
  id: WindowId;
  isOpen: boolean;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
};

export default function CongratsWindow({
  id,
  isOpen,
  zIndex,
  onClose,
  onFocus,
}: Props) {
  return (
    <Window
      id={id}
      title="Congrats!"
      isOpen={isOpen}
      zIndex={zIndex}
      onClose={onClose}
      onFocus={onFocus}
    >
      <div style={{ padding: 12, lineHeight: 1.5 }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Congrats!</h3>
        <p style={{ margin: 0 }}>
          You unlocked <b>secret.txt</b>. Thanks for exploring!
        </p>
      </div>
    </Window>
  );
}
