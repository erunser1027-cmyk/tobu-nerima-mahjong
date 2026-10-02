import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ========================================================
// 大会モード（段階1：入場演出・レギュレーション・参加受付・候補日投票）
// ========================================================

// 運営メニューの管理パスワード（コードに入るため、詳しい人なら読める。うっかり操作を防ぐ簡易な鍵）
const ADMIN_PASS = "1234";
const ADMIN_NAME = "りょう";
const APP_URL = "https://tleague.nerima-night-crew.com";
const BG_URL = "/taikai/taikai_bg.jpg";
const BGM_URL = "/taikai/taikai_bgm.mp3";
const BG_RATIO = 1672 / 941; // 背景画像の縦横比（中央の牌の位置計算用）
const TILE_Y = 0.36;          // 背景画像の中で、中央の牌がある高さ（上から36%）
const VOL_INTRO = 0.9;        // 入場までの音量
const VOL_STAY = 0.10;        // 入場後に流し続ける音量（2026-10-02 本人が実機で10に決定）

const DEFAULT_SETTINGS = {
  edition: "第2回",
  subtitle: "T.LEAGUE CHAMPIONSHIP",
  format: "tag",
  entryFee: 3000,
  prelimGames: 3,
  finalGames: 3,
  finalists: 2,
  thirdMode: "prelimTop",
  tiebreak: "合計チップ数",
  seatMode: "auto",
  teamMode: "vote",
  prizes: {},
  note: "",
};

const PRIZES = [
  { key: "first", label: "優勝" },
  { key: "second", label: "準優勝" },
  { key: "third", label: "3位" },
  { key: "booby", label: "ブービー賞", desc: "決勝に進めなかった人のうち、最下位から2番目" },
  { key: "chip", label: "チップ賞", desc: "大会通算のチップが最多の人" },
  { key: "highscore", label: "最高得点賞", desc: "予選・決勝を通した1半荘の最高素点" },
  { key: "yakuman", label: "役満賞", desc: "役満1回につき、他チームの参加者1人500円", noAmount: true },
];

// ---- 日付・金額の表示 ----
const DOW = ["日", "月", "火", "水", "木", "金", "土"];
function fmtDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${DOW[dt.getDay()]})`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const yen = n => `${Number(n || 0).toLocaleString()}円`;

// ---- チーム決めの方法（投票） ----
const TEAM_LABEL = { amida: "あみだくじ", balanced: "成績をもとに戦力が均等になるようランダム", manual: "運営が指定", vote: "参加者の投票で決定" };
const TEAM_SHORT = { amida: "あみだくじ", balanced: "戦力均衡ランダム" };
function teamTally(tEntries) {
  const v = { amida: 0, balanced: 0 };
  tEntries.forEach(e => { if (e.status === "join" && v[e.team_vote] !== undefined) v[e.team_vote]++; });
  return v;
}
const teamDecision = v => (v.balanced > v.amida ? "balanced" : "amida"); // 同数（0票同士も）はあみだくじ
function entryClosed(t) {
  if (!t) return true;
  return t.status !== "entry" || !!(t.entry_deadline && todayStr() > t.entry_deadline);
}
const settingsOf = t => ({ ...DEFAULT_SETTINGS, ...(t?.settings || {}) });

// ---- BGM（Web Audio：iPhoneでも音量を変えられる方式。画面を離れても1つだけ鳴るよう、ファイル内で1つだけ持つ） ----
let actx = null, gainNode = null, bgmBuf = null, bgmLoading = null, bgmSrc = null;

// 大会タブのボタンを押した瞬間に呼ぶ（iPhoneは、タップの瞬間でないと音の準備を許可しないため）
export function unlockTaikaiAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) {
      actx = new AC();
      gainNode = actx.createGain();
      gainNode.connect(actx.destination);
    }
    if (actx.state === "suspended") actx.resume();
    // 無音を1回鳴らして、音声を有効にしておく（古いiOS対策）
    const b = actx.createBuffer(1, 1, 22050);
    const s = actx.createBufferSource();
    s.buffer = b; s.connect(actx.destination); s.start(0);
  } catch (e) {
    console.error("taikai audio unlock failed:", e);
  }
}
function loadBgm() {
  if (bgmBuf) return Promise.resolve(bgmBuf);
  if (!bgmLoading) {
    bgmLoading = fetch(BGM_URL)
      .then(r => { if (!r.ok) throw new Error(`BGM ${r.status}`); return r.arrayBuffer(); })
      .then(a => new Promise((ok, ng) => actx.decodeAudioData(a, ok, ng)))
      .then(b => { bgmBuf = b; return b; })
      .catch(e => { bgmLoading = null; throw e; });
  }
  return bgmLoading;
}
function stopBgm() {
  if (bgmSrc) {
    try { bgmSrc.stop(); } catch (e) { /* 停止済み */ }
    try { bgmSrc.disconnect(); } catch (e) { /* 切断済み */ }
    bgmSrc = null;
  }
}
// isIntro()：鳴らし始める時点で、まだ入場前かどうか（入場前なら大きく、入場後なら小さく）
async function startBgm(isIntro) {
  if (!actx) unlockTaikaiAudio();
  if (!actx) return;
  try {
    if (actx.state === "suspended") await actx.resume();
    const buf = await loadBgm();
    stopBgm();
    bgmSrc = actx.createBufferSource();
    bgmSrc.buffer = buf;
    bgmSrc.loop = true;
    bgmSrc.connect(gainNode);
    const t = actx.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(isIntro() ? VOL_INTRO : VOL_STAY, t);
    bgmSrc.start();
  } catch (e) {
    console.error("taikai bgm failed:", e);
  }
}
function lowerBgm() {
  if (!actx || !gainNode) return;
  const t = actx.currentTime;
  gainNode.gain.cancelScheduledValues(t);
  gainNode.gain.setValueAtTime(gainNode.gain.value, t);
  gainNode.gain.linearRampToValueAtTime(VOL_STAY, t + 1.5);
}

// ---- レギュレーション（画面表示とLINE用の文章は、この1つの関数から作る） ----
function regulationLines(t, tDates, tEntries = []) {
  const s = settingsOf(t);
  const unit = s.format === "tag" ? "チーム" : "人";
  const L = [];
  L.push(["候補日", tDates.length ? tDates.map(d => fmtDate(d.date)).join("／") : "未定"]);
  if (t.entry_deadline) L.push(["受付締切", fmtDate(t.entry_deadline)]);
  L.push(["形式", s.format === "tag" ? "タッグ戦（2人1組）" : "個人戦"]);
  L.push(["参加費", `${yen(s.entryFee)}（場代は別）`]);
  L.push(["進行", `予選${s.prelimGames}回 → 上位${s.finalists}${unit}が決勝（${s.finalGames}回）`]);
  L.push(["3位", s.thirdMode === "playoff"
    ? `予選敗退の上位2${unit}で3位決定戦（決勝と同時進行）`
    : `決勝に進めなかった${unit}のうち、予選の最上位`]);
  L.push(["同点", `${s.tiebreak}で決定`]);
  if (s.format === "tag") {
    if (s.teamMode === "vote") {
      const v = teamTally(tEntries);
      L.push(["チーム決め", entryClosed(t)
        ? `参加者の投票で決定 → ${TEAM_SHORT[teamDecision(v)]}（あみだ ${v.amida}票／戦力均衡 ${v.balanced}票）`
        : `参加者の投票で決定（締切時点で多い方。同数はあみだくじ）\n現在：あみだ ${v.amida}票／戦力均衡 ${v.balanced}票`]);
    } else {
      L.push(["チーム決め", TEAM_LABEL[s.teamMode] || "未定"]);
    }
  }
  L.push(["席順", s.seatMode === "auto" ? "アプリで自動割り当て" : "当日くじで決定"]);
  const prizes = PRIZES.filter(p => s.prizes?.[p.key]?.on).map(p => {
    const amt = s.prizes[p.key].amount;
    const hasAmt = Number(amt) > 0;
    const money = !p.noAmount && hasAmt ? ` ${yen(amt)}` : "";
    const notes = [p.desc, !p.noAmount && !hasAmt ? "金額は参加人数の確定後に発表" : ""].filter(Boolean).join("／");
    return `${p.label}${money}${notes ? `（${notes}）` : ""}`;
  });
  L.push(["賞金", "参加費の総額を全額、賞金に配分します。金額は参加人数の確定後に決定"]);
  L.push(["賞", prizes.length ? prizes.join("／") : "未定"]);
  if (s.note) L.push(["補足", s.note]);
  return L;
}
function statusLabel(t) {
  if (!t) return "";
  if (t.status === "entry") return "参加受付中";
  if (t.status === "closed") return "受付終了";
  return t.status;
}
function lineText(t, tDates, tEntries) {
  const s = settingsOf(t);
  const head = `【${s.edition ? s.edition + " " : ""}${t.name}】${statusLabel(t)}${t.entry_deadline ? `（締切 ${fmtDate(t.entry_deadline)}）` : ""}`;
  const body = regulationLines(t, tDates, tEntries).map(([k, v]) => `■ ${k}：${v}`).join("\n");
  return `${head}\n${body}\n▼ 参加・不参加と候補日の投票はアプリから\n${APP_URL}`;
}

// ---- スタイル ----
const CSS = `
.tk-intro{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:13vh;overflow:hidden;background:#000;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
.tk-intro .tk-bgz{position:absolute;inset:0;background:url(${BG_URL}) center/cover no-repeat;transform:scale(1.35);opacity:0;animation:tkCam 2.3s cubic-bezier(.15,.7,.2,1) forwards}
@keyframes tkCam{0%{opacity:0;transform:scale(1.35)}18%{opacity:1}100%{opacity:1;transform:scale(1.02)}}
.tk-intro .tk-vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,transparent 30%,transparent 48%,rgba(0,0,0,.78) 72%,rgba(0,0,0,.9) 100%)}
.tk-intro canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.tk-rays{position:absolute;width:220vmax;height:220vmax;left:50%;top:50%;transform:translate(-50%,-50%);background:repeating-conic-gradient(from 0deg,rgba(255,200,60,.16) 0 4deg,transparent 4deg 12deg);opacity:0;animation:tkRays 2.4s ease-out forwards,tkSpin 14s linear infinite}
@keyframes tkRays{0%,22%{opacity:0}30%{opacity:1}100%{opacity:.7}}
@keyframes tkSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.tk-txt{position:relative;display:flex;flex-direction:column;align-items:center;animation:tkShake .38s linear .77s}
@keyframes tkShake{0%,100%{transform:translate(0,0)}15%{transform:translate(-9px,6px)}30%{transform:translate(8px,-7px)}45%{transform:translate(-6px,-4px)}60%{transform:translate(5px,5px)}75%{transform:translate(-3px,2px)}}
.tk-kai{position:relative;font-family:"Dela Gothic One",sans-serif;font-size:clamp(18px,5.5vw,30px);letter-spacing:.3em;color:#ffe9a8;text-shadow:0 0 12px rgba(255,120,40,.8);opacity:0;transform:translateX(-60vw) skewX(-20deg);animation:tkSlide .35s cubic-bezier(.2,.9,.3,1.2) .15s forwards}
@keyframes tkSlide{to{opacity:1;transform:translateX(0) skewX(-8deg)}}
.tk-title{position:relative;font-family:"Dela Gothic One",sans-serif;font-size:clamp(44px,14vw,112px);line-height:1.05;margin:6px 0 10px;text-align:center;
  background:linear-gradient(100deg,transparent 0 42%,rgba(255,255,255,.95) 50%,transparent 58% 100%),linear-gradient(180deg,#fff3b8 0%,#ffd84a 42%,#e8a422 68%,#ffe17a 100%);
  background-size:300% 100%,100% 100%;background-position:100% 0,0 0;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 0 #8a1010) drop-shadow(0 0 18px rgba(255,90,30,.75));opacity:0;transform:scale(3.2);
  animation:tkSlam .32s cubic-bezier(.5,0,.75,0) .45s forwards,tkSweep 1.1s ease-in-out 1s forwards}
@keyframes tkSlam{0%{opacity:0;transform:scale(3.2)}70%{opacity:1}100%{opacity:1;transform:scale(1)}}
@keyframes tkSweep{to{background-position:0% 0,0 0}}
.tk-sub{position:relative;font-family:"Orbitron",sans-serif;font-weight:900;font-size:clamp(11px,3.4vw,18px);color:#fff;opacity:0;text-shadow:0 0 8px #ff4b2b,0 0 2px #fff;animation:tkSpread .7s ease-out 1s forwards}
@keyframes tkSpread{0%{opacity:0;letter-spacing:.05em}100%{opacity:1;letter-spacing:.45em}}
.tk-bar{position:absolute;left:-30vw;right:-30vw;height:5px;background:linear-gradient(90deg,transparent,#ff3b2f,#ffd84a,#ff3b2f,transparent);transform:scaleX(0);animation:tkBar .5s ease-out .8s forwards}
.tk-bar.top{top:-14px}.tk-bar.bot{bottom:-12px}
@keyframes tkBar{to{transform:scaleX(1)}}
.tk-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;animation:tkFlash .5s ease-out .74s}
@keyframes tkFlash{0%{opacity:.95}100%{opacity:0}}
.tk-skip{position:absolute;bottom:22px;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:2px}
.tk-enter{position:absolute;left:50%;width:118px;height:118px;transform:translate(-50%,-50%);border-radius:50%;opacity:0;pointer-events:none;transition:opacity .5s;z-index:3}
.tk-intro.ready .tk-enter{opacity:1;pointer-events:auto}
.tk-intro.ready .tk-skip{display:none}
.tk-ring{position:absolute;inset:0;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 2px rgba(255,170,30,.9),0 0 26px rgba(255,120,30,1),inset 0 0 22px rgba(255,190,60,.8);animation:tkPulse 1.5s ease-out infinite}
.tk-ring.r2{animation-delay:.75s}
@keyframes tkPulse{0%{transform:scale(.75);opacity:1}100%{transform:scale(1.7);opacity:0}}
.tk-core{position:absolute;inset:30%;border-radius:50%;background:radial-gradient(circle,rgba(255,250,220,.95),rgba(255,200,80,.35) 60%,transparent 72%);animation:tkCore 1.5s ease-in-out infinite}
@keyframes tkCore{50%{transform:scale(1.25);opacity:.7}}
.tk-label{position:absolute;top:calc(100% + 16px);left:50%;transform:translateX(-50%);white-space:nowrap;text-align:center;font-family:"Dela Gothic One",sans-serif;font-size:16px;letter-spacing:.22em;color:#fff;text-shadow:0 0 10px #ff4b2b,0 2px 0 #000;background:rgba(10,4,4,.78);border:1px solid rgba(255,216,74,.85);border-radius:24px;padding:8px 20px 7px;box-shadow:0 0 16px rgba(255,90,30,.6);animation:tkBlink 1.3s ease-in-out infinite}
.tk-label small{display:block;font-size:12px;letter-spacing:.3em;color:#ffe9a8;margin-top:3px}
@keyframes tkBlink{50%{opacity:.55}}
.tk-intro.out{animation:tkOut .75s ease-in forwards;pointer-events:none}
@keyframes tkOut{0%{transform:scale(1)}25%{filter:brightness(2.2)}100%{opacity:0;transform:scale(1.7);filter:brightness(3) blur(6px)}}
.tk-burst{position:absolute;left:50%;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 0 rgba(255,230,140,.9);animation:tkBurst .6s ease-out forwards;z-index:4;pointer-events:none}
@keyframes tkBurst{to{box-shadow:0 0 0 70vmax rgba(255,240,190,0)}}
@media (prefers-reduced-motion: reduce){.tk-intro *{animation-duration:.01s !important;animation-delay:0s !important}}

.tk-bgfix{position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:0;pointer-events:none;
  background:linear-gradient(rgba(8,8,14,.80),rgba(8,8,14,.93)),url(${BG_URL}) center/cover no-repeat}
.tk-page{position:relative;z-index:1;padding-bottom:12px}
.tk-kicker{font-family:"Orbitron",sans-serif;font-size:10px;font-weight:700;letter-spacing:.32em;color:#f7cd79}
.tk-hero-title{font-family:"Dela Gothic One",sans-serif;font-size:30px;line-height:1.15;margin:6px 0 4px;background:linear-gradient(180deg,#fff3b8 0%,#ffd84a 45%,#e8a422 75%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #6e0d0d)}
.tk-card{background:rgba(14,12,22,.74);border:1px solid rgba(247,205,121,.28);border-radius:14px;padding:14px;margin-bottom:10px;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.tk-card h3{font-size:13px;font-weight:700;color:#f7cd79;margin:0 0 10px;letter-spacing:.06em}
.tk-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.12em;padding:3px 10px;border-radius:12px;border:1px solid rgba(247,205,121,.7);color:#f7cd79}
.tk-pill.on{background:linear-gradient(135deg,#e74c3c,#c0392b);border-color:#e74c3c;color:#fff}
.tk-btn{display:block;width:100%;padding:12px 10px;border-radius:10px;border:1px solid rgba(247,205,121,.85);background:linear-gradient(135deg,rgba(247,205,121,.22),rgba(231,76,60,.18));color:#fff;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.04em}
.tk-btn.sub{background:transparent;border-color:rgba(255,255,255,.25);color:#ccc;font-weight:500;font-size:13px}
.tk-btn:disabled{opacity:.4;cursor:default}
.tk-row{display:flex;align-items:center;gap:8px}
.tk-muted{font-size:11px;color:#999;line-height:1.6}
.tk-sheet-bg{position:fixed;inset:0;z-index:250;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}
.tk-sheet{width:100%;max-width:480px;max-height:88vh;overflow:auto;background:#141220;border-top:2px solid #f7cd79;border-radius:16px 16px 0 0;padding:16px 14px calc(20px + env(safe-area-inset-bottom))}
.tk-in{width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#fff;border-radius:7px;padding:8px 9px;font-size:14px;outline:none}
.tk-lbl{font-size:11px;color:#999;margin:10px 0 4px}
.tk-seg{display:flex;gap:6px;flex-wrap:wrap}
.tk-seg button{flex:1 1 auto;padding:8px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#ccc;font-size:12px;cursor:pointer}
.tk-seg button.on{background:linear-gradient(135deg,#e74c3c,#c0392b);border-color:#e74c3c;color:#fff;font-weight:700}
`;

function useFonts() {
  useEffect(() => {
    if (document.getElementById("tk-fonts")) return;
    const l = document.createElement("link");
    l.id = "tk-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Orbitron:wght@700;900&display=swap";
    document.head.appendChild(l);
  }, []);
}

// ---- 入場演出 ----
function Intro({ kai, title, sub, phase, onTap }) {
  const canvasRef = useRef(null);
  const [tileTop, setTileTop] = useState(0);

  useEffect(() => {
    const calc = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const sc = Math.max(W / 941, H / (941 * BG_RATIO)) * 1.02;
      setTileTop(H / 2 + (TILE_Y - 0.5) * 941 * BG_RATIO * sc);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // 火花（着地の瞬間に飛び散る）
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    const P = [];
    const start = performance.now();
    let burst = false, raf = 0;
    const step = now => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      if (!burst && t > 770) {
        burst = true;
        const cy = H * 0.72;
        for (let i = 0; i < 110; i++) {
          const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 11;
          P.push({ x: W / 2, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1, size: 1.5 + Math.random() * 2.5, hue: 30 + Math.random() * 25 });
        }
      }
      for (const p of P) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.98; p.life -= 0.018;
        ctx.strokeStyle = `hsla(${p.hue},100%,${60 + p.life * 30}%,${Math.max(p.life, 0)})`;
        ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke();
      }
      for (let i = P.length - 1; i >= 0; i--) if (P[i].life <= 0) P.splice(i, 1);
      if (!burst || P.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`tk-intro${phase === "ready" ? " ready" : ""}${phase === "out" ? " ready out" : ""}`} onClick={onTap}>
      <div className="tk-bgz" />
      <div className="tk-vig" />
      <div className="tk-rays" />
      <div className="tk-txt">
        <div className="tk-bar top" /><div className="tk-bar bot" />
        {kai && <div className="tk-kai">{kai}</div>}
        <div className="tk-title">{title}</div>
        {sub && <div className="tk-sub">{sub}</div>}
      </div>
      <canvas ref={canvasRef} />
      <div className="tk-flash" />
      <div className="tk-enter" style={{ top: tileTop }}>
        <div className="tk-ring" /><div className="tk-ring r2" /><div className="tk-core" />
        <div className="tk-label">TAP TO ENTER<small>タップして入場</small></div>
      </div>
      {phase === "out" && <div className="tk-burst" style={{ top: tileTop }} />}
      <div className="tk-skip">TAP TO SKIP</div>
    </div>
  );
}

// ---- メンバー選択（あなたは誰ですか） ----
function MemberGrid({ members, Av, selectedId, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
      {members.map(m => {
        const on = m.id === selectedId;
        return (
          <div key={m.id} onClick={() => onSelect(m.id)}
            style={{ borderRadius: 10, padding: "9px 4px", textAlign: "center", cursor: "pointer",
              border: on ? "2px solid #f7cd79" : "1px solid rgba(255,255,255,.15)",
              background: on ? "rgba(247,205,121,.14)" : "rgba(255,255,255,.04)" }}>
            <Av m={m} sz={38} />
            <div style={{ fontSize: 12, marginTop: 4, color: on ? "#fff" : "#bbb" }}>{m.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function AvatarRow({ list, Av, empty }) {
  if (!list.length) return <span className="tk-muted">{empty}</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map(m => (
        <div key={m.id} style={{ textAlign: "center", width: 44 }}>
          <Av m={m} sz={28} />
          <div style={{ fontSize: 9, color: "#bbb", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
        </div>
      ))}
    </div>
  );
}

// ========================================================
export default function Taikai({ members, Av, showToast }) {
  useFonts();

  // 入場の段階：wait（データ待ち）→ intro → ready（タップ待ち）→ out → done
  const [phase, setPhase] = useState("wait");
  const phaseRef = useRef("wait");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const [muted, setMuted] = useState(() => { try { return localStorage.getItem("tleague_taikai_mute") === "1"; } catch (e) { return false; } });
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const [loaded, setLoaded] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [dates, setDates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selfId, setSelfId] = useState(() => { try { const v = localStorage.getItem("tleague_taikai_self"); return v ? Number(v) : null; } catch (e) { return null; } });
  const [adminUnlocked, setAdminUnlocked] = useState(() => { try { return sessionStorage.getItem("tleague_taikai_admin") === "1"; } catch (e) { return false; } });
  const [selectedTid, setSelectedTid] = useState(null);
  const [sheet, setSheet] = useState(null); // null | who | answer | admin
  const [afterWho, setAfterWho] = useState(null);
  const [regOpen, setRegOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState(null);

  // ---- データ ----
  const reload = useCallback(async () => {
    const [t, d, e] = await Promise.all([
      supabase.from("tournaments").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("tournament_dates").select("*").order("date"),
      supabase.from("tournament_entries").select("*"),
    ]);
    const err = t.error || d.error || e.error;
    if (err) { console.error("taikai load error:", err); showToast("error", "⚠️ 大会データの読み込み失敗: " + err.message); }
    if (t.data) setTournaments(t.data);
    if (d.data) setDates(d.data);
    if (e.data) setEntries(e.data);
    setLoaded(true);
  }, [showToast]);

  useEffect(() => {
    reload();
    // 即時反映（表ごとに別チャンネル）
    const chs = ["tournaments", "tournament_dates", "tournament_entries"].map(table =>
      supabase.channel(`taikai-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => reload())
        .subscribe((status, err) => { if (status === "CHANNEL_ERROR") console.error(`Realtime subscribe failed (${table}):`, err); })
    );
    return () => chs.forEach(ch => supabase.removeChannel(ch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 入場演出とBGM ----
  useEffect(() => {
    if (!mutedRef.current) startBgm(() => phaseRef.current !== "out" && phaseRef.current !== "done");
    // データ待ちは最大1.2秒。遅ければ先に演出を始める
    const t = setTimeout(() => setPhase(p => (p === "wait" ? "intro" : p)), 1200);
    const onVis = () => {
      if (!actx) return;
      if (document.hidden) actx.suspend();
      else if (!mutedRef.current) actx.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
      stopBgm(); // 大会タブから離れたら止める
    };
  }, []);
  useEffect(() => { if (loaded) setPhase(p => (p === "wait" ? "intro" : p)); }, [loaded]);
  useEffect(() => {
    if (phase !== "intro") return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase(p => (p === "intro" ? "ready" : p)), reduce ? 300 : 1700);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("done"), 750);
    return () => clearTimeout(t);
  }, [phase]);

  const onIntroTap = () => {
    if (!bgmSrc && !mutedRef.current) startBgm(() => phaseRef.current !== "out" && phaseRef.current !== "done");
    if (phaseRef.current === "ready") { setPhase("out"); lowerBgm(); }
    else if (phaseRef.current === "intro") setPhase("ready");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem("tleague_taikai_mute", next ? "1" : "0"); } catch (e) { /* 保存できなくても動作は続ける */ }
    if (next) stopBgm();
    else startBgm(() => phaseRef.current !== "out" && phaseRef.current !== "done");
  };

  // ---- 表示用の値 ----
  const me = members.find(m => m.id === selfId) || null;
  const isAdminUser = me?.name === ADMIN_NAME;
  const isAdmin = isAdminUser && adminUnlocked;
  const visible = tournaments.filter(t => t.visibility === "public" || isAdmin);
  const cur = visible.find(t => t.id === selectedTid) || visible[0] || null;
  const s = settingsOf(cur);
  const tDates = cur ? dates.filter(d => d.tournament_id === cur.id) : [];
  const dateIds = new Set(tDates.map(d => d.id));
  const tEntries = cur ? entries.filter(e => e.tournament_id === cur.id) : [];
  const myEntry = tEntries.find(e => e.member_id === selfId) || null;
  const joinList = tEntries.filter(e => e.status === "join").map(e => members.find(m => m.id === e.member_id)).filter(Boolean);
  const declineList = tEntries.filter(e => e.status === "decline").map(e => members.find(m => m.id === e.member_id)).filter(Boolean);
  const answeredIds = new Set(tEntries.map(e => e.member_id));
  const unansweredList = members.filter(m => !answeredIds.has(m.id) && !m.name.includes("ゲスト"));
  const deadlinePassed = !!(cur?.entry_deadline && todayStr() > cur.entry_deadline);
  const entryOpen = !!cur && cur.status === "entry" && !deadlinePassed;

  const selectSelf = id => {
    setSelfId(id);
    try { localStorage.setItem("tleague_taikai_self", String(id)); } catch (e) { /* 保存できなくても動作は続ける */ }
    setSheet(afterWho);
    setAfterWho(null);
  };
  const openAnswer = () => {
    if (!selfId) { setAfterWho("answer"); setSheet("who"); }
    else setSheet("answer");
  };
  const openAdmin = () => {
    if (!isAdminUser) { setAfterWho("admin"); setSheet("who"); }
    else setSheet("admin");
  };

  const copyLine = async () => {
    if (!cur) return;
    const text = lineText(cur, tDates, tEntries);
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "📋 LINE用の文章をコピーしました");
    } catch (e) {
      setCopyFallback(text); // コピーできない端末では、文章を出して長押しでコピー
    }
  };

  // ---- 今のあなたがやること ----
  const todo = (() => {
    if (!cur) return null;
    if (!entryOpen) return { text: deadlinePassed ? "参加受付は締め切りました" : "現在、参加受付はしていません", done: true };
    if (!me) return { text: "まず「あなたは誰か」を選んで、参加・不参加を回答してください", action: "回答する" };
    if (!myEntry) return { text: `参加・不参加を回答してください${cur.entry_deadline ? `（締切 ${fmtDate(cur.entry_deadline)}）` : ""}`, action: "回答する" };
    if (myEntry.status === "join") {
      const mine = (myEntry.date_ids || []).filter(id => dateIds.has(id));
      if (tDates.length && !mine.length) return { text: "参加ありがとうございます。候補日に投票してください", action: "候補日に投票する" };
      if (s.format === "tag" && s.teamMode === "vote" && !myEntry.team_vote) return { text: "チーム決めの方法（あみだくじ／戦力均衡）にも投票してください", action: "投票する" };
      const names = tDates.filter(d => mine.includes(d.id)).map(d => fmtDate(d.date)).join("・");
      return { text: `回答済み：参加${names ? `（${names}）` : ""}`, action: "回答を変更する", done: true };
    }
    return { text: "回答済み：不参加", action: "回答を変更する", done: true };
  })();

  const regLines = cur ? regulationLines(cur, tDates, tEntries) : [];
  const teamVoteOn = s.format === "tag" && s.teamMode === "vote";
  const tally = teamTally(tEntries);
  const commentList = tEntries.filter(e => (e.comment || "").trim())
    .map(e => ({ e, m: members.find(m => m.id === e.member_id) })).filter(x => x.m);

  return (
    <>
      <style>{CSS}</style>
      {phase !== "done" && phase !== "wait" && (
        <Intro kai={cur ? s.edition : ""} title={cur ? cur.name : "大会モード"} sub={s.subtitle} phase={phase} onTap={onIntroTap} />
      )}
      {phase === "wait" && <div className="tk-intro" style={{ background: "#000" }} onClick={onIntroTap} />}

      <div className="tk-bgfix" />
      <div className="tk-page">
        {/* ヒーロー */}
        <div style={{ padding: "6px 2px 12px" }}>
          <div className="tk-row" style={{ justifyContent: "space-between" }}>
            <span className="tk-kicker">T.LEAGUE TOURNAMENT</span>
            <button onClick={toggleMute} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", borderRadius: 16, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
              {muted ? "🔇 音なし" : "🔊 音あり"}
            </button>
          </div>
          {cur ? (
            <>
              <div className="tk-hero-title">{s.edition ? `${s.edition} ` : ""}{cur.name}</div>
              <div className="tk-row" style={{ flexWrap: "wrap" }}>
                <span className={`tk-pill${entryOpen ? " on" : ""}`}>{statusLabel(cur)}</span>
                {cur.visibility === "draft" && <span className="tk-pill">下書き（運営だけに表示）</span>}
                {cur.entry_deadline && <span className="tk-muted">締切 {fmtDate(cur.entry_deadline)}</span>}
              </div>
            </>
          ) : (
            <div className="tk-hero-title">大会モード</div>
          )}
        </div>

        {!cur && (
          <div className="tk-card">
            <h3>大会の予定</h3>
            <div className="tk-muted">大会の予定はまだありません。決まったら、ここでお知らせします。</div>
          </div>
        )}

        {/* 今のあなたがやること */}
        {todo && (
          <div className="tk-card" style={{ borderColor: todo.done ? "rgba(247,205,121,.28)" : "rgba(231,76,60,.8)" }}>
            <h3>今のあなたがやること</h3>
            <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.6, marginBottom: todo.action && entryOpen ? 10 : 0 }}>
              {todo.done ? "✅ " : "👉 "}{todo.text}
            </div>
            {todo.action && entryOpen && <button className="tk-btn" onClick={openAnswer}>✋ {todo.action}</button>}
          </div>
        )}

        {/* 候補日と投票状況 */}
        {cur && (
          <div className="tk-card">
            <h3>候補日と投票状況</h3>
            {!tDates.length && <div className="tk-muted">候補日はまだ決まっていません。</div>}
            {tDates.map(d => {
              const voters = tEntries.filter(e => e.status === "join" && (e.date_ids || []).includes(d.id))
                .map(e => members.find(m => m.id === e.member_id)).filter(Boolean);
              return (
                <div key={d.id} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtDate(d.date)}</span>
                    <span style={{ fontSize: 13, color: "#f7cd79", fontWeight: 700 }}>○ {voters.length}人</span>
                  </div>
                  <AvatarRow list={voters} Av={Av} empty="まだ投票がありません" />
                </div>
              );
            })}
          </div>
        )}

        {/* チーム決めの方法（投票） */}
        {cur && teamVoteOn && (
          <div className="tk-card">
            <h3>チーム決めの方法（投票）</h3>
            {[["amida", "🎲 あみだくじ（ライブで決定）"], ["balanced", "⚖️ 戦力均衡ランダム（成績で組む）"]].map(([k, label]) => {
              const voters = tEntries.filter(e => e.status === "join" && e.team_vote === k).map(e => members.find(m => m.id === e.member_id)).filter(Boolean);
              return (
                <div key={k} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 13, color: "#f7cd79", fontWeight: 700 }}>{tally[k]}票</span>
                  </div>
                  <AvatarRow list={voters} Av={Av} empty="まだ投票がありません" />
                </div>
              );
            })}
            <div className="tk-muted" style={{ marginTop: 8 }}>
              {entryClosed(cur)
                ? <>決定：<b style={{ color: "#f7cd79" }}>{TEAM_SHORT[teamDecision(tally)]}</b>{tally.amida === tally.balanced ? "（同数のためあみだくじ）" : ""}</>
                : "締切の時点で票の多い方に自動で決まります（同数はあみだくじ）"}
            </div>
          </div>
        )}

        {/* 参加状況 */}
        {cur && (
          <div className="tk-card">
            <h3>参加状況（参加 {joinList.length}人／不参加 {declineList.length}人／未回答 {unansweredList.length}人）</h3>
            <div className="tk-lbl" style={{ marginTop: 0 }}>参加</div>
            <AvatarRow list={joinList} Av={Av} empty="まだいません" />
            <div className="tk-lbl">不参加</div>
            <AvatarRow list={declineList} Av={Av} empty="まだいません" />
            <div className="tk-lbl">未回答（ゲストを除く）</div>
            <AvatarRow list={unansweredList} Av={Av} empty="全員回答済み" />
            {commentList.length > 0 && (
              <>
                <div className="tk-lbl">コメント</div>
                {commentList.map(({ e, m }) => (
                  <div key={e.id} className="tk-row" style={{ alignItems: "flex-start", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <Av m={m} sz={24} />
                    <div style={{ flex: 1, fontSize: 12, lineHeight: 1.6 }}>
                      <b style={{ color: "#f7cd79" }}>{m.name}</b>
                      <span className="tk-muted">（{e.status === "join" ? "参加" : "不参加"}）</span><br />
                      <span style={{ whiteSpace: "pre-wrap", color: "#eee" }}>{e.comment}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* レギュレーション */}
        {cur && (
          <div className="tk-card">
            <div className="tk-row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setRegOpen(o => !o)}>
              <h3 style={{ margin: 0 }}>📜 レギュレーション</h3>
              <span style={{ fontSize: 12, color: "#f7cd79" }}>{regOpen ? "▲ 閉じる" : "▼ 開く"}</span>
            </div>
            {regOpen && (
              <div style={{ marginTop: 10 }}>
                {regLines.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 10, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 13 }}>
                    <div style={{ width: 74, flexShrink: 0, color: "#f7cd79", fontWeight: 700 }}>{k}</div>
                    <div style={{ color: "#eee", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="tk-btn sub" style={{ marginTop: 10 }} onClick={copyLine}>📋 LINE用に全文コピー</button>
          </div>
        )}

        {/* あなた */}
        <div className="tk-card">
          <h3>あなた</h3>
          <div className="tk-row">
            {me ? <Av m={me} sz={34} /> : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#333" }} />}
            <div style={{ flex: 1, fontSize: 14 }}>{me ? me.name : "まだ選んでいません"}</div>
            <button className="tk-btn sub" style={{ width: "auto", padding: "6px 12px" }} onClick={() => { setAfterWho(null); setSheet("who"); }}>
              {me ? "変更" : "選ぶ"}
            </button>
          </div>
          {isAdminUser && (
            <button className="tk-btn" style={{ marginTop: 10 }} onClick={openAdmin}>⚙️ 運営メニュー</button>
          )}
        </div>
      </div>

      {/* ---- シート ---- */}
      {sheet && (
        <div className="tk-sheet-bg" onClick={() => setSheet(null)}>
          <div className="tk-sheet" onClick={e => e.stopPropagation()}>
            {sheet === "who" && (
              <>
                <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>あなたは誰ですか？</h3>
                <div className="tk-muted" style={{ marginBottom: 12 }}>自分のアイコンを選んでください（この端末に記憶します）</div>
                <MemberGrid members={members} Av={Av} selectedId={selfId} onSelect={selectSelf} />
                <button className="tk-btn sub" style={{ marginTop: 14 }} onClick={() => setSheet(null)}>閉じる</button>
              </>
            )}
            {sheet === "answer" && cur && me && (
              <AnswerSheet cur={cur} me={me} Av={Av} tDates={tDates} myEntry={myEntry} dateIds={dateIds} teamVoteOn={teamVoteOn}
                entryOpen={entryOpen} showToast={showToast} onDone={() => { setSheet(null); reload(); }}
                onChangeWho={() => { setAfterWho("answer"); setSheet("who"); }} />
            )}
            {sheet === "admin" && (
              <AdminSheet me={me} isAdminUser={isAdminUser} adminUnlocked={adminUnlocked}
                onUnlock={() => { setAdminUnlocked(true); try { sessionStorage.setItem("tleague_taikai_admin", "1"); } catch (e) { /* 保存できなくても動作は続ける */ } }}
                tournaments={tournaments} cur={isAdmin ? cur : null} dates={dates} joinCount={joinList.length}
                showToast={showToast} onSelectTournament={setSelectedTid} reload={reload} onClose={() => setSheet(null)} />
            )}
          </div>
        </div>
      )}

      {/* コピーできない端末向け：文章を表示して長押しでコピー */}
      {copyFallback && (
        <div className="tk-sheet-bg" onClick={() => setCopyFallback(null)}>
          <div className="tk-sheet" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>長押しでコピーしてください</h3>
            <textarea readOnly className="tk-in" style={{ height: 300, fontSize: 12, lineHeight: 1.6 }} value={copyFallback} onFocus={e => e.target.select()} />
            <button className="tk-btn sub" style={{ marginTop: 10 }} onClick={() => setCopyFallback(null)}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}

// ---- 参加・不参加の回答 ----
function AnswerSheet({ cur, me, Av, tDates, myEntry, dateIds, teamVoteOn, entryOpen, showToast, onDone, onChangeWho }) {
  const [status, setStatus] = useState(myEntry?.status || null);
  const [picked, setPicked] = useState(() => (myEntry?.date_ids || []).filter(id => dateIds.has(id)));
  const [teamVote, setTeamVote] = useState(myEntry?.team_vote || null);
  const [comment, setComment] = useState(myEntry?.comment || "");
  const [saving, setSaving] = useState(false);
  const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const save = async () => {
    if (!status || saving) return;
    setSaving(true);
    const { error } = await supabase.from("tournament_entries").upsert({
      tournament_id: cur.id,
      member_id: me.id,
      status,
      date_ids: status === "join" ? picked : [],
      team_vote: status === "join" && teamVoteOn ? teamVote : null,
      comment: comment.trim().slice(0, 200),
      updated_at: new Date().toISOString(),
    }, { onConflict: "tournament_id,member_id" });
    setSaving(false);
    if (error) { console.error("entry save error:", error); showToast("error", "⚠️ 回答の保存失敗: " + error.message); return; }
    showToast("success", status === "join" ? "✋ 参加で回答しました" : "回答しました（不参加）");
    onDone();
  };

  return (
    <>
      <div className="tk-row" style={{ marginBottom: 12 }}>
        <Av m={me} sz={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{me.name} さん</div>
          <div className="tk-muted">参加・不参加を選んでください</div>
        </div>
        <button className="tk-btn sub" style={{ width: "auto", padding: "5px 10px", fontSize: 11 }} onClick={onChangeWho}>人を変更</button>
      </div>
      {!entryOpen && <div className="tk-muted" style={{ color: "#e74c3c", marginBottom: 10 }}>参加受付は締め切られています。</div>}
      <div className="tk-seg">
        <button className={status === "join" ? "on" : ""} disabled={!entryOpen} onClick={() => setStatus("join")}>✋ 参加する</button>
        <button className={status === "decline" ? "on" : ""} disabled={!entryOpen} onClick={() => setStatus("decline")}>参加しない</button>
      </div>
      {status === "join" && (
        <>
          <div className="tk-lbl">参加できる候補日にチェック（いくつでも）</div>
          {!tDates.length && <div className="tk-muted">候補日はまだ決まっていません。決まったら、ここから投票できます。</div>}
          {tDates.map(d => (
            <label key={d.id} className="tk-row" style={{ padding: "10px 8px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
              background: picked.includes(d.id) ? "rgba(247,205,121,.14)" : "rgba(255,255,255,.04)",
              border: picked.includes(d.id) ? "1px solid #f7cd79" : "1px solid rgba(255,255,255,.12)" }}>
              <input type="checkbox" checked={picked.includes(d.id)} disabled={!entryOpen} onChange={() => toggle(d.id)} style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtDate(d.date)}</span>
            </label>
          ))}
        </>
      )}
      {status === "join" && teamVoteOn && (
        <>
          <div className="tk-lbl">チーム決めの方法（どちらがいい？）</div>
          <div className="tk-seg">
            <button className={teamVote === "amida" ? "on" : ""} disabled={!entryOpen} onClick={() => setTeamVote("amida")}>🎲 あみだくじ</button>
            <button className={teamVote === "balanced" ? "on" : ""} disabled={!entryOpen} onClick={() => setTeamVote("balanced")}>⚖️ 戦力均衡ランダム</button>
          </div>
          <div className="tk-muted" style={{ marginTop: 4 }}>締切の時点で多い方に決まります（同数はあみだくじ）</div>
        </>
      )}
      {status && (
        <>
          <div className="tk-lbl">コメント（任意・全員に表示されます）</div>
          <textarea className="tk-in" style={{ height: 64, fontSize: 13 }} maxLength={200} disabled={!entryOpen}
            placeholder="例：19時からなら行けます／12/12はできれば避けたいです" value={comment} onChange={e => setComment(e.target.value)} />
        </>
      )}
      <button className="tk-btn" style={{ marginTop: 14 }} disabled={!status || saving || !entryOpen} onClick={save}>
        {saving ? "保存中..." : "この内容で決定"}
      </button>
    </>
  );
}

// ---- 運営メニュー（りょう＋管理パスワード） ----
function AdminSheet({ me, isAdminUser, adminUnlocked, onUnlock, tournaments, cur, dates, joinCount, showToast, onSelectTournament, reload, onClose }) {
  const [pass, setPass] = useState("");
  const [creating, setCreating] = useState(false); // 大会がまだ無いときは、自動的に「新しく作る」になる
  const [form, setForm] = useState(() => toForm(cur));
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);

  // 編集する大会が変わった・保存されたときだけ入力欄を読み直す
  // （他の人の回答で即時反映が走っても、入力途中の内容は消さない）
  useEffect(() => {
    if (!creating) setForm(toForm(cur));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, cur?.updated_at, creating]);

  if (!isAdminUser) {
    return (
      <>
        <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>⚙️ 運営メニュー</h3>
        <div className="tk-muted">運営メニューは「{ADMIN_NAME}」を選んでいるときだけ使えます。</div>
        <button className="tk-btn sub" style={{ marginTop: 12 }} onClick={onClose}>閉じる</button>
      </>
    );
  }
  if (!adminUnlocked) {
    return (
      <>
        <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>⚙️ 運営メニュー</h3>
        <div className="tk-lbl" style={{ marginTop: 0 }}>管理パスワード</div>
        <input className="tk-in" type="password" inputMode="numeric" value={pass} onChange={e => setPass(e.target.value)} />
        <button className="tk-btn" style={{ marginTop: 12 }} onClick={() => {
          if (pass === ADMIN_PASS) { onUnlock(); setPass(""); }
          else showToast("error", "⚠️ パスワードが違います");
        }}>開く</button>
        <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={onClose}>閉じる</button>
      </>
    );
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setS = (k, v) => setForm(f => ({ ...f, settings: { ...f.settings, [k]: v } }));
  const setPrize = (key, patch) => setForm(f => ({ ...f, settings: { ...f.settings, prizes: { ...f.settings.prizes, [key]: { ...(f.settings.prizes[key] || {}), ...patch } } } }));
  const editing = creating ? null : cur;
  const tDates = editing ? dates.filter(d => d.tournament_id === editing.id) : [];

  const pool = Number(form.settings.entryFee || 0) * joinCount;
  const prizeSum = PRIZES.filter(p => !p.noAmount && form.settings.prizes[p.key]?.on).reduce((a, p) => a + Number(form.settings.prizes[p.key]?.amount || 0), 0);

  const save = async () => {
    if (!form.name.trim()) { showToast("error", "⚠️ 大会名を入れてください"); return; }
    setBusy(true);
    const row = {
      name: form.name.trim(),
      visibility: form.visibility,
      status: form.status,
      entry_deadline: form.entry_deadline || null,
      settings: form.settings,
      updated_at: new Date().toISOString(),
    };
    const res = editing
      ? await supabase.from("tournaments").update(row).eq("id", editing.id).select()
      : await supabase.from("tournaments").insert(row).select();
    setBusy(false);
    if (res.error) { console.error("tournament save error:", res.error); showToast("error", "⚠️ 大会の保存失敗: " + res.error.message); return; }
    showToast("success", editing ? "✅ 大会を更新しました" : "✅ 大会を作りました");
    if (res.data?.[0]) onSelectTournament(res.data[0].id);
    setCreating(false);
    reload();
  };
  const addDate = async () => {
    if (!editing || !newDate) return;
    const { error } = await supabase.from("tournament_dates").insert({ tournament_id: editing.id, date: newDate });
    if (error) { showToast("error", "⚠️ 候補日の追加失敗: " + error.message); return; }
    setNewDate("");
    reload();
  };
  const removeDate = async d => {
    if (!window.confirm(`${fmtDate(d.date)} を候補日から外しますか？（この日への投票も数えられなくなります）`)) return;
    const { error } = await supabase.from("tournament_dates").delete().eq("id", d.id);
    if (error) { showToast("error", "⚠️ 候補日の削除失敗: " + error.message); return; }
    reload();
  };
  const removeTournament = async () => {
    if (!editing) return;
    if (!window.confirm(`「${editing.name}」を削除しますか？（全員の画面から消えます）`)) return;
    const { error } = await supabase.from("tournaments").update({ deleted_at: new Date().toISOString() }).eq("id", editing.id);
    if (error) { showToast("error", "⚠️ 削除失敗: " + error.message); return; }
    showToast("success", "🗑 大会を削除しました");
    onSelectTournament(null);
    reload();
    onClose();
  };

  const Seg = ({ value, options, onChange }) => (
    <div className="tk-seg">
      {options.map(([v, label]) => <button key={v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{label}</button>)}
    </div>
  );
  const visibleList = tournaments.filter(t => !t.deleted_at);

  return (
    <>
      <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>⚙️ 運営メニュー</h3>
        <span className="tk-muted">{me?.name}</span>
      </div>

      {visibleList.length > 0 && (
        <div className="tk-row" style={{ gap: 6, marginBottom: 8 }}>
          <select className="tk-in" value={creating ? "" : (cur?.id || "")} onChange={e => { setCreating(false); onSelectTournament(Number(e.target.value)); }}>
            {creating && <option value="">（新しい大会）</option>}
            {visibleList.map(t => <option key={t.id} value={t.id}>{settingsOf(t).edition} {t.name}{t.visibility === "draft" ? "（下書き）" : ""}</option>)}
          </select>
          {!creating && <button className="tk-btn sub" style={{ width: "auto", whiteSpace: "nowrap", padding: "8px 10px" }} onClick={() => { setCreating(true); setForm(toForm(null)); }}>＋新規</button>}
        </div>
      )}

      <div className="tk-lbl">第何回</div>
      <input className="tk-in" value={form.settings.edition} onChange={e => setS("edition", e.target.value)} placeholder="第2回" />
      <div className="tk-lbl">大会名</div>
      <input className="tk-in" value={form.name} onChange={e => set("name", e.target.value)} placeholder="とうねり杯" />
      <div className="tk-lbl">英語の副題（入場演出に出る）</div>
      <input className="tk-in" value={form.settings.subtitle} onChange={e => setS("subtitle", e.target.value)} />

      <div className="tk-lbl">公開状態</div>
      <Seg value={form.visibility} options={[["draft", "下書き（運営だけ）"], ["public", "公開"]]} onChange={v => set("visibility", v)} />
      <div className="tk-lbl">状態</div>
      <Seg value={form.status} options={[["entry", "参加受付中"], ["closed", "受付終了"]]} onChange={v => set("status", v)} />
      <div className="tk-lbl">参加受付の締切日</div>
      <input className="tk-in" type="date" value={form.entry_deadline || ""} onChange={e => set("entry_deadline", e.target.value)} />

      <div className="tk-lbl">形式</div>
      <Seg value={form.settings.format} options={[["tag", "タッグ戦"], ["individual", "個人戦"]]} onChange={v => setS("format", v)} />
      <div className="tk-lbl">参加費（円）</div>
      <input className="tk-in" type="number" inputMode="numeric" value={form.settings.entryFee} onChange={e => setS("entryFee", Number(e.target.value))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div><div className="tk-lbl">予選の回数</div><input className="tk-in" type="number" inputMode="numeric" value={form.settings.prelimGames} onChange={e => setS("prelimGames", Number(e.target.value))} /></div>
        <div><div className="tk-lbl">決勝の回数</div><input className="tk-in" type="number" inputMode="numeric" value={form.settings.finalGames} onChange={e => setS("finalGames", Number(e.target.value))} /></div>
        <div><div className="tk-lbl">決勝進出数</div><input className="tk-in" type="number" inputMode="numeric" value={form.settings.finalists} onChange={e => setS("finalists", Number(e.target.value))} /></div>
      </div>
      <div className="tk-lbl">3位の決め方</div>
      <Seg value={form.settings.thirdMode} options={[["prelimTop", "予選の最上位"], ["playoff", "3位決定戦"]]} onChange={v => setS("thirdMode", v)} />
      <div className="tk-lbl">同点の規定</div>
      <input className="tk-in" value={form.settings.tiebreak} onChange={e => setS("tiebreak", e.target.value)} />
      <div className="tk-lbl">席順</div>
      <Seg value={form.settings.seatMode} options={[["auto", "自動"], ["manual", "手動（くじ）"]]} onChange={v => setS("seatMode", v)} />
      {form.settings.format === "tag" && (
        <>
          <div className="tk-lbl">チーム決め</div>
          <Seg value={form.settings.teamMode} options={[["vote", "投票で決める"], ["amida", "あみだ"], ["balanced", "戦力均衡"], ["manual", "手動"]]} onChange={v => setS("teamMode", v)} />
        </>
      )}

      <div className="tk-lbl">賞（採用するものにチェック・金額）</div>
      {PRIZES.map(p => {
        const pr = form.settings.prizes[p.key] || {};
        return (
          <div key={p.key} className="tk-row" style={{ marginBottom: 6 }}>
            <label className="tk-row" style={{ flex: 1, gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!pr.on} onChange={e => setPrize(p.key, { on: e.target.checked })} style={{ width: 18, height: 18 }} />
              {p.label}
            </label>
            {p.noAmount
              ? <span className="tk-muted" style={{ width: 150 }}>1人500円（固定）</span>
              : <input className="tk-in" style={{ width: 120 }} type="number" inputMode="numeric" placeholder="金額" value={pr.amount ?? ""} disabled={!pr.on}
                  onChange={e => setPrize(p.key, { amount: Number(e.target.value) })} />}
          </div>
        );
      })}
      <div className="tk-muted" style={{ background: "rgba(255,255,255,.05)", borderRadius: 8, padding: 8, marginTop: 4 }}>
        原資（参加費 × 参加 {joinCount}人）：{yen(pool)}　賞金の合計：{yen(prizeSum)}<br />
        差額：<b style={{ color: pool - prizeSum === 0 ? "#2ecc71" : "#e74c3c" }}>{pool - prizeSum >= 0 ? `余り ${yen(pool - prizeSum)}` : `不足 ${yen(prizeSum - pool)}`}</b>
        <br />※参加人数が確定するまでは目安です（余りゼロで運用）
      </div>

      <div className="tk-lbl">補足（場所・集合時間など）</div>
      <textarea className="tk-in" style={{ height: 70 }} value={form.settings.note} onChange={e => setS("note", e.target.value)} />

      <button className="tk-btn" style={{ marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "保存中..." : (editing ? "💾 大会を更新" : "＋ 大会を作る")}</button>

      {editing && (
        <>
          <div className="tk-lbl" style={{ marginTop: 18 }}>候補日</div>
          {tDates.map(d => (
            <div key={d.id} className="tk-row" style={{ justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtDate(d.date)}</span>
              <button className="tk-btn sub" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => removeDate(d)}>外す</button>
            </div>
          ))}
          <div className="tk-row" style={{ marginTop: 6 }}>
            <input className="tk-in" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <button className="tk-btn" style={{ width: "auto", whiteSpace: "nowrap", padding: "8px 12px" }} disabled={!newDate} onClick={addDate}>＋ 追加</button>
          </div>
          <button className="tk-btn sub" style={{ marginTop: 20, color: "#e74c3c", borderColor: "rgba(231,76,60,.6)" }} onClick={removeTournament}>🗑 この大会を削除</button>
        </>
      )}
      <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={onClose}>閉じる</button>
    </>
  );
}

function toForm(t) {
  const s = settingsOf(t);
  return {
    name: t?.name || "とうねり杯",
    visibility: t?.visibility || "draft",
    status: t?.status || "entry",
    entry_deadline: t?.entry_deadline || "",
    settings: { ...s, prizes: { ...(s.prizes || {}) } },
  };
}
