import { useEffect, useMemo, useRef, useState } from "react";

type Dir = "U" | "D" | "L" | "R";
type Cell = { x: number; y: number };

const GRID = 18;
const SPEED_MS = 170; // ✅ slower (increase = slower)

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

function randFood(exclude: Cell[]) {
  while (true) {
    const f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!exclude.some((c) => same(c, f))) return f;
  }
}

const opposite = (a: Dir, b: Dir) =>
  (a === "U" && b === "D") ||
  (a === "D" && b === "U") ||
  (a === "L" && b === "R") ||
  (a === "R" && b === "L");

export default function SnakeWindow() {
  const startSnake = useMemo<Cell[]>(
    () => [
      { x: 8, y: 9 },
      { x: 7, y: 9 },
      { x: 6, y: 9 },
    ],
    []
  );

  const [snake, setSnake] = useState<Cell[]>(startSnake);
  const [queuedDir, setQueuedDir] = useState<Dir>("R");
  const [food, setFood] = useState<Cell>(() => randFood(startSnake));
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const lastDirRef = useRef<Dir>("R");
  const score = Math.max(0, snake.length - 3);

  const reset = () => {
    setSnake(startSnake);
    setQueuedDir("R");
    lastDirRef.current = "R";
    setFood(randFood(startSnake));
    setRunning(false);
    setGameOver(false);
  };

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === " " || k === "p") {
        e.preventDefault();
        if (gameOver) return;
        setRunning((r) => !r);
        return;
      }

      if (k === "r") {
        e.preventDefault();
        reset();
        return;
      }

      const next: Dir | null =
        k === "arrowup" || k === "w"
          ? "U"
          : k === "arrowdown" || k === "s"
          ? "D"
          : k === "arrowleft" || k === "a"
          ? "L"
          : k === "arrowright" || k === "d"
          ? "R"
          : null;

      if (!next) return;
      e.preventDefault();

      const current = lastDirRef.current;
      if (opposite(current, next)) return;

      setQueuedDir(next);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // game loop
  useEffect(() => {
    if (!running || gameOver) return;

    const t = setInterval(() => {
      setSnake((prev) => {
        const useDir = queuedDir;
        lastDirRef.current = useDir;

        const head = prev[0];
        const nextHead =
          useDir === "U"
            ? { x: head.x, y: head.y - 1 }
            : useDir === "D"
            ? { x: head.x, y: head.y + 1 }
            : useDir === "L"
            ? { x: head.x - 1, y: head.y }
            : { x: head.x + 1, y: head.y };

        // ✅ SOLID WALLS: hit boundary = game over
        if (
          nextHead.x < 0 ||
          nextHead.x >= GRID ||
          nextHead.y < 0 ||
          nextHead.y >= GRID
        ) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        // collision with self
        if (prev.some((c, i) => i !== 0 && same(c, nextHead))) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        const ate = same(nextHead, food);
        const nextSnake = [nextHead, ...prev];

        if (!ate) {
          nextSnake.pop();
        } else {
          setFood(randFood(nextSnake));
        }

        return nextSnake;
      });
    }, SPEED_MS);

    return () => clearInterval(t);
  }, [running, gameOver, queuedDir, food]);

  const cells = useMemo(() => {
    const map = new Set<string>();
    for (const s of snake) map.add(`${s.x},${s.y}`);
    return map;
  }, [snake]);

  return (
    <div style={{ padding: 12, height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "ChicagoFLF, sans-serif" }}>
          <strong>Snake</strong> &nbsp; Score: {score}
          {gameOver ? <span style={{ marginLeft: 10 }}>(Game Over)</span> : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="unlock-btn"
            onClick={() => {
              if (gameOver) return;
              setRunning((r) => !r);
            }}
          >
            {running ? "Pause" : "Play"}
          </button>
          <button className="unlock-btn" onClick={reset}>
            Restart
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #000",
          background: "#fff",
          width: "100%",
          maxWidth: 520,
          aspectRatio: "1 / 1",
          display: "grid",
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          gridTemplateRows: `repeat(${GRID}, 1fr)`,
          margin: "0 auto",
        }}
      >
        {Array.from({ length: GRID * GRID }).map((_, idx) => {
          const x = idx % GRID;
          const y = Math.floor(idx / GRID);
          const key = `${x},${y}`;
          const isSnake = cells.has(key);
          const isHead = same(snake[0], { x, y });
          const isFood = same(food, { x, y });

          return (
            <div
              key={key}
              style={{
                border: "1px dotted rgba(0,0,0,0.08)",
                background: isFood ? "#000" : isHead ? "#111" : isSnake ? "#444" : "transparent",
              }}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontFamily: "ChicagoFLF, sans-serif", fontSize: 12, textAlign: "center" }}>
        Controls: Arrow Keys / WASD · Space/P to Pause · R to Restart
      </div>
    </div>
  );
}
