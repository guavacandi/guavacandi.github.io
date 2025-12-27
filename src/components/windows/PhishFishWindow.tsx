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
  const [canvasSize, setCanvasSize] = useState({ w: 680, h: 260 });

  const fishRef = useRef<Fish[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);

  const [cast, setCast] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<"pond" | "caught" | "result">("pond");
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [lastResult, setLastResult] = useState<{ wasCorrect: boolean; verdict: Verdict; email: Email } | null>(null);

  const colors = {
    pondTop: "#b7f3d0",
    pondBottom: "#2b6b4f",
    lily: "#2d8a58",
    lilyVein: "#1e6a43",
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
        y: rand(60, canvasSize.h - 30),
        vx: rand(18, 40) * (Math.random() < 0.5 ? 1 : -1),
        size: rand(10, 16),
        emailId: email.id,
        hue: rand(110, 150),
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

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvasSize;

    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors.pondTop);
    grad.addColorStop(1, colors.pondBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = colors.foam;
    for (let i = 0; i < 16; i++) {
      const bx = (i * 97) % w;
      const by = 25 + ((i * 37) % 40);
      ctx.beginPath();
      ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    const pads = [
      { x: w * 0.18, y: h * 0.23, r: 22 },
      { x: w * 0.42, y: h * 0.18, r: 18 },
      { x: w * 0.77, y: h * 0.26, r: 20 },
    ];
    for (const p of pads) {
      ctx.fillStyle = colors.lily;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = colors.lilyVein;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.r, p.y - 2);
      ctx.stroke();
    }

    if (cast) {
      ctx.strokeStyle = "rgba(10,10,10,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, 0);
      ctx.lineTo(cast.x, cast.y);
      ctx.stroke();

      ctx.fillStyle = "#ff8fb1";
      ctx.beginPath();
      ctx.arc(cast.x, cast.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cast.x, cast.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of fishRef.current) {
      const bodyColor = `hsl(${f.hue}deg 55% 45%)`;
      const finColor = `hsl(${f.hue + 10}deg 55% 38%)`;

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.size * 1.6, f.size, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = finColor;
      ctx.beginPath();
      if (f.vx >= 0) {
        ctx.moveTo(f.x - f.size * 1.6, f.y);
        ctx.lineTo(f.x - f.size * 2.4, f.y - f.size * 0.8);
        ctx.lineTo(f.x - f.size * 2.4, f.y + f.size * 0.8);
      } else {
        ctx.moveTo(f.x + f.size * 1.6, f.y);
        ctx.lineTo(f.x + f.size * 2.4, f.y - f.size * 0.8);
        ctx.lineTo(f.x + f.size * 2.4, f.y + f.size * 0.8);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.ink;
      ctx.beginPath();
      ctx.arc(f.x + (f.vx >= 0 ? f.size * 0.8 : -f.size * 0.8), f.y - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.font = "12px Tahoma, sans-serif";
    ctx.fillText("Click the pond to cast. Catch an email-fish 🐟", 12, h - 10);
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
      f.y = clamp(f.y, 55, h - 25);
    }

    // Catch check
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

        // respawn later
        setTimeout(() => {
          const replacement = pick(emails);
          fishRef.current.push({
            id: `fish-${Date.now()}-${Math.random()}`,
            x: Math.random() < 0.5 ? 12 : w - 12,
            y: rand(70, h - 30),
            vx: rand(18, 40) * (Math.random() < 0.5 ? 1 : -1),
            size: rand(10, 16),
            emailId: replacement.id,
            hue: rand(110, 150),
          });
        }, 700);

        setStats((s) => ({ ...s, caught: s.caught + 1 }));
      }
    }

    draw();
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
    setCast({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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

  function resetStats() {
    setStats({ score: 0, streak: 0, bestStreak: 0, total: 0, correct: 0, caught: stats.caught });
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
    <div style={{ height: "100%", background: "#eaf7ef", padding: 12, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1e5a3f" }}>🐈 Toki’s Phish-Fish</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 13, color: "#1e5a3f" }}>
          <div><b>Score:</b> {stats.score}</div>
          <div><b>Streak:</b> {stats.streak}</div>
          <div><b>Best:</b> {stats.bestStreak}</div>
          <div><b>Accuracy:</b> {accuracy}%</div>
          <div><b>Caught:</b> {stats.caught}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button
          onClick={resetStats}
          style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${colors.border}`, background: "#fff", cursor: "pointer" }}
        >
          Reset score (keep caught)
        </button>
        
      </div>

      <div style={{ width: "106%", marginBottom: 12 }} ref={wrapperRef}>
        {card(
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: "#1e5a3f" }}>
                {phase === "pond" ? "Cast your line!" : phase === "caught" ? "You caught one!" : "How did you do?"}
              </div>
              <div style={{ fontSize: 12, color: "#2f6b4e" }}>
                {phase === "pond" ? "Click the water to cast 🎣" : phase === "caught" ? "Decide: phish or legit" : "Read the clues"}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onClick={onCast}
              style={{
                width: "100%",
                height: canvasSize.h,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                cursor: phase === "pond" ? "crosshair" : "default",
              }}
            />
          </>
        )}
      </div>

      {phase !== "pond" && currentEmail && (
        <div style={{ marginBottom: 12 }}>
          {card(
            <>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1e5a3f" }}>📨 Email caught!</div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#4b7b63" }}>From</div>
                <div style={{ fontWeight: 700 }}>
                  {currentEmail.fromName}{" "}
                  <span style={{ fontWeight: 400, color: "#284b3a" }}>{`<${currentEmail.fromEmail}>`}</span>
                </div>

                <div style={{ fontSize: 12, color: "#4b7b63", marginTop: 6 }}>Reply-To</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#1e5a3f" }}>
                  {currentEmail.replyTo ?? currentEmail.fromEmail}
                </div>

                <div style={{ fontSize: 12, color: "#4b7b63", marginTop: 6 }}>Return-Path</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#1e5a3f" }}>
                  {currentEmail.returnPath ?? "(not shown)"}
                </div>

                <div style={{ fontSize: 12, color: "#4b7b63", marginTop: 10 }}>Subject</div>
                <div style={{ fontWeight: 800 }}>{currentEmail.subject}</div>

                <div style={{ fontSize: 12, color: "#4b7b63", marginTop: 8 }}>Preview</div>
                <div style={{ lineHeight: 1.4, color: "#1d3b2c" }}>{currentEmail.snippet}</div>

                {(currentEmail.linkText || currentEmail.linkUrl) && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#4b7b63" }}>Link</div>
                    <div>
                      <span style={{ fontWeight: 700 }}>{currentEmail.linkText || "Link"}</span>
                      {currentEmail.linkUrl && (
                        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#0a66c2" }}>
                          {currentEmail.linkUrl}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#4b7b63" }}>Attachments</div>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {currentEmail.attachments.map((a) => (
                        <li key={a} style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 12, color: "#2f6b4e" }}>
                  Cozy check: domain is <b>{extractDomain(currentEmail.fromEmail)}</b> &nbsp;|&nbsp; Auth:{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    SPF={currentEmail.auth.spf} DKIM={currentEmail.auth.dkim} DMARC={currentEmail.auth.dmarc}
                  </span>
                </div>
              </div>

              {phase === "caught" && (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => judge("phish")}
                    style={{ padding: "7px 12px", borderRadius: 12, border: "1px solid #c7a1a1", background: "#ffe7e7", cursor: "pointer", fontWeight: 700 }}
                  >
                    🚨 PHISH
                  </button>
                  <button
                    onClick={() => judge("legit")}
                    style={{ padding: "7px 12px", borderRadius: 12, border: "1px solid #a8c9b6", background: "#e7ffe7", cursor: "pointer", fontWeight: 700 }}
                  >
                    ✅ LEGIT
                  </button>
                  <button
                    onClick={nextRound}
                    style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: 12, border: `1px solid ${colors.border}`, background: "#fff", cursor: "pointer" }}
                    title="Skip (no points)"
                  >
                    Let it go 🌊
                  </button>
                </div>
              )}

              {phase === "result" && lastResult && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: lastResult.wasCorrect ? "#eafff1" : "#fff1f1" }}>
                  <div style={{ fontWeight: 800, color: "#1e5a3f" }}>
                    {lastResult.wasCorrect ? "Correct! ✨" : "Almost! 🌿"}{" "}
                    <span style={{ fontWeight: 400 }}>(It was {lastResult.email.isPhish ? "PHISH" : "LEGIT"})</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#1d3b2c" }}>
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
                      style={{ padding: "7px 12px", borderRadius: 12, border: `1px solid ${colors.border}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}
                    >
                      Fish again →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      
    </div>
  );
}
