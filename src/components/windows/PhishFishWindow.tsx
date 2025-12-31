import { useEffect, useMemo, useRef, useState } from "react";

type Verdict = "phish" | "legit";

type Email = {
  id: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  returnPath?: string;
  subject: string;
  snippet: string;
  linkText?: string;
  linkUrl?: string;
  attachments?: string[];
  auth: { spf: "pass" | "fail" | "softfail"; dkim: "pass" | "fail"; dmarc: "pass" | "fail" };
  isPhish: boolean;
  reasons: string[];
};

type Stats = {
  score: number;
  streak: number;
  bestStreak: number;
  total: number;
  correct: number;
  caught: number;
};

type Fish = {
  id: string;
  x: number;
  y: number;
  vx: number;
  size: number;
  emailId: string;
  hue: number;
};

const STORAGE_KEY = "chloe_phishfish_stats_v1";

// Higher = chunkier pixels
const PIXEL_SCALE = 4;

// NEW: top "land" strip so the cat sits above the water (inside the canvas, so it won't clip)
const LAND_ROWS = 10; // in low-res pixels (try 8–14)
const LAND_PX = LAND_ROWS * PIXEL_SCALE; // in real pixels (used for click restriction)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function extractDomain(email: string) {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : email;
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { score: 0, streak: 0, bestStreak: 0, total: 0, correct: 0, caught: 0 };
    const p = JSON.parse(raw) as Partial<Stats>;
    return {
      score: Number(p.score || 0),
      streak: Number(p.streak || 0),
      bestStreak: Number(p.bestStreak || 0),
      total: Number(p.total || 0),
      correct: Number(p.correct || 0),
      caught: Number(p.caught || 0),
    };
  } catch {
    return { score: 0, streak: 0, bestStreak: 0, total: 0, correct: 0, caught: 0 };
  }
}
function saveStats(s: Stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function PhishFishWindow() {
  const emails = useMemo<Email[]>(
    () => [
      {
        id: "p-usps",
        fromName: "USPS Delivery",
        fromEmail: "notify@usps-track-now.com",
        replyTo: "support@usps-track-now.com",
        returnPath: "bounce@usps-track-now.com",
        subject: "Delivery failed — action required",
        snippet: "We couldn't deliver your package. Pay a small redelivery fee to reschedule.",
        linkText: "Pay redelivery fee",
        linkUrl: "https://usps-track-now.com/pay",
        auth: { spf: "fail", dkim: "fail", dmarc: "fail" },
        isPhish: true,
        reasons: ["Not an official USPS domain.", "Unexpected payment request.", "Auth checks fail (SPF/DKIM/DMARC)."],
      },
      {
        id: "p-it",
        fromName: "IT Support",
        fromEmail: "it-support@purdue-helpdesk-secure.com",
        replyTo: "it-support@purdue-helpdesk-secure.com",
        returnPath: "mailer@purdue-helpdesk-secure.com",
        subject: "URGENT: Account disabled in 30 minutes",
        snippet: "Suspicious sign-in detected. Verify your account to prevent lockout.",
        linkText: "Verify Now",
        linkUrl: "https://purdue-helpdesk-secure.com/login",
        auth: { spf: "softfail", dkim: "fail", dmarc: "fail" },
        isPhish: true,
        reasons: ["Lookalike domain (not purdue.edu).", "Urgency pressure tactic.", "Auth signals are bad."],
      },
      {
        id: "l-github",
        fromName: "GitHub",
        fromEmail: "noreply@github.com",
        replyTo: "noreply@github.com",
        returnPath: "noreply@github.com",
        subject: "Security alert: new sign-in from Chrome on macOS",
        snippet: "We noticed a new sign-in. If this was you, no action is needed.",
        linkText: "Review security activity",
        linkUrl: "https://github.com/settings/security",
        auth: { spf: "pass", dkim: "pass", dmarc: "pass" },
        isPhish: false,
        reasons: ["Expected sender domain (github.com).", "No credential/payment pressure.", "Auth checks pass."],
      },
      {
        id: "l-spotify",
        fromName: "Spotify",
        fromEmail: "no-reply@spotify.com",
        replyTo: "no-reply@spotify.com",
        returnPath: "no-reply@spotify.com",
        subject: "Your weekly playlist is ready",
        snippet: "We made a playlist based on what you’ve been listening to.",
        linkText: "Listen now",
        linkUrl: "https://open.spotify.com/",
        auth: { spf: "pass", dkim: "pass", dmarc: "pass" },
        isPhish: false,
        reasons: ["Expected sender domain.", "Normal marketing content.", "Auth checks pass."],
      },
      {
        id: "p-invoice",
        fromName: "Accounts",
        fromEmail: "billing@invoices-payments.com",
        replyTo: "billing@invoices-payments.com",
        returnPath: "billing@invoices-payments.com",
        subject: "Invoice #48219 — Payment pending",
        snippet: "Your invoice is attached. Please review and confirm payment status.",
        attachments: ["Invoice_48219.pdf.html"],
        auth: { spf: "pass", dkim: "fail", dmarc: "fail" },
        isPhish: true,
        reasons: ["Attachment is HTML pretending to be a PDF.", "DKIM/DMARC fail.", "Generic/vague billing request."],
      },
      {
        id: "l-campus",
        fromName: "Purdue Announcements",
        fromEmail: "announcements@purdue.edu",
        replyTo: "announcements@purdue.edu",
        returnPath: "announcements@purdue.edu",
        subject: "Campus update",
        snippet: "Quick campus update and reminders for the week.",
        linkText: "Read more",
        linkUrl: "https://www.purdue.edu/",
        auth: { spf: "pass", dkim: "pass", dmarc: "pass" },
        isPhish: false,
        reasons: ["Official domain.", "Normal content.", "Auth checks pass."],
      },
    ],
    []
  );

  const [stats, setStats] = useState<Stats>(() => loadStats());
  useEffect(() => saveStats(stats), [stats]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const [canvasSize, setCanvasSize] = useState({ w: 680, h: 260 });

  const fishRef = useRef<Fish[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);

  const [cast, setCast] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<"pond" | "caught" | "result">("pond");
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [lastResult, setLastResult] = useState<{ wasCorrect: boolean; verdict: Verdict; email: Email } | null>(null);

  const colors = {
    pondTop: "#b7e9ff",     // light blue surface
    pondBottom: "#2b6fb3",  // deep water blue
    lily: "#3a9c7a",
    lilyVein: "#2b7a5e",
    foam: "rgba(255,255,255,0.55)",
    ink: "#163b2a",
    paper: "#fffdf7",
    border: "#9bbfae",
  };

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);

  function spawnFish() {
    const fish: Fish[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const email = pick(emails);
      fish.push({
        id: `fish-${Date.now()}-${i}`,
        x: rand(20, canvasSize.w - 20),
        y: rand(60 + LAND_PX, canvasSize.h - 30),
        vx: rand(18, 40) * (Math.random() < 0.5 ? 1 : -1),
        size: rand(10, 16),
        emailId: email.id,
        hue: rand(330, 360),
      });
    }
    fishRef.current = fish;
  }

  useEffect(() => {
    const update = () => {
      const w = wrapperRef.current?.clientWidth ?? 680;
      setCanvasSize({ w, h: 260 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    spawnFish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.w, canvasSize.h]);

  function drawPixelCat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const fur = "#f5f1e8";      // off-white
    const patches = "#b98b5a";  // brown
    const outline = "#d1c8be";  
    const eyes = "#2b2b2b";
  
    // Helper to draw the base cat shape
    const drawBase = (ox: number, oy: number, color: string) => {
      ctx.fillStyle = color;
  
      // head
      ctx.fillRect(x + 2 + ox, y + 2 + oy, 10, 6);
      // body
      ctx.fillRect(x + 1 + ox, y + 7 + oy, 12, 4);
      // ears
      ctx.fillRect(x + 2 + ox, y + 1 + oy, 2, 2);
      ctx.fillRect(x + 10 + ox, y + 1 + oy, 2, 2);
      // paw
      ctx.fillRect(x + 7 + ox, y + 10 + oy, 2, 2);
    };
  
    // --- OUTLINE PASS (draw around all sides) ---
    const outlineOffsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
  
    for (const [ox, oy] of outlineOffsets) {
      drawBase(ox, oy, outline);
    }
  
    // --- MAIN BODY ---
    drawBase(0, 0, fur);
  
    // Brown patches
    ctx.fillStyle = patches;
    ctx.fillRect(x + 3, y + 3, 3, 2);
    ctx.fillRect(x + 6, y + 8, 3, 2);
  
    // Eyes
    ctx.fillStyle = eyes;
    ctx.fillRect(x + 5, y + 4, 1, 1);
    ctx.fillRect(x + 8, y + 4, 1, 1);
  
    // Paw color
    ctx.fillStyle = patches;
    ctx.fillRect(x + 7, y + 10, 2, 2);
  
    // --- Tail wag animation (NO outline) ---
const wag = Math.sin(t / 180);
const frame = wag > 0.35 ? 1 : wag < -0.35 ? -1 : 0;

const tailBlock = (tx: number, ty: number) => {
  ctx.fillStyle = patches;
  ctx.fillRect(tx, ty, 2, 2);
};

const tailCoords =
  frame === 1
    ? [[13, 7], [15, 6], [17, 5]]
    : frame === -1
    ? [[13, 10], [15, 11], [17, 12]]
    : [[13, 9], [15, 9], [17, 9]];

for (const [tx, ty] of tailCoords) {
  tailBlock(x + tx, y + ty);
}

  }
  
  
  

  function draw(t: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = canvas.getContext("2d");
    if (!out) return;

    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const buf = offscreenRef.current;
    const ctx = buf.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvasSize;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const lw = Math.max(1, Math.floor(w / PIXEL_SCALE));
    const lh = Math.max(1, Math.floor(h / PIXEL_SCALE));
    buf.width = lw;
    buf.height = lh;

    out.imageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    const sx = (x: number) => Math.round(x / PIXEL_SCALE);
    const sy = (y: number) => Math.round(y / PIXEL_SCALE);
    const ss = (s: number) => Math.max(1, Math.round(s / PIXEL_SCALE));

    // LAND STRIP (so cat is above water, not clipped)
    const waterStart = LAND_ROWS;

    ctx.fillStyle = "#f7fbf7";
    ctx.fillRect(0, 0, lw, waterStart);

    // Water gradient
    const grad = ctx.createLinearGradient(0, waterStart, 0, lh);
    grad.addColorStop(0, colors.pondTop);
    grad.addColorStop(1, colors.pondBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, waterStart, lw, lh - waterStart);

    // Shoreline
    ctx.fillStyle = "#4a689e";
    ctx.fillRect(0, waterStart - 1, lw, 1);

    // Foam bubbles (in water)
    ctx.fillStyle = colors.foam;
    for (let i = 0; i < 16; i++) {
      const bx = ((i * 97) % w) / PIXEL_SCALE;
      const by = (LAND_PX + 18 + ((i * 37) % 40)) / PIXEL_SCALE;
      const r = (4 + (i % 3)) / PIXEL_SCALE;
      ctx.beginPath();
      ctx.arc(Math.round(bx), Math.round(by), Math.max(1, Math.round(r)), 0, Math.PI * 2);
      ctx.fill();
    }


    // Cat sits on land
    const catBaseX = Math.floor(lw / 2) - 7;
    const catBaseY = 1;
    drawPixelCat(ctx, catBaseX, catBaseY, t);

    // Line starts at paw
    const lineStart = { x: catBaseX + 8, y: catBaseY + 14 };

    // Line + bobber
    if (cast) {
      ctx.strokeStyle = "rgba(10,10,10,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(sx(cast.x), sy(cast.y));
      ctx.stroke();

      ctx.fillStyle = "#ff8fb1";
      ctx.beginPath();
      ctx.arc(sx(cast.x), sy(cast.y), 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx(cast.x), sy(cast.y) - 1, 1, 1);
    } else {
      ctx.strokeStyle = "rgba(10,10,10,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(lineStart.x, lineStart.y + 10);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(lineStart.x, lineStart.y + 10, 1, 1);
    }

    // Fish
    for (const f of fishRef.current) {
      const bodyColor = `hsl(${f.hue}deg 60% 60%)`;
      const finColor = `hsl(${f.hue + 10}deg 55% 38%)`;

      const fx = sx(f.x);
      const fy = sy(f.y);
      const size = Math.max(2, ss(f.size));

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(fx, fy, size + 2, size, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = finColor;
      ctx.beginPath();
      if (f.vx >= 0) {
        ctx.moveTo(fx - (size + 2), fy);
        ctx.lineTo(fx - (size + 5), fy - Math.max(1, size - 1));
        ctx.lineTo(fx - (size + 5), fy + Math.max(1, size - 1));
      } else {
        ctx.moveTo(fx + (size + 2), fy);
        ctx.lineTo(fx + (size + 5), fy - Math.max(1, size - 1));
        ctx.lineTo(fx + (size + 5), fy + Math.max(1, size - 1));
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.ink;
      ctx.fillRect(fx + (f.vx >= 0 ? 1 : -1), fy - 1, 1, 1);
    }

    // Upscale buffer to output
    out.clearRect(0, 0, w, h);
    out.drawImage(buf, 0, 0, lw, lh, 0, 0, w, h);

  
  }

  function step(t: number) {
    const dt = lastTRef.current ? (t - lastTRef.current) / 1000 : 0;
    lastTRef.current = t;

    const { w, h } = canvasSize;

    for (const f of fishRef.current) {
      f.x += f.vx * dt;
      f.y += Math.sin((t / 1000) * 2 + f.x / 80) * 0.25;

      if (f.x < 10) {
        f.x = 10;
        f.vx = Math.abs(f.vx);
      }
      if (f.x > w - 10) {
        f.x = w - 10;
        f.vx = -Math.abs(f.vx);
      }

      // keep fish in water zone
      f.y = clamp(f.y, LAND_PX + 12, h - 25);
    }

    // Catch check (unchanged)
    if (cast && phase === "pond") {
      const catchRadius = 16;
      const fish = fishRef.current;

      const nearby = fish
        .map((f) => ({ f, d: Math.hypot(f.x - cast.x, f.y - cast.y) }))
        .filter((x) => x.d <= catchRadius)
        .sort((a, b) => a.d - b.d);

      if (nearby.length && Math.random() < 0.8) {
        const caughtFish = nearby[0].f;
        const email = emails.find((e) => e.id === caughtFish.emailId) ?? pick(emails);

        setCurrentEmail(email);
        setPhase("caught");
        setCast(null);

        fishRef.current = fishRef.current.filter((x) => x.id !== caughtFish.id);

        setTimeout(() => {
          const replacement = pick(emails);
          fishRef.current.push({
            id: `fish-${Date.now()}-${Math.random()}`,
            x: Math.random() < 0.5 ? 12 : w - 12,
            y: rand(LAND_PX + 20, h - 30),
            vx: rand(18, 40) * (Math.random() < 0.5 ? 1 : -1),
            size: rand(10, 16),
            emailId: replacement.id,
            hue: rand(110, 150),
          });
        }, 700);

        setStats((s) => ({ ...s, caught: s.caught + 1 }));
      }
    }

    draw(t);
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast, phase, canvasSize.w, canvasSize.h]);

  function onCast(e: React.MouseEvent<HTMLCanvasElement>) {
    if (phase !== "pond") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only allow casts in the water area
    if (y < LAND_PX) return;

    setCast({ x, y });
  }

  function judge(verdict: Verdict) {
    if (!currentEmail) return;
    const wasCorrect = (verdict === "phish") === currentEmail.isPhish;

    setStats((s) => {
      const nextTotal = s.total + 1;
      const nextCorrect = s.correct + (wasCorrect ? 1 : 0);
      const nextStreak = wasCorrect ? s.streak + 1 : 0;
      const nextBest = Math.max(s.bestStreak, nextStreak);

      const delta = wasCorrect ? 10 + Math.min(12, s.streak * 2) : -5;
      const nextScore = Math.max(0, s.score + delta);

      return { ...s, score: nextScore, streak: nextStreak, bestStreak: nextBest, total: nextTotal, correct: nextCorrect };
    });

    setLastResult({ wasCorrect, verdict, email: currentEmail });
    setPhase("result");
  }

  function nextRound() {
    setCurrentEmail(null);
    setLastResult(null);
    setPhase("pond");
    setCast(null);
  }



  const card = (children: React.ReactNode) => (
    <div
      style={{
        background: colors.paper,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
      }}
    >
      {children}
    </div>
  );

  return (
      <div style={{ background: "transparent", padding: 12 }}>
    
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1e5a3f" }}>Toki’s Phish-Fish</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 13, color: "#1e5a3f" }}>
          <div>
            <b>Score:</b> {stats.score}
          </div>
          <div>
            <b>Streak:</b> {stats.streak}
          </div>
          <div>
            <b>Best:</b> {stats.bestStreak}
          </div>
          <div>
            <b>Accuracy:</b> {accuracy}%
          </div>
          <div>
            <b>Caught:</b> {stats.caught}
          </div>
        </div>
      </div>

    

      <div
  ref={wrapperRef}
  style={{
    width: "100%",
    marginBottom: 12,
    display: "block",
    flex: "0 0 auto",
    overflow: "hidden",
    alignSelf: "flex-start",
  }}
>
  {card(
    <div style={{ display: "block", flex: "0 0 auto", alignSelf: "flex-start" }}>
      {/* everything inside stays the same */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: "#1e5a3f" }}>
          {phase === "pond" ? "Cast your line!" : phase === "caught" ? "You caught one!" : "How did you do?"}
        </div>
        <div style={{ fontSize: 12, color: "#2f6b4e" }}>
          {phase === "pond" ? "Click the water to cast " : phase === "caught" ? "Decide: phish or legit" : "Read the clues"}
        </div>
      </div>

      <div style={{ padding: 10 }}>
  <canvas
    ref={canvasRef}
    onClick={onCast}
    style={{
      width: "100%",
      maxWidth: "100%",
      height: canvasSize.h,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      cursor: phase === "pond" ? "crosshair" : "default",
      imageRendering: "pixelated",
      boxSizing: "border-box",
      display: "block",
    }}
  />
</div>

    </div>
  )}
</div>


      {phase !== "pond" && currentEmail && (
        <div style={{ marginBottom: 12 }}>
          {card(
              <div className="email-panel-finders">

              <div style={{ fontWeight: 800, fontSize: 12, color: "#1e5a3f" }}>Email caught!</div>

              <div
  style={{
    marginTop: 10,
    fontFamily: '"FindersKeepers", monospace',
    fontSize: "20px",
    lineHeight: 1.35,
    letterSpacing: "0.4px",
    WebkitFontSmoothing: "none",
  }}
>

  <div style={{ fontSize: 20, color: "#4b7b63" }}>From</div>
  <div>
    {currentEmail.fromName}{" "}
    <span style={{ fontWeight: 400 }}>
      {`<${currentEmail.fromEmail}>`}
    </span>
  </div>

  <div style={{ fontSize: 20, color: "#4b7b63", marginTop: 6 }}>Reply-To</div>
  <div>
    {currentEmail.replyTo ?? currentEmail.fromEmail}
  </div>

  <div style={{ fontSize: 20, color: "#4b7b63", marginTop: 6 }}>Return-Path</div>
  <div>
    {currentEmail.returnPath ?? "(not shown)"}
  </div>

  <div style={{ fontSize: 20, color: "#4b7b63", marginTop: 10 }}>Subject</div>
  <div>
    {currentEmail.subject}
  </div>

  <div style={{ fontSize: 20, color: "#4b7b63", marginTop: 8 }}>Preview</div>
  <div>
    {currentEmail.snippet}
  </div>

  {currentEmail.attachments && (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 20, color: "#4b7b63" }}>Attachments</div>
      
        {currentEmail.attachments.map((a) => (
          <div key={a}>{a}</div>
        ))}
      
    </div>
  )}

  <div style={{ marginTop: 10 }}>
    Domain is {extractDomain(currentEmail.fromEmail)} | Auth:{" "}
    <span>
      SPF={currentEmail.auth.spf} DKIM={currentEmail.auth.dkim} DMARC={currentEmail.auth.dmarc}
    </span>
  </div>
</div>


              {phase === "caught" && (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => judge("phish")}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 12,
                      fontFamily: '"FindersKeepers", monospace',
                      fontSize: "23px",
                      border: "1px solid #c7a1a1",
                      background: "#ffe7e7",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    PHISH
                  </button>
                  <button
                    onClick={() => judge("legit")}
                    style={{
                      padding: "7px 12px",
                      fontFamily: '"FindersKeepers", monospace',
                      fontSize: "23px",
                      borderRadius: 12,
                      border: "1px solid #a8c9b6",
                      background: "#e7ffe7",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                  LEGIT
                  </button>
                  <button
                    onClick={nextRound}
                    style={{
                      marginLeft: "auto",
                      fontFamily: '"FindersKeepers", monospace',
            fontSize: "23px",
                      padding: "7px 12px",
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                    title="Skip (no points)"
                  >
                    Let it go 
                  </button>
                </div>
              )}

              {phase === "result" && lastResult && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: lastResult.wasCorrect ? "#eafff1" : "#fff1f1",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#1e5a3f" }}>
                    {lastResult.wasCorrect ? "Correct!" : "Almost! "}{" "}
                    <span style={{ fontWeight: 400 }}>(It was {lastResult.email.isPhish ? "PHISH" : "LEGIT"})</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#1d3b2c" }}>
                    Why:
                    <ul style={{ margin: "6px 0 0 18px", lineHeight: 1.5 }}>
                      {lastResult.email.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      onClick={nextRound}
                      style={{
                        padding: "7px 12px",
                        fontFamily: '"FindersKeepers", monospace',
            fontSize: "23px",
                        borderRadius: 12,
                        border: `1px solid ${colors.border}`,
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Fish again →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
