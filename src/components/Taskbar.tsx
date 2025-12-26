type Props = { clock: string };

export default function Taskbar({ clock }: Props) {
  return (
    <div className="taskbar">
      <img src="/images/START.png" alt="Start" className="start-button" />
      <div className="clock">{clock}</div>
    </div>
  );
}
