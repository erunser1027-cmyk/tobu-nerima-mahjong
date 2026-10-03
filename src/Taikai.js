import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";

// ========================================================
// 大会モード（段階1：入場演出・レギュレーション・参加受付・候補日投票）
// ========================================================

// 運営メニューの管理パスワード（コードに入るため、詳しい人なら読める。うっかり操作を防ぐ簡易な鍵）
const ADMIN_PASS = "1234";
const ADMIN_NAME = "りょう";
const APP_URL = "https://tleague.nerima-night-crew.com";
const SHARE_URL = APP_URL + "/taikai/"; // LINEで大会の画像つきカードになるページ（public/taikai/index.html）
const BG_URL = "/taikai/taikai_bg.jpg";
const BGM_URL = "/taikai/taikai_bgm.mp3";
const BG_RATIO = 1672 / 941; // 背景画像の縦横比（中央の牌の位置計算用）
const TILE_Y = 0.36;          // 背景画像の中で、中央の牌がある高さ（上から36%）
const VOL_INTRO = 0.9;        // 入場までの音量
const VOL_STAY = 0.03;        // 入場後に流し続ける音量（2026-10-02 本人が実機で3に決定）

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
  ruleStarting: 25000,           // 配給原点
  ruleKaeshi: 30000,             // 返し
  ruleUma: [20, 10, -10, -20],   // ウマ（1〜4位）
  carryOver: "none",             // 予選の点を決勝に：none（持ち越さない）／all（全部）／half（半分）／vote（参加者の投票）
  afterpartyNote: "",            // 二次会の案内文（入っているときだけ二次会の出欠を聞く）
  dateNote: "", // 候補日の欄に出す、運営からの一言（全員に表示）
  startTime: "", // 当日のスタート時刻（例 "18:00"）
};

const PRIZES = [
  { key: "first", label: "優勝" },
  { key: "second", label: "準優勝" },
  { key: "third", label: "3位", voteLabel: "3位の賞金", voteDesc: "3位のチームにも賞金を出す" },
  { key: "booby", label: "ブービー賞", desc: "決勝に進めなかった人のうち、最下位から2番目" },
  { key: "chip", label: "チップ賞", desc: "大会通算のチップが最多の人" },
  { key: "highscore", label: "最高得点賞", desc: "予選・決勝を通した1半荘の最高素点" },
  { key: "yakuman", label: "役満賞", desc: "役満1回につき、他チームの参加者1人500円", noAmount: true },
];

// ---- 賞の種類の投票（段階4a）：優勝・準優勝は固定なので対象外。3位の賞金は投票で決める（2026-10-03）。1人3票（2026-10-03に2→3） ----
const AWARD_CANDIDATES = ["third", "booby", "chip", "highscore", "yakuman"];
const AWARD_VOTE_MAX = 3;
function awardTallyOf(tEntries) {
  const t = Object.fromEntries(AWARD_CANDIDATES.map(k => [k, []]));
  tEntries.forEach(e => { if (e.status === "join") (e.award_votes || []).forEach(k => { if (t[k]) t[k].push(e.member_id); }); });
  return t;
}

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

// ---- チーム決め（段階2a：戦力均衡ランダム・手動） ----
const TEAM_NAMES = "ABCDEFGHIJ".split("");
const SHRINK = 20; // 強さの補正：対局数が少ない人ほど0点（平均）に近づける。合計 ÷（対局数＋20）
// 全期間の対局記録から、1人ずつの「補正つき1半荘平均」を出す（空欄＝打っていない半荘は数えない）
function calcStrengths(sessions, ids) {
  const acc = Object.fromEntries(ids.map(id => [id, { sum: 0, games: 0 }]));
  sessions.forEach(ss => (ss.rounds || []).forEach(r => {
    ids.forEach(id => {
      const v = r.scores?.[String(id)] ?? r.scores?.[id];
      if (v == null || v === "") return;
      const n = Number(v);
      if (isNaN(n)) return;
      acc[id].sum += n; acc[id].games += 1;
    });
  }));
  const out = {};
  ids.forEach(id => { const a = acc[id]; out[id] = { games: a.games, raw: a.games ? a.sum / a.games : 0, adj: a.sum / (a.games + SHRINK) }; });
  return out;
}
// 偏りのない乱数で並べ替え（端末の暗号用乱数を使う）
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1); window.crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const REVEAL_INTRO = 1.4, REVEAL_PER = 1.8, REVEAL_TAIL = 1.2; // 抽選発表の演出（秒）
const revealTotal = n => REVEAL_INTRO + n * REVEAL_PER + REVEAL_TAIL;
const fmtAdj = v => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;

// ---- あみだくじ（段階2b） ----
const AMIDA_ROWS = 12;                                  // 横線の段数
const AMIDA_LINES = 2.0, AMIDA_PER = 3.0, AMIDA_TAIL = 2.5; // 線が現れる2秒 → 1人3秒 → 発表
const amidaTotal = n => AMIDA_LINES + n * AMIDA_PER + AMIDA_TAIL;
const TEAM_COLORS = ["#ff5a4e", "#4ea8ff", "#3ed18a", "#ffc23e", "#c77dff", "#ff8fd0", "#5ee0e0"];
function fmtDateTime(s) {
  if (!s) return "";
  const [d, t] = s.split("T");
  return `${fmtDate(d)} ${(t || "").slice(0, 5)}`;
}
// 種（数字1つ）から決まる乱数。同じ種なら、いつ・どの端末でも同じ並びになる
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 種から、横線と下のゴール（チーム番号を2つずつ）を作る
function buildLadder(seed, n) {
  const rnd = mulberry32(seed);
  const rungs = [];
  for (let r = 0; r < AMIDA_ROWS; r++) {
    const row = new Set();
    for (let c = 0; c < n - 1; c++) if (!row.has(c - 1) && rnd() < 0.45) row.add(c);
    rungs.push(row);
  }
  const labels = [];
  for (let i = 0; i < n / 2; i++) labels.push(i, i);
  for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
  return { rungs, labels };
}
// 上の列から下までたどったときの、各段での列
function traceCols(ladder, startCol) {
  let c = startCol;
  const cols = [c];
  ladder.rungs.forEach(row => { if (row.has(c)) c += 1; else if (row.has(c - 1)) c -= 1; cols.push(c); });
  return cols;
}
// 位置（1〜n番）と種から、チーム（2人ずつ）を出す
function amidaTeams(seed, slots) {
  const ids = Object.keys(slots).map(Number);
  const lad = buildLadder(seed, ids.length);
  const byTeam = {};
  ids.forEach(id => {
    const cols = traceCols(lad, slots[id] - 1);
    const team = lad.labels[cols[cols.length - 1]];
    (byTeam[team] = byTeam[team] || []).push(id);
  });
  return Object.keys(byTeam).map(Number).sort((a, b) => a - b).map(k => byTeam[k].sort((a, b) => slots[a] - slots[b]));
}
// ---- 予選（段階3a） ----
const SEAT_NAMES = ["東", "南", "西", "北"];
const ruleOf = s => ({
  starting: Number(s.ruleStarting ?? 25000),
  kaeshi: Number(s.ruleKaeshi ?? 30000),
  uma: (s.ruleUma || [20, 10, -10, -20]).map(Number),
});
// 素点から順位点：（素点−返し）÷1000＋ウマ（トップにはオカ）。同点は上家（席順が先）が上位
function calcPoints(raw, order, rule) {
  const ranked = [...order].sort((a, b) => (raw[b] - raw[a]) || (order.indexOf(a) - order.indexOf(b)));
  const oka = (rule.kaeshi - rule.starting) * 4 / 1000;
  const out = {};
  ranked.forEach((id, i) => { out[id] = Math.round(((raw[id] - rule.kaeshi) / 1000 + rule.uma[i] + (i === 0 ? oka : 0)) * 10) / 10; });
  return out;
}
// 予選の組み合わせ（総当たりの回し方）。奇数チームは毎回1チーム休み。R回が一巡を超えたら並べ直して続ける
function buildSchedule(T, R) {
  const base = shuffle(Array.from({ length: T }, (_, i) => i));
  const arr = T % 2 ? [...base, -1] : base;
  const M = arr.length;
  let a = [...arr];
  const rounds = [];
  for (let r = 0; r < R; r++) {
    if (r > 0 && r % (M - 1) === 0) a = shuffle(arr);
    const pairs = []; let bye = null;
    for (let i = 0; i < M / 2; i++) {
      const x = a[i], y = a[M - 1 - i];
      if (x === -1) bye = y; else if (y === -1) bye = x; else pairs.push(shuffle([x, y]));
    }
    rounds.push({ pairs: shuffle(pairs), bye });
    a = [a[0], a[M - 1], ...a.slice(1, M - 1)];
  }
  return rounds;
}
// 自動の席順：タッグの2人は対面（東と西、南と北）
function autoSeats(teamX, teamY) {
  const [X, Y] = shuffle([shuffle(teamX), shuffle(teamY)]);
  return [X[0], Y[0], X[1], Y[1]];
}
const gameMembers = (g, teams) => (g.seats && g.seats.length === 4 ? g.seats : g.team_idx.flatMap(i => teams[i] || []));
// チーム順位：順位点の合計、同点は合計チップ
function teamStandings(teams, games) {
  const rows = teams.map((tm, i) => ({ idx: i, members: tm, pts: 0, chips: 0, played: 0 }));
  games.filter(g => g.status === "done").forEach(g => g.team_idx.forEach(ti => {
    const row = rows[ti]; if (!row) return;
    row.played += 1;
    teams[ti].forEach(id => { row.pts += Number(g.points?.[id] || 0); row.chips += Number(g.chips?.[id] || 0); });
  }));
  rows.forEach(r => { r.pts = Math.round(r.pts * 10) / 10; });
  return rows.sort((a, b) => (b.pts - a.pts) || (b.chips - a.chips));
}
// 個人成績：順位点・チップ・最高素点・役満
function indivStats(ids, games) {
  const out = Object.fromEntries(ids.map(id => [id, { pts: 0, chips: 0, best: null, yakuman: 0, games: 0 }]));
  games.filter(g => g.status === "done").forEach(g => {
    Object.keys(g.raw || {}).forEach(k => {
      const id = Number(k); const o = out[id]; if (!o) return;
      o.games += 1; o.pts += Number(g.points?.[k] || 0); o.chips += Number(g.chips?.[k] || 0);
      const rv = Number(g.raw[k]); if (o.best === null || rv > o.best) o.best = rv;
    });
    (g.yakuman || []).forEach(id => { if (out[id]) out[id].yakuman += 1; });
  });
  Object.values(out).forEach(o => { o.pts = Math.round(o.pts * 10) / 10; });
  return out;
}
const fmtPt = v => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}`;

// ---- 決勝・3位決定戦・結果（段階3b） ----
const CARRY = { none: 0, all: 1, half: 0.5 };
// 決勝などの順位：持ち越し分（予選の順位点×割合）＋その段階の順位点。同点は大会通算チップ
function stageStandings(teamIdxs, teams, games, base = {}) {
  const rows = teamIdxs.map(i => ({ idx: i, members: teams[i], carry: base[i]?.pts || 0, pts: base[i]?.pts || 0, chips: base[i]?.chips || 0, played: 0 }));
  games.filter(g => g.status === "done").forEach(g => g.team_idx.forEach(ti => {
    const r = rows.find(x => x.idx === ti); if (!r) return;
    r.played += 1;
    teams[ti].forEach(id => { r.pts += Number(g.points?.[id] || 0); r.chips += Number(g.chips?.[id] || 0); });
  }));
  rows.forEach(r => { r.pts = Math.round(r.pts * 10) / 10; r.carry = Math.round(r.carry * 10) / 10; });
  return rows.sort((a, b) => (b.pts - a.pts) || (b.chips - a.chips));
}
function carryBase(prelimRows, idxs, factor) {
  const b = {};
  idxs.forEach(i => { const r = prelimRows.find(x => x.idx === i); b[i] = { pts: (r?.pts || 0) * factor, chips: r?.chips || 0 }; });
  return b;
}
// 大会結果：表彰台と個人賞
function computeResult({ teams, s, prelimRows, finalists, third, finalGames, thirdGames, allGames }) {
  const factor = CARRY[s.carryOver] ?? 0;
  const fRows = stageStandings(finalists, teams, finalGames, carryBase(prelimRows, finalists, factor));
  const tRows = third ? stageStandings(third, teams, thirdGames, carryBase(prelimRows, third, factor)) : null;
  const thirdIdx = tRows ? tRows[0].idx : (prelimRows.find(r => !finalists.includes(r.idx))?.idx ?? null);
  const ids = teams.flat();
  const ind = indivStats(ids, allGames);
  const maxOf = key => Math.max(...ids.map(id => ind[id][key] ?? -Infinity));
  const chipVal = maxOf("chips");
  const highVal = maxOf("best");
  const nonFinal = ids.filter(id => !finalists.some(ti => teams[ti].includes(id))).sort((a, b) => ind[a].pts - ind[b].pts);
  return {
    podium: [fRows[0]?.idx ?? null, fRows[1]?.idx ?? null, thirdIdx],
    finalRows: fRows.map(r => ({ idx: r.idx, pts: r.pts, chips: r.chips, carry: r.carry })),
    awards: {
      chip: { ids: ids.filter(id => ind[id].chips === chipVal), value: chipVal },
      high: { ids: ids.filter(id => ind[id].best === highVal), value: highVal },
      booby: nonFinal.length >= 2 ? { ids: [nonFinal[1]], value: ind[nonFinal[1]].pts } : null,
      yakuman: ids.filter(id => ind[id].yakuman > 0).map(id => ({ id, count: ind[id].yakuman })),
    },
    decidedAt: new Date().toISOString(),
  };
}

// ---- 優勝チーム予想（段階4b）：外馬と同じコイン。倍率は強さから決める固定の倍率 ----
const PRED_TEMP = 8; // 強さの差を確率に直すときのなだらかさ（大きいほど差が出にくい）
// チームの強さ（2人の補正つき平均の合計）から、優勝する確率を出す
function teamWinProbs(teams, strengths) {
  const sc = teams.map(tm => tm.reduce((a, id) => a + (strengths[id]?.adj || 0), 0));
  const ex = sc.map(v => Math.exp(v / PRED_TEMP));
  const tot = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => v / tot);
}
const clampOdds = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v * 10) / 10));
const tanshoOddsOf = (probs, i) => clampOdds(1 / probs[i], 1.1, 99.9);
const umatanOddsOf = (probs, i, j) => clampOdds(1 / (probs[i] * probs[j] / (1 - probs[i])), 1.5, 199.9);
// 保有コイン＝生涯の半荘数－賭けた枚数＋払い戻し（外馬の画面と同じ計算）
function coinsOf(id, sessions, raceBets) {
  let games = 0;
  sessions.forEach(ss => {
    if (!(ss.members || []).map(Number).includes(Number(id))) return; // 外馬の画面と同じく、参加した対局だけ数える
    (ss.rounds || []).forEach(r => { const v = r.scores?.[String(id)] ?? r.scores?.[id]; if (v != null) games += 1; });
  });
  let delta = 0;
  raceBets.filter(b => Number(b.bettor_id) === Number(id)).forEach(b => {
    const amt = b.bet_amount || 1;
    delta -= amt;
    if (b.is_hit && b.payout > 0) delta += Math.round(Number(b.payout) * amt);
  });
  return games + delta;
}
const predKey = t => `T${t.id}`; // race_bets.session_date に入れる大会の印（日付の形ではないので、いつもの外馬には混ざらない）

// ---- 表彰写真・歴代チャンピオン ----
const PHOTO_BUCKET = "tournament-photos";
const PLACE_COLORS = ["#f7cd79", "#cfd8dc", "#d7a173"];
const MEDALS = ["🥇", "🥈", "🥉"];
// 写真を縮める（向きはスマホの撮影情報どおり。maxSide＝長い辺のピクセル数）
async function resizeToBlob(file, maxSide, quality) {
  let src = null;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { src = null; }
  if (!src) {
    src = await new Promise((ok, ng) => { const img = new Image(); img.onload = () => ok(img); img.onerror = ng; img.src = URL.createObjectURL(file); });
  }
  const w = src.width, h = src.height;
  const sc = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * sc); c.height = Math.round(h * sc);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return await new Promise(ok => c.toBlob(ok, "image/jpeg", quality));
}
// 表彰写真を置く：大きい写真（1600px）と小さい写真（480px）。名前は毎回変えて上書きしない（スマホに1年保存させるため）
async function uploadPodiumPhoto(t, slot, file) {
  const base = `t${t.id}/p${slot}-${Date.now()}`;
  const [big, thumb] = await Promise.all([resizeToBlob(file, 1600, 0.86), resizeToBlob(file, 480, 0.82)]);
  const up = async (path, blob) => {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  };
  const bigUrl = await up(`${base}.jpg`, big);
  const thumbUrl = await up(`${base}-s.jpg`, thumb);
  const old = t.result?.photos?.[slot];
  const photos = { ...(t.result?.photos || {}), [slot]: { big: bigUrl, thumb: thumbUrl, paths: [`${base}.jpg`, `${base}-s.jpg`] } };
  const { error } = await supabase.from("tournaments").update({ result: { ...(t.result || {}), photos }, updated_at: new Date().toISOString() }).eq("id", t.id);
  if (error) throw error;
  if (old?.paths) await supabase.storage.from(PHOTO_BUCKET).remove(old.paths); // 古い写真は消す
}
// 1〜3位の顔ぶれ（アプリで行った大会はチームから、過去の記録は入力した内容から）
function podiumOf(t) {
  const r = t.result || {};
  if (r.manual) return [0, 1, 2].map(i => ({ ids: r.podiumIds?.[i] || [], names: r.podiumNames?.[i] || [], teamIdx: null }));
  const teams = t.draw?.teams || [];
  return (r.podium || []).map(ti => ({ ids: ti == null ? [] : (teams[ti] || []), names: [], teamIdx: ti }));
}
const placeNames = (pl, members) => [...pl.ids.map(id => members.find(m => m.id === id)?.name || "？"), ...pl.names];
const isHall = t => t.status === "done" && (t.result?.manual ? true : !!(t.result?.podium && t.draw?.teams));

function randomSeed() {
  const r = new Uint32Array(1); window.crypto.getRandomValues(r);
  return r[0] || 1;
}
const CARRY_LABEL = { none: "持ち越さない", all: "全部持ち越す", half: "半分持ち越す" };
const CARRY_PRIORITY = ["none", "half", "all"];
function carryTally(tEntries) {
  const v = { none: [], all: [], half: [] };
  tEntries.forEach(e => { if (e.status === "join" && v[e.carry_vote]) v[e.carry_vote].push(e.member_id); });
  return v;
}
const carryDecision = v => { const max = Math.max(...CARRY_PRIORITY.map(k => v[k].length)); return CARRY_PRIORITY.find(k => v[k].length === max); };
// 実際に使う持ち越しルール（投票のときは集計から自動で決まる）
const effectiveCarry = (s, tEntries) => (s.carryOver === "vote" ? carryDecision(carryTally(tEntries)) : (s.carryOver || "none"));

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
  L.push(["候補日", (tDates.length ? tDates.map(d => fmtDate(d.date)).join("／") : "未定") + (s.startTime ? `（${s.startTime}開始）` : "")]);
  if (s.dateNote) L.push(["運営より", s.dateNote]);
  if (t.entry_deadline) L.push(["受付締切", fmtDate(t.entry_deadline)]);
  L.push(["形式", s.format === "tag" ? "タッグ戦（2人1組）" : "個人戦"]);
  L.push(["参加費", `${yen(s.entryFee)}（場代は別）`]);
  L.push(["進行", `予選${s.prelimGames}回 → 上位${s.finalists}${unit}が決勝（${s.finalGames}回）`]);
  L.push(["3位", s.thirdMode === "playoff"
    ? `予選敗退の上位2${unit}で3位決定戦（決勝と同時進行）`
    : `決勝に進めなかった${unit}のうち、予選の最上位`]);
  L.push(["同点", `${s.tiebreak}で決定`]);
  {
    const r = ruleOf(s);
    const oka = (r.kaeshi - r.starting) * 4 / 1000;
    L.push(["順位点", `配給${r.starting.toLocaleString()}点・返し${r.kaeshi.toLocaleString()}点・ウマ${r.uma.join("/")}${oka ? `（トップにオカ+${oka}）` : ""}`]);
    const carryText = { none: "予選の点は持ち越さない（決勝はゼロから）", all: "予選の点を全部持ち越す", half: "予選の点を半分持ち越す" };
    if (s.carryOver === "vote") {
      const v = carryTally(tEntries);
      const cnt = `持ち越さない ${v.none.length}票／半分 ${v.half.length}票／全部 ${v.all.length}票`;
      L.push(["決勝", entryClosed(t) ? `参加者の投票で決定 → ${carryText[carryDecision(v)]}（${cnt}）` : `参加者の投票で決定（締切時点で多い方。同数は持ち越さない）\n現在：${cnt}`]);
    } else {
      L.push(["決勝", carryText[s.carryOver] || carryText.none]);
    }
  }
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
  if (t.status === "entry" && !entryClosed(t)) {
    // 受付中：優勝・準優勝だけ確定。ほかの賞は参加者の投票で決める（2026-10-03 本人決定）
    const fixed = PRIZES.filter(p => !AWARD_CANDIDATES.includes(p.key)).map(p => p.label).join("・");
    const v = awardTallyOf(tEntries);
    const cnt = AWARD_CANDIDATES.map(k => { const p = PRIZES.find(x => x.key === k); return `${p.voteLabel || p.label} ${v[k].length}票`; }).join("／");
    L.push(["賞", `確定：${fixed}\nほかは参加者の投票で決定（1人${AWARD_VOTE_MAX}票）\n現在：${cnt}`]);
  } else {
    L.push(["賞", prizes.length ? prizes.join("／") : "未定"]);
  }
  if (s.note) L.push(["補足", s.note]);
  if (s.afterpartyNote) {
    const ys = tEntries.filter(e => e.status === "join" && e.afterparty === "yes");
    const comp = ys.reduce((a, e) => a + (e.companions || 0), 0);
    L.push(["二次会", `${s.afterpartyNote}（参加 ${ys.length}名${comp ? `＋同伴${comp}名` : ""}＝計${ys.length + comp}名）`]);
  }
  return L;
}
function statusLabel(t) {
  if (!t) return "";
  if (t.status === "entry") return "参加受付中";
  if (t.status === "closed") return "受付終了";
  if (t.status === "prelim") return "予選中";
  if (t.status === "final") return "決勝中";
  if (t.status === "done") return "大会終了";
  return t.status;
}
function lineText(t, tDates, tEntries, members = [], games = []) {
  const s = settingsOf(t);
  const head = `【${s.edition ? s.edition + " " : ""}${t.name}】${statusLabel(t)}${t.entry_deadline ? `（締切 ${fmtDate(t.entry_deadline)}）` : ""}`;
  let body = regulationLines(t, tDates, tEntries).map(([k, v]) => `■ ${k}：${v}`).join("\n");
  const teams = t.draw?.teams;
  if (!teams?.length && t.draw?.method === "amida" && (t.draw.pickDeadline || t.draw.liveAt)) {
    body += `\n■ あみだくじ：${t.draw.pickDeadline ? `位置選びの締切 ${fmtDate(t.draw.pickDeadline)}` : ""}${t.draw.pickDeadline && t.draw.liveAt ? "／" : ""}${t.draw.liveAt ? `ライブ ${fmtDateTime(t.draw.liveAt)}` : ""}`;
  }
  const pg = games.filter(g => g.tournament_id === t.id && g.stage === "prelim" && g.status === "done");
  if (teams?.length && pg.length) {
    body += "\n■ 予選順位：\n" + teamStandings(teams, pg).map((r, i) => `　${i + 1}位 チーム${TEAM_NAMES[r.idx]}（${fmtPt(r.pts)}・チップ${r.chips}）`).join("\n");
  }
  const res = t.result;
  if (t.status === "done" && res?.podium && teams?.length) {
    const nm2 = id => members.find(m => m.id === id)?.name || "？";
    const medal = ["🥇優勝", "🥈準優勝", "🥉3位"];
    body += "\n■ 結果：\n" + res.podium.map((ti, i) => (ti == null ? "" : `　${medal[i]} チーム${TEAM_NAMES[ti]}（${teams[ti].map(nm2).join(" × ")}）`)).filter(Boolean).join("\n");
    const a = res.awards || {};
    if (a.chip) body += `\n　チップ賞：${a.chip.ids.map(nm2).join("・")}（${a.chip.value}枚）`;
    if (a.high) body += `\n　最高得点賞：${a.high.ids.map(nm2).join("・")}（${Number(a.high.value).toLocaleString()}点）`;
    if (a.booby) body += `\n　ブービー賞：${a.booby.ids.map(nm2).join("・")}`;
    if (a.yakuman?.length) body += `\n　役満賞：${a.yakuman.map(y => `${nm2(y.id)}（${y.count}回）`).join("・")}`;
  }
  if (teams?.length) {
    const nm = id => members.find(m => m.id === id)?.name || "？";
    body += "\n■ チーム：\n" + teams.map((tm, i) => `　チーム${TEAM_NAMES[i]}：${tm.map(nm).join(" × ")}`).join("\n");
  }
  // 受付中は、文頭に回答のお願いを入れる（LINEで一目で「回答が必要」とわかるように）
  if (t.status === "entry") {
    const title = `${s.edition ? s.edition + " " : ""}${t.name}`;
    const ask = [
      `📣【${title}】参加アンケートのお願い`,
      "",
      "大会の参加・不参加の回答と、出られる候補日の投票にご協力お願いします🙏",
      t.entry_deadline ? `締切：${fmtDate(t.entry_deadline)}` : "",
      "",
      "▼ アプリの大会タブ →「参加・不参加を回答」から",
      SHARE_URL,
      "",
      "――― 大会の内容 ―――",
    ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
    return `${ask}\n${head}\n${body}`;
  }
  return `${head}\n${body}\n▼ 大会の詳細はアプリから\n${SHARE_URL}`;
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
.tk-flashrow{animation:tkRow 1.6s ease-out}
@keyframes tkRow{0%{background:rgba(255,216,74,.55)}100%{background:transparent}}
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
export default function Taikai({ members, sessions = [], Av, showToast }) {
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
  const [games, setGames] = useState([]);
  const [raceBets, setRaceBets] = useState([]);
  const [photoView, setPhotoView] = useState(null); // 拡大表示する写真のURL
  const [hallView, setHallView] = useState(null);   // 歴代チャンピオンで開いた大会のID
  const [historyEdit, setHistoryEdit] = useState(null); // 直す過去の記録（null＝新しく追加）
  const [uploading, setUploading] = useState(null); // アップロード中の枠 "大会ID-順位"
  const [gameSheet, setGameSheet] = useState(null); // 点数を入力する対局

  // ---- データ ----
  const reload = useCallback(async () => {
    const [t, d, e, g, rb] = await Promise.all([
      supabase.from("tournaments").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("tournament_dates").select("*").order("date"),
      supabase.from("tournament_entries").select("*"),
      supabase.from("tournament_games").select("*").order("round").order("table_no"),
      supabase.from("race_bets").select("*"),
    ]);
    const err = t.error || d.error || e.error || g.error;
    if (err) { console.error("taikai load error:", err); showToast("error", "⚠️ 大会データの読み込み失敗: " + err.message); }
    if (t.data) setTournaments(t.data);
    if (d.data) setDates(d.data);
    if (e.data) setEntries(e.data);
    if (g.data) setGames(g.data);
    if (rb.data) setRaceBets(rb.data);
    setLoaded(true);
  }, [showToast]);

  useEffect(() => {
    reload();
    // 即時反映（表ごとに別チャンネル）
    const chs = ["tournaments", "tournament_dates", "tournament_entries", "tournament_games", "race_bets"].map(table =>
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
  const visible = tournaments.filter(t => !t.settings?.manual && (t.visibility === "public" || isAdmin)); // 過去の記録（手入力）は今の大会にしない
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
    const text = lineText(cur, tDates, tEntries, members, games);
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "📋 LINE用の文章をコピーしました");
    } catch (e) {
      setCopyFallback(text); // コピーできない端末では、文章を出して長押しでコピー
    }
  };
  // LINEで送る：送り先を選ぶ画面が開く。文章内のリンクが大会の画像つきカードになる
  const shareLine = () => {
    if (!cur) return;
    const text = lineText(cur, tDates, tEntries, members, games);
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };


  const regLines = cur ? regulationLines(cur, tDates, tEntries) : [];
  const teamVoteOn = s.format === "tag" && s.teamMode === "vote";
  const awardTally = awardTallyOf(cur ? entries.filter(e => e.tournament_id === cur.id) : []);
  const curEntries = cur ? entries.filter(e => e.tournament_id === cur.id) : [];
  const carryVoteOn = s.carryOver === "vote";
  const cTally = carryTally(curEntries);
  const effCarry = effectiveCarry(s, curEntries);
  const partyOn = !!(s.afterpartyNote || "").trim();
  const partyYes = curEntries.filter(e => e.status === "join" && e.afterparty === "yes");
  const partyNo = curEntries.filter(e => e.status === "join" && e.afterparty === "no");
  const partyComp = partyYes.reduce((a, e) => a + (e.companions || 0), 0);
  const tally = teamTally(tEntries);
  const commentList = tEntries.filter(e => (e.comment || "").trim())
    .map(e => ({ e, m: members.find(m => m.id === e.member_id) })).filter(x => x.m);

  // ---- チーム決め ----
  const draw = cur?.draw || {};
  const teams = draw.teams || null;
  const isTag = s.format === "tag";
  const closed = entryClosed(cur);
  const teamMethod = s.teamMode === "vote" ? teamDecision(tally) : s.teamMode;
  const players = joinList;
  const strengths = calcStrengths(sessions, players.map(m => m.id));
  const ranked = [...players].sort((a, b) => strengths[b.id].adj - strengths[a.id].adj);
  const half = Math.floor(ranked.length / 2);
  const groupA = ranked.slice(0, half), groupB = ranked.slice(half);
  const evenOk = players.length >= 4 && players.length % 2 === 0;
  const myTeamIdx = teams ? teams.findIndex(tm => tm.includes(selfId)) : -1;

  const saveDraw = async (next, guardNoTeams) => {
    let q = supabase.from("tournaments").update({ draw: next, updated_at: new Date().toISOString() }).eq("id", cur.id);
    if (guardNoTeams) q = q.is("draw->teams", null); // 二重スタート防止：まだチームが無いときだけ書き込む
    const { data, error } = await q.select();
    if (error) { console.error("draw save error:", error); showToast("error", "⚠️ 保存失敗: " + error.message); return false; }
    if (!data?.length) { showToast("error", "⚠️ すでにチームが決まっています"); reload(); return false; }
    reload();
    return true;
  };
  const startBalanced = async () => {
    if (!evenOk) return;
    if (!window.confirm(`戦力均衡ランダムで${players.length}人のチームを抽選します。\n一度スタートすると、全員の画面で発表されます。よろしいですか？`)) return;
    const bShuf = shuffle(groupB.map(m => m.id));
    const pairs = shuffle(groupA.map((m, i) => [m.id, bShuf[i]])); // チームの並び（A・B…）も抽選
    await saveDraw({
      ...draw, method: "balanced", teams: pairs, startedAt: new Date().toISOString(),
      groups: { A: groupA.map(m => m.id), B: groupB.map(m => m.id) },
      strengths: Object.fromEntries(players.map(m => [m.id, Math.round(strengths[m.id].adj * 10) / 10])),
    }, true);
  };
  const saveManual = async pairs => {
    const flat = pairs.flat();
    if (flat.some(x => !x) || new Set(flat).size !== flat.length || flat.length !== players.length) {
      showToast("error", "⚠️ 全員を1回ずつ、重ならないように入れてください"); return;
    }
    await saveDraw({ ...draw, method: "manual", teams: pairs, startedAt: new Date().toISOString() }, true);
  };
  const resetDraw = async () => {
    if (!window.confirm("チームの決定をやり直しますか？\n「やり直した回数」は全員の画面に表示されます。")) return;
    await saveDraw({ resets: (draw.resets || 0) + 1 }, false);
    showToast("success", "チームをリセットしました");
  };

  // 抽選の発表演出（スタートの瞬間に開いていた人・途中から開いた人は続きから）
  const [reveal, setReveal] = useState(null);
  const lastRevealRef = useRef(null);
  useEffect(() => {
    const st = draw.startedAt;
    if (!st || !teams || (draw.method !== "balanced" && draw.method !== "amida")) return;
    if (phase !== "done") return; // 入場してから判断する
    if (lastRevealRef.current === st) return;
    lastRevealRef.current = st;
    const startMs = Date.parse(st);
    const total = draw.method === "amida" ? amidaTotal(Object.keys(draw.slots || {}).length) : revealTotal(teams.length);
    if (Date.now() - startMs < total * 1000) setReveal({ startMs });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw.startedAt, phase]);

  // ---- 予選（段階3a） ----
  const rule = ruleOf(s);
  const tGames = cur ? games.filter(g => g.tournament_id === cur.id) : [];
  const prelimGames = tGames.filter(g => g.stage === "prelim");
  const inProgress = ["prelim", "final", "done"].includes(cur?.status);
  const standings = teams ? teamStandings(teams, prelimGames) : [];
  const indiv = teams ? indivStats(teams.flat(), tGames) : {};
  // 速報ボード：進み具合・前の回戦からの順位変動・点差
  const prelimRounds = [...new Set(prelimGames.map(g => g.round))].sort((a, b) => a - b);
  const roundDone = rd => prelimGames.filter(g => g.round === rd).every(g => g.status === "done");
  const curRound = prelimRounds.find(rd => !roundDone(rd)) || null;
  const doneCount = prelimGames.filter(g => g.status === "done").length;
  const lastDoneRound = [...prelimRounds].reverse().find(rd => roundDone(rd)) || 0;
  const partial = curRound && prelimGames.some(g => g.round === curRound && g.status === "done");
  const baseRound = partial ? lastDoneRound : lastDoneRound - 1; // 比べる相手：直前に全卓が終わった回戦
  const prevRank = {};
  if (teams && baseRound >= 1) teamStandings(teams, prelimGames.filter(g => g.round <= baseRound)).forEach((r, i) => { prevRank[r.idx] = i; });
  const remainOf = ti => prelimGames.filter(g => g.status !== "done" && g.team_idx.includes(ti)).length;
  const fin = Number(s.finalists || 2);
  const myNext = teams ? prelimGames.find(g => g.status !== "done" && gameMembers(g, teams).includes(selfId)) : null;
  const canInput = g => isAdmin || (!!teams && gameMembers(g, teams).includes(selfId)); // その卓の4人と運営は、入力済みでも修正できる
  // ---- 決勝・3位決定戦・結果（段階3b） ----
  const result = cur?.result || {};
  const finalGames = tGames.filter(g => g.stage === "final");
  const thirdGames = tGames.filter(g => g.stage === "third");
  const factor = CARRY[effCarry] ?? 0;
  const finalRows = result.finalists && teams ? stageStandings(result.finalists, teams, finalGames, carryBase(standings, result.finalists, factor)) : [];
  const thirdRows = result.third && teams ? stageStandings(result.third, teams, thirdGames, carryBase(standings, result.third, factor)) : [];
  const nowTop = standings.slice(0, 2).map(r => r.idx);
  const finalistsChanged = !!result.finalists && (nowTop.length === 2) && (nowTop.some(i => !result.finalists.includes(i)));
  const allPrelimDone = prelimGames.length > 0 && prelimGames.every(g => g.status === "done");
  const allFinalDone = finalGames.length > 0 && finalGames.every(g => g.status === "done") && thirdGames.every(g => g.status === "done");
  const myNextAny = teams ? [...prelimGames, ...finalGames, ...thirdGames].find(g => g.status !== "done" && gameMembers(g, teams).includes(selfId)) : null;
  const startFinal = async () => {
    if (!allPrelimDone) { showToast("error", "⚠️ 予選に未入力の卓があります"); return; }
    if (standings.length < 2) return;
    if (Number(s.finalists || 2) !== 2) { showToast("error", "⚠️ 決勝は2チーム（1卓）のみ対応しています。決勝進出数を2にしてください"); return; }
    const finalists = standings.slice(0, 2).map(r => r.idx);
    const third = s.thirdMode === "playoff" && standings.length >= 4 ? standings.slice(2, 4).map(r => r.idx) : null;
    if (!window.confirm(`予選を終了して決勝へ進めます。\n決勝：チーム${TEAM_NAMES[finalists[0]]} vs チーム${TEAM_NAMES[finalists[1]]}${third ? `\n3位決定戦：チーム${TEAM_NAMES[third[0]]} vs チーム${TEAM_NAMES[third[1]]}` : ""}\nよろしいですか？`)) return;
    const R = Math.max(1, Number(s.finalGames) || 3);
    const rows = [];
    for (let rd = 1; rd <= R; rd++) {
      rows.push({ tournament_id: cur.id, stage: "final", round: rd, table_no: 1, team_idx: finalists, seats: s.seatMode === "auto" ? autoSeats(teams[finalists[0]], teams[finalists[1]]) : null });
      if (third) rows.push({ tournament_id: cur.id, stage: "third", round: rd, table_no: 2, team_idx: third, seats: s.seatMode === "auto" ? autoSeats(teams[third[0]], teams[third[1]]) : null });
    }
    const { error } = await supabase.from("tournament_games").insert(rows);
    if (error) { showToast("error", "⚠️ 決勝の組み合わせ保存失敗: " + error.message); return; }
    await supabase.from("tournaments").update({ status: "final", result: { finalists, third, prelimSnapshot: standings.map(r => ({ idx: r.idx, pts: r.pts, chips: r.chips })) }, updated_at: new Date().toISOString() }).eq("id", cur.id);
    showToast("success", "🏆 決勝の組み合わせを作りました");
    reload();
  };
  const cancelFinal = async () => {
    if ([...finalGames, ...thirdGames].some(g => g.status === "done")) { showToast("error", "⚠️ 決勝に点数が入っているので取り消せません"); return; }
    if (!window.confirm("決勝の組み合わせを取り消して、予選に戻しますか？")) return;
    await supabase.from("tournament_games").delete().eq("tournament_id", cur.id).in("stage", ["final", "third"]);
    await supabase.from("tournaments").update({ status: "prelim", result: {}, updated_at: new Date().toISOString() }).eq("id", cur.id);
    reload();
  };
  const finishTournament = async () => {
    if (!allFinalDone) { showToast("error", "⚠️ 決勝・3位決定戦に未入力の卓があります"); return; }
    const res = computeResult({ teams, s: { ...s, carryOver: effCarry }, prelimRows: standings, finalists: result.finalists, third: result.third, finalGames, thirdGames, allGames: tGames });
    if (!window.confirm(`大会を終了して結果を確定します。\n優勝：チーム${TEAM_NAMES[res.podium[0]]}\nよろしいですか？`)) return;
    const { error } = await supabase.from("tournaments").update({ status: "done", result: { ...result, ...res }, updated_at: new Date().toISOString() }).eq("id", cur.id);
    if (error) { showToast("error", "⚠️ 結果の保存失敗: " + error.message); return; }
    await settlePredictions(res.podium);
    showToast("success", "🏆 大会の結果を確定しました");
    reload();
  };
  const reopenTournament = async () => {
    if (!window.confirm("結果の確定を取り消して、決勝中に戻しますか？（点数を直したあと、もう一度「大会終了」を押してください）")) return;
    const { podium, finalRows: fr, awards, decidedAt, ...rest } = result;
    await supabase.from("tournaments").update({ status: "final", result: rest, updated_at: new Date().toISOString() }).eq("id", cur.id);
    await settlePredictions(null);
    reload();
  };
  const hallOfFame = tournaments.filter(t => isHall(t) && (t.visibility === "public" || isAdmin))
    .sort((a, b) => String(b.result?.decidedAt || "").localeCompare(String(a.result?.decidedAt || "")));

  // ---- 優勝チーム予想（段階4b） ----
  const predOpen = !!teams && cur?.status === "closed";
  const predBets = cur ? raceBets.filter(b => b.session_date === predKey(cur)) : [];
  const allStrengths = teams ? calcStrengths(sessions, teams.flat()) : {};
  const winProbs = teams ? teamWinProbs(teams, allStrengths) : [];
  const myCoins = selfId ? coinsOf(selfId, sessions, raceBets) : 0;
  const buyPrediction = async (type, sel, amount) => {
    if (!predOpen || !selfId) return;
    const amt = Math.floor(Number(amount));
    if (!(amt >= 1)) { showToast("error", "⚠️ 枚数を入れてください"); return; }
    if (amt > myCoins) { showToast("error", `⚠️ コインが足りません（保有 ${myCoins}枚）`); return; }
    const odds = type === "t_tansho" ? tanshoOddsOf(winProbs, sel[0]) : umatanOddsOf(winProbs, sel[0], sel[1]);
    if (!window.confirm(`${type === "t_tansho" ? "単勝" : "馬単"}：${sel.map(i => `チーム${TEAM_NAMES[i]}`).join(" → ")}\n${amt}枚 × ${odds}倍（当たれば ${Math.round(amt * odds)}枚）\n購入しますか？`)) return;
    // 外馬の表には「同じ印・同じ番号・同じ人は1件だけ」の決まりがあるので、番号に「この人の何件目の予想か」を入れる
    const mine = predBets.filter(b => Number(b.bettor_id) === Number(selfId));
    const nextIdx = mine.reduce((m, b) => Math.max(m, Number(b.round_index) + 1), 0);
    const { error } = await supabase.from("race_bets").insert({
      session_date: predKey(cur), round_index: nextIdx, bettor_id: selfId, bet_type: type, bet_selection: sel, odds, bet_amount: amt,
    });
    if (error) { showToast("error", error.code === "23505" ? "⚠️ 同時に購入が重なりました。もう一度押してください" : "⚠️ 購入失敗: " + error.message); reload(); return; }
    showToast("success", "🎯 予想を購入しました");
    reload();
  };
  // 大会終了で払い戻し、確定の取り消しで元に戻す
  const settlePredictions = async (podium) => {
    for (const b of predBets) {
      const sel = b.bet_selection || [];
      const hit = podium ? (b.bet_type === "t_tansho" ? sel[0] === podium[0] : sel[0] === podium[0] && sel[1] === podium[1]) : null;
      await supabase.from("race_bets").update(podium
        ? { actual_result: [podium[0], podium[1]], is_hit: hit, payout: hit ? Number(b.odds) : 0 }
        : { actual_result: null, is_hit: null, payout: null }).eq("id", b.id);
    }
  };

  const onPodiumPhoto = async (t, slot, file) => {
    if (!file) return;
    setUploading(`${t.id}-${slot}`);
    try {
      await uploadPodiumPhoto(t, slot, file);
      showToast("success", "📷 写真を入れました");
      reload();
    } catch (e) {
      console.error("photo upload error:", e);
      showToast("error", "⚠️ 写真の保存失敗: " + (e?.message || e));
    } finally {
      setUploading(null);
    }
  };

  const lastPtsRef = useRef({});
  const changedTeams = new Set(standings.filter(r => lastPtsRef.current[r.idx] !== undefined && lastPtsRef.current[r.idx] !== r.pts).map(r => r.idx));
  useEffect(() => { const m = {}; standings.forEach(r => { m[r.idx] = r.pts; }); lastPtsRef.current = m; });
  const makeSchedule = async (skipConfirm) => {
    if (!teams) return;
    const R = Math.max(1, Number(s.prelimGames) || 3);
    if (!skipConfirm && !window.confirm(`予選${R}回分の組み合わせ${s.seatMode === "auto" ? "と席順" : ""}を作ります。よろしいですか？`)) return;
    const rows = buildSchedule(teams.length, R).flatMap((round, ri) => round.pairs.map((pr, ti) => ({
      tournament_id: cur.id, stage: "prelim", round: ri + 1, table_no: ti + 1, team_idx: pr,
      seats: s.seatMode === "auto" ? autoSeats(teams[pr[0]], teams[pr[1]]) : null,
    })));
    const { error } = await supabase.from("tournament_games").insert(rows);
    if (error) { console.error("schedule error:", error); showToast("error", "⚠️ 組み合わせの保存失敗: " + error.message); return; }
    await supabase.from("tournaments").update({ status: "prelim", updated_at: new Date().toISOString() }).eq("id", cur.id);
    showToast("success", "🀄 予選の組み合わせを作りました");
    reload();
  };
  const rebuildSchedule = async () => {
    if (prelimGames.some(g => g.status === "done")) { showToast("error", "⚠️ 点数が入った対局があるので作り直せません"); return; }
    if (!window.confirm("予選の組み合わせを作り直しますか？")) return;
    const { error } = await supabase.from("tournament_games").delete().eq("tournament_id", cur.id).eq("stage", "prelim");
    if (error) { showToast("error", "⚠️ 削除失敗: " + error.message); return; }
    await makeSchedule(true);
  };

  // ---- 今のあなたがやること ----
  const todo = (() => {
    if (!cur) return null;
    if (!entryOpen) {
      if (cur.status === "done" && result.podium) {
        const rank = result.podium.indexOf(myTeamIdx);
        return { text: rank >= 0 ? `大会終了！あなたのチームは${["優勝", "準優勝", "3位"][rank]}です` : "大会は終了しました。結果発表をご覧ください", done: true };
      }
      if (cur.status === "final" && teams && myTeamIdx >= 0) {
        const g = myNextAny;
        if (!g) return { text: (result.finalists || []).includes(myTeamIdx) || (result.third || []).includes(myTeamIdx) ? "あなたの対局はすべて終わりました。結果をお待ちください" : "決勝が始まりました。余興の半荘は「➕ 対局開始」の卓2・卓3で記録できます", done: true };
        const seat = g.seats ? g.seats.indexOf(selfId) : -1;
        return { text: `${g.stage === "final" ? "決勝" : "3位決定戦"} 第${g.round}回戦・卓${g.table_no}${seat >= 0 ? `。あなたの席は「${SEAT_NAMES[seat]}」` : ""}`, done: true };
      }
      if (cur.status === "prelim" && teams && myTeamIdx >= 0) {
        if (!myNext) return { text: "予選のあなたの対局は、すべて終わりました", done: true };
        const vs = myNext.team_idx.map(i => `チーム${TEAM_NAMES[i]}`).join(" vs ");
        const seat = myNext.seats ? myNext.seats.indexOf(selfId) : -1;
        return { text: `次は 第${myNext.round}回戦・卓${myNext.table_no}（${vs}）${seat >= 0 ? `。あなたの席は「${SEAT_NAMES[seat]}」` : ""}`, done: true };
      }
      if (isTag && myTeamIdx >= 0) {
        const mate = members.find(m => m.id === teams[myTeamIdx].find(id => id !== selfId));
        return { text: `あなたはチーム${TEAM_NAMES[myTeamIdx]}（相方：${mate?.name || "？"}）です`, done: true };
      }
      if (isTag && myEntry?.status === "join" && !teams && teamMethod === "amida") {
        if (!draw.locked) {
          const mine = myEntry.amida_slot && myEntry.amida_slot <= players.length ? myEntry.amida_slot : null;
          const dl = draw.pickDeadline ? `締切 ${fmtDate(draw.pickDeadline)}` : "";
          return mine
            ? { text: `あみだの位置は ${mine}番 を選んでいます${dl ? `（${dl}まで変更できます）` : ""}`, done: true }
            : { text: `あみだの位置（番号）を選んでください${dl ? `（${dl}）` : ""}。下の「チーム決め」の欄から選べます` };
        }
        return { text: `あみだのライブ${draw.liveAt ? `は ${fmtDateTime(draw.liveAt)} から` : "の開始をお待ちください"}。あなたは ${draw.slots?.[selfId] ?? "？"}番 です`, done: true };
      }
      if (isTag && myEntry?.status === "join" && !teams) return { text: "参加受付は締め切りました。チーム決めをお待ちください", done: true };
      return { text: deadlinePassed ? "参加受付は締め切りました" : "現在、参加受付はしていません", done: true };
    }
    if (!me) return { text: "まず「あなたは誰か」を選んで、参加・不参加を回答してください", action: "回答する" };
    if (!myEntry) return { text: `参加・不参加を回答してください${cur.entry_deadline ? `（締切 ${fmtDate(cur.entry_deadline)}）` : ""}`, action: "回答する" };
    if (myEntry.status === "join") {
      const mine = (myEntry.date_ids || []).filter(id => dateIds.has(id));
      if (tDates.length && !mine.length) return { text: "参加ありがとうございます。候補日に投票してください", action: "候補日に投票する" };
      if (s.format === "tag" && s.teamMode === "vote" && !myEntry.team_vote) return { text: "チーム決めの方法（あみだくじ／戦力均衡）にも投票してください", action: "投票する" };
      if (!(myEntry.award_votes || []).length) return { text: `採用してほしい賞を${AWARD_VOTE_MAX}つまで投票してください`, action: "投票する" };
      if (carryVoteOn && !myEntry.carry_vote) return { text: "決勝への予選の点の持ち越し（持ち越さない／半分／全部）にも投票してください", action: "投票する" };
      if (partyOn && !myEntry.afterparty) return { text: "二次会に参加するかを回答してください", action: "回答する" };
      const names = tDates.filter(d => mine.includes(d.id)).map(d => fmtDate(d.date)).join("・");
      return { text: `回答済み：参加${names ? `（${names}）` : ""}`, action: "回答を変更する", done: true };
    }
    return { text: "回答済み：不参加", action: "回答を変更する", done: true };
  })();

  return (
    <>
      <style>{CSS}</style>
      {phase !== "done" && phase !== "wait" && (
        <Intro kai={cur ? s.edition : ""} title={cur ? cur.name : "大会モード"} sub={s.subtitle} phase={phase} onTap={onIntroTap} />
      )}
      {phase === "wait" && <div className="tk-intro" style={{ background: "#000" }} onClick={onIntroTap} />}
      {reveal && teams && draw.method === "amida" && draw.slots && (
        <AmidaLive seed={draw.seed} slots={draw.slots} members={members} Av={Av} startMs={reveal.startMs} onClose={() => setReveal(null)} />
      )}
      {reveal && teams && draw.method !== "amida" && (
        <TeamReveal teams={teams} members={members} Av={Av} startMs={reveal.startMs} onClose={() => setReveal(null)} />
      )}

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

        {/* 結果発表（段階3b） */}
        {cur && teams && cur.status === "done" && result.podium && (
          <div className="tk-card" style={{ borderColor: "#f7cd79", boxShadow: "0 0 18px rgba(247,205,121,.35)" }}>
            <div className="tk-kicker" style={{ textAlign: "center" }}>RESULT</div>
            <div className="tk-hero-title" style={{ textAlign: "center", fontSize: 26 }}>結果発表</div>
            <Podium t={cur} members={members} Av={Av} isAdmin={isAdmin} uploading={uploading} onPhoto={onPodiumPhoto} onView={setPhotoView}
              label={i => (result.podium[i] == null ? "" : `チーム${TEAM_NAMES[result.podium[i]]}`)}
              prize={i => { const p = s.prizes?.[["first", "second", "third"][i]]; return p?.on && Number(p.amount) > 0 ? yen(p.amount) : ""; }} />
            <div className="tk-lbl" style={{ marginTop: 12 }}>個人賞</div>
            {[
              ["チップ賞", "chip", result.awards?.chip, v => `${v}枚`],
              ["最高得点賞", "highscore", result.awards?.high, v => `${Number(v).toLocaleString()}点`],
              ["ブービー賞", "booby", result.awards?.booby, v => fmtPt(v)],
            ].filter(([, key, a]) => a && (s.prizes?.[key]?.on ?? true)).map(([label, key, a, f]) => (
              <div key={key} className="tk-row" style={{ fontSize: 13, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <span style={{ width: 86, color: "#f7cd79", fontWeight: 700 }}>{label}</span>
                <span style={{ flex: 1 }}>{a.ids.map(id => members.find(m => m.id === id)?.name).join("・")}<span className="tk-muted">（{f(a.value)}）</span></span>
                {s.prizes?.[key]?.on && Number(s.prizes[key].amount) > 0 && <span style={{ color: "#f7cd79", fontSize: 12 }}>{yen(s.prizes[key].amount)}</span>}
              </div>
            ))}
            {result.awards?.yakuman?.length > 0 && (
              <div className="tk-row" style={{ fontSize: 13, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <span style={{ width: 86, color: "#f7cd79", fontWeight: 700 }}>役満賞</span>
                <span style={{ flex: 1 }}>{result.awards.yakuman.map(y => `${members.find(m => m.id === y.id)?.name}（${y.count}回）`).join("・")}<span className="tk-muted">　1回につき、他チームの参加者1人500円</span></span>
              </div>
            )}
            {isAdmin && <button className="tk-btn sub" style={{ marginTop: 10 }} onClick={reopenTournament}>↩ 結果の確定を取り消す（運営）</button>}
          </div>
        )}

        {/* 決勝・3位決定戦（段階3b） */}
        {cur && teams && (cur.status === "final" || cur.status === "done") && result.finalists && (
          <>
            {isAdmin && finalistsChanged && (
              <div className="tk-card" style={{ borderColor: "#e74c3c", background: "rgba(231,76,60,.15)" }}>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>⚠️ 予選の点数が修正され、今の計算では決勝進出が <b>チーム{TEAM_NAMES[nowTop[0]]}・チーム{TEAM_NAMES[nowTop[1]]}</b> になります（決勝は チーム{TEAM_NAMES[result.finalists[0]]}・チーム{TEAM_NAMES[result.finalists[1]]} で進行中）。必要なら「決勝の組み合わせを取り消す」から作り直してください（決勝に点数が入る前のみ）。</div>
              </div>
            )}
            {[["final", "🏆 決勝", finalRows, finalGames], ["third", "🥉 3位決定戦", thirdRows, thirdGames]].filter(([, , rows]) => rows.length).map(([key, title, rows, gs]) => (
              <div key={key} className="tk-card" style={{ borderColor: key === "final" ? "#f7cd79" : "rgba(247,205,121,.4)" }}>
                <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 style={{ margin: 0 }}>{title}</h3>
                  <span className="tk-pill on" style={{ fontSize: 10 }}>{gs.filter(g => g.status === "done").length}/{gs.length}回戦 終了</span>
                </div>
                {rows.map((r, i) => (
                  <div key={r.idx} style={{ padding: "7px 4px", borderTop: "1px solid rgba(255,255,255,.08)", background: r.idx === myTeamIdx ? "rgba(247,205,121,.10)" : "transparent" }}>
                    <div className="tk-row">
                      <span style={{ width: 22, fontFamily: "Dela Gothic One, sans-serif", fontSize: 16, color: i === 0 ? "#f7cd79" : "#bbb" }}>{i + 1}</span>
                      <span style={{ width: 56, fontSize: 13, fontWeight: 700 }}>チーム{TEAM_NAMES[r.idx]}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.members.map(id => members.find(m => m.id === id)?.name).join("・")}</span>
                      <span style={{ width: 56, textAlign: "right", fontWeight: 700, fontSize: 14, color: r.pts >= 0 ? "#f7cd79" : "#7fb9e0" }}>{fmtPt(r.pts)}</span>
                      <span className="tk-muted" style={{ width: 44, textAlign: "right" }}>🪙{r.chips}</span>
                    </div>
                    <div className="tk-muted" style={{ fontSize: 10, paddingLeft: 22, marginTop: 2 }}>
                      {factor ? `予選からの持ち越し ${fmtPt(r.carry)}　` : ""}
                      {i === 1 && rows[0] ? `1位まで ${(Math.round((rows[0].pts - r.pts) * 10) / 10).toFixed(1)}pt（素点で約${Math.round((rows[0].pts - r.pts) * 1000).toLocaleString()}点）` : i === 0 && rows[1] ? `${(Math.round((r.pts - rows[1].pts) * 10) / 10).toFixed(1)}pt リード` : ""}
                    </div>
                  </div>
                ))}
                <GameRounds gs={gs} teams={teams} members={members} selfId={selfId} canInput={canInput} onOpen={setGameSheet} />
              </div>
            ))}
            <div className="tk-muted" style={{ margin: "-2px 4px 10px" }}>
              大会の対局が終わったあとの半荘は、いつもの「➕ 対局開始」で記録してください（Tリーグの個人戦として、リーグ成績に入ります）。
            </div>
            {isAdmin && cur.status === "final" && (
              <div className="tk-card">
                <button className="tk-btn" disabled={!allFinalDone} onClick={finishTournament}>🏁 大会終了・結果を確定（運営）{allFinalDone ? "" : "　※全卓の入力後に押せます"}</button>
                {![...finalGames, ...thirdGames].some(g => g.status === "done") && (
                  <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={cancelFinal}>↩ 決勝の組み合わせを取り消す（運営・点数が入る前だけ）</button>
                )}
              </div>
            )}
          </>
        )}

        {/* 予選（段階3a） */}
        {cur && teams && inProgress && (
          <>
            <div className="tk-card" style={{ borderColor: "rgba(247,205,121,.6)" }}>
              <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>📊 予選 速報ボード</h3>
                <span className="tk-pill on" style={{ fontSize: 10 }}>
                  {curRound
                    ? `第${curRound}回戦 ${prelimGames.filter(g => g.round === curRound && g.status === "done").length}/${prelimGames.filter(g => g.round === curRound).length}卓 終了`
                    : doneCount ? "予選 全卓終了" : "開始前"}
                </span>
              </div>
              {standings.map((r, i) => {
                const up = prevRank[r.idx] !== undefined ? prevRank[r.idx] - i : 0;
                const above = standings[i - 1];
                const lineTeam = standings[fin - 1], firstOut = standings[fin];
                let note = "";
                if (doneCount) {
                  if (i < fin && firstOut) {
                    const lead = Math.round((r.pts - firstOut.pts) * 10) / 10;
                    note = lead > 0 ? `${fin + 1}位に ${lead.toFixed(1)}pt リード` : `${fin + 1}位と同点（チップ差）`;
                  } else if (i >= fin && lineTeam) {
                    const need = Math.round((lineTeam.pts - r.pts) * 10) / 10;
                    note = need > 0 ? `決勝まで あと ${need.toFixed(1)}pt（素点で約${Math.round(need * 1000).toLocaleString()}点）` : `${fin}位と同点（チップ差）`;
                  }
                }
                const gap = above && doneCount ? Math.round((above.pts - r.pts) * 10) / 10 : null;
                const rem = remainOf(r.idx);
                return (
                  <div key={r.idx}>
                    {i === fin && <div style={{ textAlign: "center", fontSize: 10, color: "#e74c3c", margin: "4px 0", letterSpacing: ".2em" }}>── 決勝進出ライン ──</div>}
                    <div className={changedTeams.has(r.idx) ? "tk-flashrow" : ""} style={{ padding: "7px 4px", borderTop: "1px solid rgba(255,255,255,.08)", borderRadius: 6, background: r.idx === myTeamIdx ? "rgba(247,205,121,.10)" : "transparent" }}>
                      <div className="tk-row">
                        <span style={{ width: 22, fontFamily: "Dela Gothic One, sans-serif", fontSize: 16, color: i < fin ? "#f7cd79" : "#bbb" }}>{i + 1}</span>
                        <span style={{ width: 22, fontSize: 10, fontWeight: 700, color: up > 0 ? "#2ecc71" : up < 0 ? "#e74c3c" : "#555" }}>{up > 0 ? `↑${up}` : up < 0 ? `↓${-up}` : "－"}</span>
                        <span style={{ width: 56, fontSize: 13, fontWeight: 700 }}>チーム{TEAM_NAMES[r.idx]}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.members.map(id => members.find(m => m.id === id)?.name || "？").join("・")}</span>
                        <span style={{ width: 56, textAlign: "right", fontWeight: 700, fontSize: 14, color: r.pts >= 0 ? "#f7cd79" : "#7fb9e0" }}>{fmtPt(r.pts)}</span>
                        <span className="tk-muted" style={{ width: 44, textAlign: "right" }}>🪙{r.chips}</span>
                      </div>
                      <div className="tk-muted" style={{ fontSize: 10, paddingLeft: 44, marginTop: 2 }}>
                        {gap !== null && <span style={{ marginRight: 8 }}>{i}位まで {gap.toFixed(1)}pt</span>}
                        {note && <span style={{ marginRight: 8, color: i < fin ? "#f7cd79" : "#ff9a8a" }}>{note}</span>}
                        <span>残り{rem}戦{rem === 0 && r.played ? "（終了）" : ""}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="tk-muted" style={{ marginTop: 6 }}>順位点の合計。同点は合計チップ数。↑↓は直前に全卓が終わった回戦との比較。素点の目安は 1pt＝1,000点（ウマを含まない）。消化：{doneCount}／{prelimGames.length}卓</div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, color: "#f7cd79", cursor: "pointer" }}>個人成績を見る</summary>
                {teams.flat().map(id => ({ id, ...indiv[id] })).sort((a, b) => b.pts - a.pts).map(o => (
                  <div key={o.id} className="tk-row" style={{ fontSize: 12, padding: "4px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{members.find(m => m.id === o.id)?.name}</span>
                    <span style={{ width: 52, textAlign: "right" }}>{fmtPt(o.pts)}</span>
                    <span className="tk-muted" style={{ width: 44, textAlign: "right" }}>🪙{o.chips}</span>
                    <span className="tk-muted" style={{ width: 70, textAlign: "right" }}>最高{o.best == null ? "—" : o.best.toLocaleString()}</span>
                    <span style={{ width: 22, textAlign: "right" }}>{o.yakuman ? "★" : ""}</span>
                  </div>
                ))}
              </details>
            </div>

            <div className="tk-card">
              <h3>🀄 予選の対局</h3>
              {[...new Set(prelimGames.map(g => g.round))].sort((a, b) => a - b).map(rd => {
                const gs = prelimGames.filter(g => g.round === rd).sort((a, b) => a.table_no - b.table_no);
                const playing = new Set(gs.flatMap(g => g.team_idx));
                const resting = teams.map((_, i) => i).filter(i => !playing.has(i));
                return (
                  <div key={rd} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f7cd79", margin: "4px 0 6px" }}>第{rd}回戦{resting.length ? <span className="tk-muted">　休み：{resting.map(i => `チーム${TEAM_NAMES[i]}`).join("・")}</span> : null}</div>
                    {gs.map(g => {
                      const ids = gameMembers(g, teams);
                      const done = g.status === "done";
                      const mine = ids.includes(selfId);
                      return (
                        <div key={g.id} style={{ padding: "8px 10px", marginBottom: 6, borderRadius: 10, border: `1px solid ${mine ? "rgba(247,205,121,.7)" : "rgba(255,255,255,.12)"}`, background: done ? "rgba(255,255,255,.05)" : "rgba(231,76,60,.08)" }}>
                          <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>卓{g.table_no}：{g.team_idx.map(i => `チーム${TEAM_NAMES[i]}`).join(" vs ")}</span>
                            <span className="tk-muted">{done ? "✅ 入力済み" : "未入力"}</span>
                          </div>
                          {ids.map((id, k) => {
                            const m = members.find(x => x.id === id);
                            return (
                              <div key={id} className="tk-row" style={{ fontSize: 12, padding: "2px 0" }}>
                                <span className="tk-muted" style={{ width: 18 }}>{g.seats ? SEAT_NAMES[k] : ""}</span>
                                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m?.name}{(g.yakuman || []).includes(id) ? " ★役満" : ""}</span>
                                {done && <>
                                  <span style={{ width: 60, textAlign: "right" }}>{Number(g.raw?.[id]).toLocaleString()}</span>
                                  <span style={{ width: 50, textAlign: "right", fontWeight: 700, color: Number(g.points?.[id]) >= 0 ? "#f7cd79" : "#7fb9e0" }}>{fmtPt(g.points?.[id] || 0)}</span>
                                  <span className="tk-muted" style={{ width: 38, textAlign: "right" }}>🪙{g.chips?.[id] ?? 0}</span>
                                </>}
                              </div>
                            );
                          })}
                          {canInput(g) && (
                            <button className="tk-btn sub" style={{ marginTop: 6, padding: "7px" }} onClick={() => setGameSheet(g.id)}>
                              {done ? "✏️ 点数を修正" : "✍️ 点数を入力"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="tk-muted">決勝に進めなかった人の余興の半荘は、いつもの「➕ 対局開始」で卓2・卓3を使って記録できます（リーグ成績に入ります）。</div>
              {isAdmin && cur.status === "prelim" && (
                <button className="tk-btn" style={{ marginTop: 8 }} disabled={!allPrelimDone} onClick={startFinal}>
                  🏆 予選終了 → 決勝へ（運営）{allPrelimDone ? "" : "　※全卓の入力後に押せます"}
                </button>
              )}
              {isAdmin && cur.status === "prelim" && !prelimGames.some(g => g.status === "done") && (
                <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={rebuildSchedule}>↻ 組み合わせを作り直す（運営・点数が入る前だけ）</button>
              )}
            </div>
          </>
        )}

        {/* 候補日と投票状況 */}
        {cur && (
          <div className="tk-card">
            <h3>候補日と投票状況</h3>
            {s.startTime && (
              <div style={{ display: "inline-block", marginBottom: 10, padding: "4px 12px", borderRadius: 14, background: "rgba(247,205,121,.16)", border: "1px solid rgba(247,205,121,.6)", fontSize: 13, fontWeight: 700, color: "#f7cd79" }}>
                🕕 当日のスタート {s.startTime}〜
              </div>
            )}
            <DateNote cur={cur} isAdmin={isAdmin} showToast={showToast} reload={reload} />
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

        {/* 決勝への持ち越しの投票 */}
        {cur && carryVoteOn && !["final", "done"].includes(cur.status) && (
          <div className="tk-card">
            <h3>⚖️ 決勝への持ち越し（投票）</h3>
            {CARRY_PRIORITY.map(k => {
              const voters = cTally[k].map(id => members.find(m => m.id === id)).filter(Boolean);
              return (
                <div key={k} style={{ padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{CARRY_LABEL[k]}</span>
                    <span style={{ fontSize: 13, color: "#f7cd79", fontWeight: 700 }}>{voters.length}票</span>
                  </div>
                  <AvatarRow list={voters} Av={Av} empty="まだ投票がありません" />
                </div>
              );
            })}
            <div className="tk-muted" style={{ marginTop: 6 }}>
              {entryClosed(cur) ? <>決定：<b style={{ color: "#f7cd79" }}>{CARRY_LABEL[effCarry]}</b></> : "締切の時点で票の多いルールに自動で決まります（同数は「持ち越さない」）"}
            </div>
          </div>
        )}

        {/* 二次会 */}
        {cur && partyOn && (
          <div className="tk-card">
            <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>🍻 二次会</h3>
              <span className="tk-pill on" style={{ fontSize: 11 }}>計 {partyYes.length + partyComp}名</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{s.afterpartyNote}</div>
            <div className="tk-lbl" style={{ marginTop: 0 }}>参加（{partyYes.length}名{partyComp ? `＋同伴${partyComp}名` : ""}）</div>
            {partyYes.length === 0 && <div className="tk-muted">まだいません</div>}
            {partyYes.map(e => { const m = members.find(x => x.id === e.member_id); return m ? (
              <div key={e.id} className="tk-row" style={{ fontSize: 13, padding: "3px 0" }}>
                <span style={{ flexShrink: 0 }}><Av m={m} sz={24} /></span>
                <span style={{ flex: 1 }}>{m.name}</span>
                {e.companions > 0 && <span style={{ color: "#f7cd79", fontSize: 12 }}>＋同伴{e.companions}名</span>}
              </div>
            ) : null; })}
            <div className="tk-lbl">不参加</div>
            <AvatarRow list={partyNo.map(e => members.find(m => m.id === e.member_id)).filter(Boolean)} Av={Av} empty="まだいません" />
          </div>
        )}

        {/* 賞の種類の投票（段階4a） */}
        {cur && !["prelim", "final", "done"].includes(cur.status) && (
          <div className="tk-card">
            <h3>🏅 賞の投票（採用してほしい賞・1人{AWARD_VOTE_MAX}票）</h3>
            {AWARD_CANDIDATES.map(k => {
              const p = PRIZES.find(x => x.key === k);
              const voters = awardTally[k].map(id => members.find(m => m.id === id)).filter(Boolean);
              const mine = (myEntry?.award_votes || []).includes(k);
              return (
                <div key={k} style={{ padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: mine ? "#f7cd79" : "#fff" }}>{mine ? "✔ " : ""}{p.voteLabel || p.label}<span className="tk-muted" style={{ marginLeft: 6, fontWeight: 400 }}>{p.voteDesc || p.desc}</span></span>
                    <span style={{ fontSize: 13, color: "#f7cd79", fontWeight: 700, whiteSpace: "nowrap" }}>{voters.length}票</span>
                  </div>
                  <AvatarRow list={voters} Av={Av} empty="まだ投票がありません" />
                </div>
              );
            })}
            <div className="tk-muted" style={{ marginTop: 6 }}>投票は「参加・不参加を回答」から。採用する賞と金額は、票を参考に運営が決めます。</div>
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

        {/* 優勝チーム予想（段階4b） */}
        {cur && teams && isTag && (
          <PredictionCard teams={teams} members={members} Av={Av} winProbs={winProbs} predBets={predBets} predOpen={predOpen}
            selfId={selfId} me={me} myCoins={myCoins} onBuy={buyPrediction} podium={cur.status === "done" ? result.podium : null} />
        )}

        {/* チーム決め（受付終了後） */}
        {cur && isTag && closed && (
          <div className="tk-card" style={{ borderColor: teams ? "rgba(247,205,121,.6)" : "rgba(247,205,121,.28)" }}>
            <h3>🤝 チーム{teams ? "（決定）" : "決め"}</h3>
            {teams ? (
              <>
                {teams.map((tm, i) => (
                  <div key={i} className="tk-row" style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)", background: i === myTeamIdx ? "rgba(247,205,121,.10)" : "transparent" }}>
                    <span style={{ fontFamily: "Dela Gothic One, sans-serif", color: "#f7cd79", width: 64, flexShrink: 0, fontSize: 14 }}>チーム{TEAM_NAMES[i]}</span>
                    {tm.map((id, k) => { const m = members.find(x => x.id === id); return (
                      <span key={id} className="tk-row" style={{ gap: 5, flex: 1, minWidth: 0, justifyContent: "flex-start" }}>
                        {k === 1 && <span style={{ color: "#888", marginRight: 2 }}>×</span>}
                        <span style={{ flexShrink: 0 }}><Av m={m} sz={24} /></span><span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{m?.name || "？"}</span>
                      </span>
                    ); })}
                  </div>
                ))}
                <div className="tk-muted" style={{ marginTop: 6 }}>
                  決め方：{{ balanced: "戦力均衡ランダム", manual: "運営が指定", amida: "あみだくじ" }[draw.method] || "—"}
                  {draw.resets ? `（やり直し ${draw.resets}回）` : ""}
                </div>
                {(draw.method === "balanced" || draw.method === "amida") && (
                  <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={() => setReveal({ startMs: Date.now() })}>
                    🎬 {draw.method === "amida" ? "あみだくじを最初から再生" : "抽選の様子をもう一度見る"}
                  </button>
                )}
                {isAdmin && cur.status === "closed" && (
                  <button className="tk-btn" style={{ marginTop: 8 }} onClick={() => makeSchedule(false)}>🀄 予選の組み合わせを作る（運営）</button>
                )}
                {isAdmin && cur.status === "closed" && <button className="tk-btn sub" style={{ marginTop: 8, color: "#e74c3c", borderColor: "rgba(231,76,60,.6)" }} onClick={resetDraw}>↩ チームをやり直す（運営）</button>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  決め方：<b style={{ color: "#f7cd79" }}>{{ balanced: "戦力均衡ランダム", manual: "運営が指定", amida: "あみだくじ" }[teamMethod] || "未定"}</b>
                  {draw.resets ? <span className="tk-muted">（やり直し {draw.resets}回）</span> : null}
                </div>
                {!evenOk && <div className="tk-muted" style={{ color: "#e74c3c", marginBottom: 8 }}>参加者が{players.length}人です。タッグ戦は4人以上の偶数が必要です（運営が人数を調整してください）</div>}
                {teamMethod === "balanced" && (
                  <>
                    <div className="tk-muted" style={{ marginBottom: 6 }}>強さ＝1半荘あたりの平均スコア（対局数が少ない人ほど平均寄りに補正）。Aグループから1人、Bグループから1人を抽選で組みます。</div>
                    {[["Aグループ（上位）", groupA], ["Bグループ（下位）", groupB]].map(([label, g]) => (
                      <div key={label} style={{ marginBottom: 6 }}>
                        <div className="tk-lbl" style={{ marginTop: 4 }}>{label}</div>
                        {g.map(m => (
                          <div key={m.id} className="tk-row" style={{ fontSize: 12, padding: "3px 0" }}>
                            <Av m={m} sz={22} /><span style={{ flex: 1 }}>{m.name}</span>
                            <span style={{ color: "#f7cd79", width: 52, textAlign: "right" }}>{fmtAdj(strengths[m.id].adj)}</span>
                            <span className="tk-muted" style={{ width: 62, textAlign: "right" }}>{strengths[m.id].games}半荘</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {isAdmin
                      ? <button className="tk-btn" style={{ marginTop: 8 }} disabled={!evenOk} onClick={startBalanced}>🎰 抽選スタート（運営）</button>
                      : <div className="tk-muted">運営の抽選をお待ちください。スタートすると、この画面で発表されます。</div>}
                  </>
                )}
                {teamMethod === "manual" && (isAdmin
                  ? <ManualTeams players={players} Av={Av} disabled={!evenOk} onSave={saveManual} />
                  : <div className="tk-muted">運営がチームを決めるまでお待ちください。</div>)}
                {teamMethod === "amida" && (
                  <AmidaCard cur={cur} draw={draw} players={players} tEntries={tEntries} members={members} Av={Av}
                    selfId={selfId} isAdmin={isAdmin} evenOk={evenOk} saveDraw={saveDraw} showToast={showToast} reload={reload} />
                )}
              </>
            )}
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
            <button className="tk-btn" style={{ marginTop: 10, background: "linear-gradient(135deg,#06c755,#04a344)", borderColor: "#06c755", color: "#fff" }} onClick={shareLine}>💬 LINEで送る（参加のお願いつき）</button>
            <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={copyLine}>📋 LINE用に全文コピー</button>
          </div>
        )}

        {/* 歴代チャンピオン */}
        {(hallOfFame.length > 0 || isAdmin) && (
          <div className="tk-card">
            <h3>👑 歴代チャンピオン</h3>
            {hallOfFame.length === 0 && <div className="tk-muted">まだ記録がありません。</div>}
            {hallOfFame.map(t => {
              const win = podiumOf(t)[0] || { ids: [], names: [] };
              const ph = t.result?.photos?.[0];
              return (
                <div key={t.id} className="tk-row" onClick={() => setHallView(t.id)} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)", cursor: "pointer", alignItems: "center" }}>
                  {ph
                    ? <img src={ph.thumb} alt="" loading="lazy" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid #f7cd79", flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 48, borderRadius: 8, border: "1px dashed rgba(247,205,121,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏆</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#f7cd79", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{settingsOf(t).edition} {t.name}</div>
                    <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🥇 {placeNames(win, members).join(" × ") || "—"}</div>
                  </div>
                  <span className="tk-muted" style={{ flexShrink: 0 }}>{fmtDate(String(t.result?.decidedAt || "").slice(0, 10))}</span>
                </div>
              );
            })}
            {isAdmin && <button className="tk-btn sub" style={{ marginTop: 10 }} onClick={() => { setHistoryEdit(null); setSheet("history"); }}>＋ 過去の大会の記録を追加（運営）</button>}
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
            {sheet === "history" && isAdmin && (
              <HistoryForm key={historyEdit?.id || "new"} record={historyEdit} members={members} Av={Av} showToast={showToast} onDone={() => { setSheet(null); setHistoryEdit(null); reload(); }} onClose={() => { setSheet(null); setHistoryEdit(null); }} />
            )}
            {sheet === "who" && (
              <>
                <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>あなたは誰ですか？</h3>
                <div className="tk-muted" style={{ marginBottom: 12 }}>自分のアイコンを選んでください（この端末に記憶します）</div>
                <MemberGrid members={members} Av={Av} selectedId={selfId} onSelect={selectSelf} />
                <button className="tk-btn sub" style={{ marginTop: 14 }} onClick={() => setSheet(null)}>閉じる</button>
              </>
            )}
            {sheet === "answer" && cur && me && (
              <AnswerSheet cur={cur} me={me} Av={Av} tDates={tDates} myEntry={myEntry} dateIds={dateIds} teamVoteOn={teamVoteOn} awardVoteOn carryVoteOn={carryVoteOn} partyNote={partyOn ? s.afterpartyNote : ""}
                entryOpen={entryOpen} showToast={showToast} onDone={() => { setSheet(null); reload(); }}
                onChangeWho={() => { setAfterWho("answer"); setSheet("who"); }} />
            )}
            {sheet === "admin" && (
              <AdminSheet me={me} isAdminUser={isAdminUser} adminUnlocked={adminUnlocked}
                onUnlock={() => { setAdminUnlocked(true); try { sessionStorage.setItem("tleague_taikai_admin", "1"); } catch (e) { /* 保存できなくても動作は続ける */ } }}
                tournaments={tournaments} cur={isAdmin ? cur : null} dates={dates} joinCount={joinList.length} awardTally={awardTally}
                showToast={showToast} onSelectTournament={setSelectedTid} reload={reload} onClose={() => setSheet(null)} />
            )}
          </div>
        </div>
      )}

      {gameSheet && teams && (() => {
        const g = tGames.find(x => x.id === gameSheet);
        if (!g) return null;
        return (
          <div className="tk-sheet-bg" onClick={() => setGameSheet(null)}>
            <div className="tk-sheet" onClick={e => e.stopPropagation()}>
              <GameSheet game={g} teams={teams} members={members} Av={Av} rule={rule} showToast={showToast}
                onDone={() => { setGameSheet(null); reload(); }} onClose={() => setGameSheet(null)} />
            </div>
          </div>
        );
      })()}

      {photoView && (
        <div onClick={() => setPhotoView(null)} style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
          <img src={photoView} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6 }} />
          <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>タップで閉じる</div>
        </div>
      )}
      {hallView && (() => {
        const t = tournaments.find(x => x.id === hallView);
        if (!t) return null;
        const removeRecord = async () => {
          if (!window.confirm(`「${settingsOf(t).edition} ${t.name}」の記録を削除しますか？`)) return;
          const { error } = await supabase.from("tournaments").update({ deleted_at: new Date().toISOString() }).eq("id", t.id);
          if (error) { showToast("error", "⚠️ 削除失敗: " + error.message); return; }
          // 写真も置き場から消す（容量を無駄にしないため）
          const paths = Object.values(t.result?.photos || {}).flatMap(ph => ph?.paths || []);
          if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
          setHallView(null); reload();
        };
        return (
          <div className="tk-sheet-bg" onClick={() => setHallView(null)}>
            <div className="tk-sheet" onClick={e => e.stopPropagation()}>
              <div className="tk-kicker" style={{ textAlign: "center" }}>CHAMPIONS</div>
              <div className="tk-hero-title" style={{ textAlign: "center", fontSize: 22 }}>{settingsOf(t).edition} {t.name}</div>
              <div className="tk-muted" style={{ textAlign: "center", marginBottom: 8 }}>{fmtDate(String(t.result?.decidedAt || "").slice(0, 10))}{t.result?.manual ? "（過去の記録）" : ""}</div>
              <Podium t={t} members={members} Av={Av} isAdmin={isAdmin} uploading={uploading} onPhoto={onPodiumPhoto} onView={setPhotoView}
                label={i => (t.result?.manual ? "" : (t.result?.podium?.[i] == null ? "" : `チーム${TEAM_NAMES[t.result.podium[i]]}`))} prize={() => ""} />
              {isAdmin && t.result?.manual && <button className="tk-btn sub" style={{ marginTop: 10 }} onClick={() => { setHistoryEdit(t); setHallView(null); setSheet("history"); }}>✏️ この記録を直す（日付・順位のメンバー）（運営）</button>}
              {isAdmin && t.result?.manual && <button className="tk-btn sub" style={{ marginTop: 8, color: "#e74c3c", borderColor: "rgba(231,76,60,.6)" }} onClick={removeRecord}>🗑 この記録を削除（運営）</button>}
              <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={() => setHallView(null)}>閉じる</button>
            </div>
          </div>
        );
      })()}

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

// ---- 候補日への運営コメント（表示・運営はその場で編集） ----
function DateNote({ cur, isAdmin, showToast, reload }) {
  const note = settingsOf(cur).dateNote || "";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing) setText(note); }, [note, editing]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("tournaments")
      .update({ settings: { ...(cur.settings || {}), dateNote: text.trim().slice(0, 200) }, updated_at: new Date().toISOString() })
      .eq("id", cur.id);
    setBusy(false);
    if (error) { showToast("error", "⚠️ コメントの保存失敗: " + error.message); return; }
    setEditing(false);
    showToast("success", "📣 運営コメントを更新しました");
    reload();
  };
  if (editing) {
    return (
      <div style={{ marginBottom: 10 }}>
        <textarea className="tk-in" style={{ height: 60, fontSize: 13 }} maxLength={200} placeholder="例：12/12は19時開始の予定です" value={text} onChange={e => setText(e.target.value)} />
        <div className="tk-row" style={{ marginTop: 6 }}>
          <button className="tk-btn" style={{ padding: "8px" }} disabled={busy} onClick={save}>{busy ? "保存中..." : "保存"}</button>
          <button className="tk-btn sub" style={{ padding: "8px" }} onClick={() => setEditing(false)}>やめる</button>
        </div>
      </div>
    );
  }
  if (!note && !isAdmin) return null;
  return (
    <div style={{ marginBottom: 10, padding: "9px 11px", borderRadius: 10, background: "rgba(231,76,60,.14)", border: "1px solid rgba(231,76,60,.5)" }}>
      {note
        ? <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}><b style={{ color: "#f7cd79" }}>📣 運営より</b><br />{note}</div>
        : <div className="tk-muted">運営コメントはまだありません</div>}
      {isAdmin && <button className="tk-btn sub" style={{ marginTop: 6, padding: "5px 10px", width: "auto", fontSize: 11 }} onClick={() => setEditing(true)}>✏️ {note ? "編集" : "コメントを書く"}（運営）</button>}
    </div>
  );
}

// ---- 表彰台（1位は大きな写真、2・3位は並べて表示。押すと拡大） ----
function Podium({ t, members, Av, isAdmin, uploading, onPhoto, onView, label, prize }) {
  const places = podiumOf(t);
  const photos = t.result?.photos || {};
  const PhotoBtn = ({ slot }) => {
    if (!isAdmin) return null;
    const busy = uploading === `${t.id}-${slot}`;
    return (
      <label className="tk-btn sub" style={{ display: "block", textAlign: "center", marginTop: 6, padding: "6px", fontSize: 11, cursor: busy ? "default" : "pointer" }}>
        {busy ? "保存中..." : photos[slot] ? "📷 写真を差し替え（運営）" : "📷 写真を入れる（運営）"}
        <input type="file" accept="image/*" style={{ display: "none" }} disabled={busy} onChange={e => { onPhoto(t, slot, e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    );
  };
  const Names = ({ i }) => {
    const pl = places[i]; if (!pl) return null;
    return (
      <div style={{ textAlign: "center", marginTop: 6 }}>
        {label(i) && <div style={{ fontFamily: "Dela Gothic One, sans-serif", color: PLACE_COLORS[i], fontSize: i === 0 ? 16 : 13 }}>{label(i)}</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {pl.ids.map(id => { const m = members.find(x => x.id === id); return (
            <span key={id} className="tk-row" style={{ gap: 4 }}><span style={{ flexShrink: 0 }}><Av m={m} sz={i === 0 ? 26 : 20} /></span><span style={{ fontSize: i === 0 ? 14 : 12, fontWeight: 700 }}>{m?.name || "？"}</span></span>
          ); })}
          {pl.names.map((n, k) => <span key={`n${k}`} style={{ fontSize: i === 0 ? 14 : 12, fontWeight: 700 }}>{n}</span>)}
        </div>
        {prize(i) && <div style={{ color: PLACE_COLORS[i], fontWeight: 700, fontSize: 12, marginTop: 2 }}>{prize(i)}</div>}
      </div>
    );
  };
  return (
    <div>
      {/* 1位：大きな写真 */}
      {places[0] && (
        <div style={{ marginTop: 6, padding: 8, borderRadius: 14, border: `2px solid ${PLACE_COLORS[0]}`, background: "linear-gradient(180deg,rgba(247,205,121,.18),rgba(0,0,0,.2))", boxShadow: "0 0 22px rgba(247,205,121,.35)" }}>
          <div style={{ textAlign: "center", fontSize: 30, lineHeight: 1 }}>👑</div>
          {photos[0]
            ? <img src={photos[0].big} alt="優勝" loading="lazy" onClick={() => onView(photos[0].big)} style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 10, marginTop: 6, cursor: "zoom-in" }} />
            : <div style={{ height: 150, borderRadius: 10, marginTop: 6, border: "1px dashed rgba(247,205,121,.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>🥇 優勝チームの写真</div>}
          <div style={{ textAlign: "center", fontSize: 13, color: PLACE_COLORS[0], fontWeight: 700, marginTop: 6, letterSpacing: ".2em" }}>{MEDALS[0]} CHAMPION</div>
          <Names i={0} />
          <PhotoBtn slot={0} />
        </div>
      )}
      {/* 2位・3位：並べて表示 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {[1, 2].map(i => places[i] && (places[i].ids.length || places[i].names.length) ? (
          <div key={i} style={{ padding: 6, borderRadius: 12, border: `1px solid ${PLACE_COLORS[i]}`, background: "rgba(255,255,255,.04)" }}>
            <div style={{ textAlign: "center", fontSize: 20 }}>{MEDALS[i]}</div>
            {photos[i]
              ? <img src={photos[i].thumb} alt={`${i + 1}位`} loading="lazy" onClick={() => onView(photos[i].big)} style={{ display: "block", width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }} />
              : <div style={{ aspectRatio: "4/3", borderRadius: 8, border: "1px dashed rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 11 }}>{i + 1}位の写真</div>}
            <Names i={i} />
            <PhotoBtn slot={i} />
          </div>
        ) : <div key={i} />)}
      </div>
    </div>
  );
}

// ---- 過去の大会の記録を追加・直す（運営）。record があれば直す ----
function HistoryForm({ record, members, Av, showToast, onDone, onClose }) {
  const r0 = record?.result || {};
  const [edition, setEdition] = useState(record ? settingsOf(record).edition || "" : "第1回");
  const [name, setName] = useState(record ? record.name || "" : "とうねり杯");
  const [date, setDate] = useState(record ? String(r0.decidedAt || "").slice(0, 10) : "");
  const [ids, setIds] = useState([0, 1, 2].map(i => (r0.podiumIds?.[i] || []).map(Number)));
  const [texts, setTexts] = useState([0, 1, 2].map(i => (r0.podiumNames?.[i] || []).join("、")));
  const [busy, setBusy] = useState(false);
  const addId = (i, id) => { if (!id) return; setIds(p => p.map((a, k) => (k === i && !a.includes(Number(id)) ? [...a, Number(id)] : a))); };
  const delId = (i, id) => setIds(p => p.map((a, k) => (k === i ? a.filter(x => x !== id) : a)));
  const save = async () => {
    if (!date) { showToast("error", "⚠️ 日付を入れてください"); return; }
    const names = texts.map(tx => tx.split(/[、,，・\s]+/).map(x => x.trim()).filter(Boolean));
    if (!ids[0].length && !names[0].length) { showToast("error", "⚠️ 優勝の人を入れてください"); return; }
    setBusy(true);
    let error;
    if (record) {
      // 写真など、この画面で触らないものはそのまま残す
      ({ error } = await supabase.from("tournaments").update({
        name: name.trim() || "とうねり杯",
        settings: { ...(record.settings || {}), edition: edition.trim() },
        result: { ...r0, podiumIds: ids, podiumNames: names, decidedAt: date },
      }).eq("id", record.id));
    } else {
      ({ error } = await supabase.from("tournaments").insert({
        name: name.trim() || "とうねり杯", visibility: "public", status: "done",
        settings: { edition: edition.trim(), manual: true, format: "tag" },
        result: { manual: true, podiumIds: ids, podiumNames: names, decidedAt: date },
      }));
    }
    setBusy(false);
    if (error) { showToast("error", "⚠️ 保存失敗: " + error.message); return; }
    showToast("success", record ? "✏️ 記録を直しました" : "👑 過去の記録を追加しました（写真は歴代チャンピオンから入れられます）");
    onDone();
  };
  return (
    <>
      <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>{record ? "✏️ 過去の大会の記録を直す" : "＋ 過去の大会の記録"}</h3>
      <div className="tk-muted" style={{ marginBottom: 6 }}>歴代チャンピオンに並びます。今の大会（受付・予選など）には出ません。</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 6 }}>
        <div><div className="tk-lbl">第何回</div><input className="tk-in" value={edition} onChange={e => setEdition(e.target.value)} /></div>
        <div><div className="tk-lbl">大会名</div><input className="tk-in" value={name} onChange={e => setName(e.target.value)} /></div>
      </div>
      <div className="tk-lbl">日付</div>
      <input className="tk-in" type="date" value={date} onChange={e => setDate(e.target.value)} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: PLACE_COLORS[i] }}>{MEDALS[i]} {i + 1}位</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
            {ids[i].map(id => { const m = members.find(x => x.id === id); return (
              <span key={id} className="tk-row" onClick={() => delId(i, id)} style={{ gap: 4, padding: "3px 8px", borderRadius: 14, border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", fontSize: 12 }}>
                <span style={{ flexShrink: 0 }}><Av m={m} sz={18} /></span>{m?.name} ✕
              </span>
            ); })}
          </div>
          <select className="tk-in" value="" onChange={e => addId(i, e.target.value)}>
            <option value="">メンバーから選ぶ</option>
            {members.filter(m => !ids[i].includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="tk-in" style={{ marginTop: 6 }} placeholder="アプリにいない人は名前を入力（複数は「、」で区切る）" value={texts[i]} onChange={e => setTexts(p => p.map((x, k) => (k === i ? e.target.value : x)))} />
        </div>
      ))}
      <button className="tk-btn" style={{ marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "保存中..." : record ? "この内容で直す" : "この記録を追加"}</button>
      <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={onClose}>閉じる</button>
    </>
  );
}

// ---- 優勝チーム予想の欄 ----
function PredictionCard({ teams, members, Av, winProbs, predBets, predOpen, selfId, me, myCoins, onBuy, podium }) {
  const [type, setType] = useState("t_tansho");
  const [sel, setSel] = useState([]);
  const [amount, setAmount] = useState(1);
  const need = type === "t_tansho" ? 1 : 2;
  const pick = i => setSel(p => (p.includes(i) ? p.filter(x => x !== i) : p.length >= need ? [...p.slice(1), i] : [...p, i]));
  const odds = sel.length === need ? (type === "t_tansho" ? tanshoOddsOf(winProbs, sel[0]) : umatanOddsOf(winProbs, sel[0], sel[1])) : null;
  const nm = id => members.find(m => m.id === id)?.name || "？";
  const myBets = predBets.filter(b => Number(b.bettor_id) === Number(selfId));
  const label = b => `${b.bet_type === "t_tansho" ? "単勝" : "馬単"}：${(b.bet_selection || []).map(i => `チーム${TEAM_NAMES[i]}`).join(" → ")}`;
  const popular = teams.map((_, i) => predBets.filter(b => b.bet_type === "t_tansho" && (b.bet_selection || [])[0] === i).reduce((a, b) => a + (b.bet_amount || 1), 0));
  return (
    <div className="tk-card">
      <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>🎯 優勝チーム予想</h3>
        <span className="tk-muted">{podium ? "結果確定" : predOpen ? "受付中（予選開始まで）" : "締切済み"}</span>
      </div>
      {teams.map((tm, i) => (
        <div key={i} className="tk-row" style={{ padding: "5px 0", borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 12 }}>
          <span style={{ width: 58, fontWeight: 700, color: podium && podium[0] === i ? "#f7cd79" : "#fff" }}>{podium && podium[0] === i ? "🥇" : ""}チーム{TEAM_NAMES[i]}</span>
          <span style={{ flex: 1, minWidth: 0, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tm.map(nm).join("・")}</span>
          <span style={{ width: 60, textAlign: "right", color: "#f7cd79", fontWeight: 700 }}>単勝 {tanshoOddsOf(winProbs, i)}倍</span>
          <span className="tk-muted" style={{ width: 48, textAlign: "right" }}>🪙{popular[i]}</span>
        </div>
      ))}
      <div className="tk-muted" style={{ marginTop: 4 }}>倍率は、チームの2人の強さ（補正つき1半荘平均）から決まる固定の倍率です。🪙＝単勝に賭けられた枚数。</div>

      {predOpen && selfId && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{me?.name} の保有コイン</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f1c40f" }}>🪙 {myCoins}</span>
          </div>
          <div className="tk-seg" style={{ marginBottom: 8 }}>
            <button className={type === "t_tansho" ? "on" : ""} onClick={() => { setType("t_tansho"); setSel([]); }}>単勝（優勝チーム）</button>
            <button className={type === "t_umatan" ? "on" : ""} onClick={() => { setType("t_umatan"); setSel([]); }}>馬単（優勝→準優勝）</button>
          </div>
          <div className="tk-seg">
            {teams.map((_, i) => {
              const pos = sel.indexOf(i);
              return <button key={i} className={pos >= 0 ? "on" : ""} onClick={() => pick(i)}>{type === "t_umatan" && pos >= 0 ? `${pos === 0 ? "1着" : "2着"} ` : ""}チーム{TEAM_NAMES[i]}</button>;
            })}
          </div>
          <div className="tk-row" style={{ marginTop: 8 }}>
            <input className="tk-in" style={{ width: 90 }} type="number" inputMode="numeric" min={1} max={myCoins} value={amount} onChange={e => setAmount(e.target.value)} />
            <span className="tk-muted" style={{ flex: 1 }}>枚{odds ? `　×${odds}倍 → 当たれば ${Math.round(Number(amount || 0) * odds)}枚` : `　チームを${need}つ選んでください`}</span>
          </div>
          <button className="tk-btn" style={{ marginTop: 8 }} disabled={!odds || !(Number(amount) >= 1) || Number(amount) > myCoins} onClick={() => onBuy(type, sel, amount)}>🎯 この予想を買う</button>
        </div>
      )}
      {predOpen && !selfId && <div className="tk-muted" style={{ marginTop: 8 }}>予想を買うには、下の「あなた」で自分を選んでください。</div>}

      {myBets.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="tk-lbl" style={{ marginTop: 0 }}>あなたの予想</div>
          {myBets.map(b => (
            <div key={b.id} className="tk-row" style={{ fontSize: 12, padding: "4px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <span style={{ width: 22 }}>{b.is_hit == null ? "⏳" : b.is_hit ? "✅" : "❌"}</span>
              <span style={{ flex: 1 }}>{label(b)}</span>
              <span className="tk-muted">{b.bet_amount}枚×{b.odds}倍</span>
              {b.is_hit && <span style={{ color: "#2ecc71", marginLeft: 6, fontWeight: 700 }}>+{Math.round(Number(b.payout) * (b.bet_amount || 1))}</span>}
            </div>
          ))}
        </div>
      )}
      {podium && predBets.length > 0 && (
        <div className="tk-muted" style={{ marginTop: 8 }}>
          的中：{predBets.filter(b => b.is_hit).map(b => `${nm(b.bettor_id)}（${b.bet_type === "t_tansho" ? "単勝" : "馬単"} +${Math.round(Number(b.payout) * (b.bet_amount || 1))}）`).join("・") || "なし"}
        </div>
      )}
    </div>
  );
}

// ---- 対局の一覧（決勝・3位決定戦で使う） ----
function GameRounds({ gs, teams, members, selfId, canInput, onOpen }) {
  return [...gs].sort((a, b) => a.round - b.round).map(g => {
    const ids = gameMembers(g, teams);
    const done = g.status === "done";
    return (
      <div key={g.id} style={{ padding: "8px 10px", marginTop: 8, borderRadius: 10, border: `1px solid ${ids.includes(selfId) ? "rgba(247,205,121,.7)" : "rgba(255,255,255,.12)"}`, background: done ? "rgba(255,255,255,.05)" : "rgba(231,76,60,.08)" }}>
        <div className="tk-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>第{g.round}回戦・卓{g.table_no}</span>
          <span className="tk-muted">{done ? "✅ 入力済み" : "未入力"}</span>
        </div>
        {ids.map((id, k) => (
          <div key={id} className="tk-row" style={{ fontSize: 12, padding: "2px 0" }}>
            <span className="tk-muted" style={{ width: 18 }}>{g.seats ? SEAT_NAMES[k] : ""}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{members.find(m => m.id === id)?.name}{(g.yakuman || []).includes(id) ? " ★役満" : ""}</span>
            {done && <>
              <span style={{ width: 60, textAlign: "right" }}>{Number(g.raw?.[id]).toLocaleString()}</span>
              <span style={{ width: 50, textAlign: "right", fontWeight: 700, color: Number(g.points?.[id]) >= 0 ? "#f7cd79" : "#7fb9e0" }}>{fmtPt(g.points?.[id] || 0)}</span>
              <span className="tk-muted" style={{ width: 38, textAlign: "right" }}>🪙{g.chips?.[id] ?? 0}</span>
            </>}
          </div>
        ))}
        {canInput(g) && (
          <button className="tk-btn sub" style={{ marginTop: 6, padding: "7px" }} onClick={() => onOpen(g.id)}>{done ? "✏️ 点数を修正" : "✍️ 点数を入力"}</button>
        )}
      </div>
    );
  });
}

// ---- 対局の点数入力（素点・チップ・役満） ----
function GameSheet({ game, teams, members, Av, rule, showToast, onDone, onClose }) {
  const initIds = gameMembers(game, teams);
  const openedAt = useRef(game.updated_at); // 開いた時点の更新時刻（他の人が先に保存したかの判定用）
  const [order, setOrder] = useState(initIds); // 席順（東南西北）。手動のときはここで選ぶ
  const [raw, setRaw] = useState(() => Object.fromEntries(initIds.map(id => [id, game.raw?.[id] != null ? String(game.raw[id]) : ""])));
  const [chips, setChips] = useState(() => Object.fromEntries(initIds.map(id => [id, game.chips?.[id] != null ? String(game.chips[id]) : ""])));
  const [yk, setYk] = useState(game.yakuman || []);
  const [busy, setBusy] = useState(false);
  const total = rule.starting * 4;
  const num = v => (v === "" || v === "-" ? null : Number(v));
  // 3人入っていれば4人目を自動で埋めた値（表示と保存に使う）
  const fillOne = (obj, sum) => {
    const r = { ...obj };
    const empty = order.filter(id => num(r[id]) === null);
    if (empty.length === 1) r[empty[0]] = String(sum - order.filter(id => id !== empty[0]).reduce((a, id) => a + (num(r[id]) || 0), 0));
    return r;
  };
  const rawF = fillOne(raw, total), chipsF = fillOne(chips, 0);
  const rawOk = order.every(id => num(rawF[id]) !== null && !isNaN(num(rawF[id])));
  const rawSum = order.reduce((a, id) => a + (num(rawF[id]) || 0), 0);
  const chipSum = order.reduce((a, id) => a + (num(chipsF[id]) || 0), 0);
  const preview = rawOk && rawSum === total ? calcPoints(Object.fromEntries(order.map(id => [id, num(rawF[id])])), order, rule) : null;
  const seatsDup = new Set(order).size !== 4;
  const flip = (setter, id) => setter(p => ({ ...p, [id]: p[id].startsWith("-") ? p[id].slice(1) : "-" + p[id] }));

  const save = async () => {
    if (seatsDup) { showToast("error", "⚠️ 席順に同じ人がいます"); return; }
    if (!preview) { showToast("error", `⚠️ 素点の合計が${total.toLocaleString()}点になっていません（今 ${rawSum.toLocaleString()}点）`); return; }
    if (chipSum !== 0) { showToast("error", `⚠️ チップの合計が${chipSum > 0 ? "+" : ""}${chipSum}枚ずれています。合計が0になるように直してください`); return; }
    setBusy(true);
    let q = supabase.from("tournament_games").update({
      seats: order,
      raw: Object.fromEntries(order.map(id => [id, num(rawF[id])])),
      points: preview,
      chips: Object.fromEntries(order.map(id => [id, num(chipsF[id]) || 0])),
      yakuman: yk,
      status: "done",
      updated_at: new Date().toISOString(),
    }).eq("id", game.id);
    // 開いたあとに他の人が保存していたら、上書きしない
    q = openedAt.current ? q.eq("updated_at", openedAt.current) : q.is("updated_at", null);
    const { data, error } = await q.select();
    setBusy(false);
    if (error) { console.error("game save error:", error); showToast("error", "⚠️ 点数の保存失敗: " + error.message); return; }
    if (!data?.length) {
      window.alert("この卓の点数は、あなたが開いたあとに他の人が保存しました。\n最新の点数を読み込み直します。必要なら、もう一度直してください。");
      onDone();
      return;
    }
    showToast("success", "✅ 点数を保存しました");
    onDone();
  };

  const nm = id => members.find(m => m.id === id);
  return (
    <>
      <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>{{ prelim: "予選", final: "決勝", third: "3位決定戦" }[game.stage]} 第{game.round}回戦・卓{game.table_no} の点数{game.status === "done" ? "（修正）" : ""}</h3>
      <div className="tk-muted" style={{ marginBottom: 10 }}>
        {game.team_idx.map(i => `チーム${TEAM_NAMES[i]}`).join(" vs ")}　素点を入れてください（3人入れると4人目は自動）。合計 {total.toLocaleString()}点
      </div>
      {!game.seats && (
        <div style={{ marginBottom: 10 }}>
          <div className="tk-lbl" style={{ marginTop: 0 }}>席順（くじの結果）</div>
          {SEAT_NAMES.map((sn, k) => (
            <div key={sn} className="tk-row" style={{ marginBottom: 4 }}>
              <span style={{ width: 22, color: "#f7cd79" }}>{sn}</span>
              <select className="tk-in" value={order[k]} onChange={e => { const v = Number(e.target.value); setOrder(o => o.map((x, j) => (j === k ? v : x))); }}>
                {initIds.map(id => <option key={id} value={id}>{nm(id)?.name}</option>)}
              </select>
            </div>
          ))}
          {seatsDup && <div className="tk-muted" style={{ color: "#e74c3c" }}>同じ人が2つの席にいます</div>}
        </div>
      )}
      {order.map((id, k) => {
        const auto = num(raw[id]) === null && num(rawF[id]) !== null;
        return (
          <div key={id} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <div className="tk-row" style={{ marginBottom: 6 }}>
              <span className="tk-muted" style={{ width: 18 }}>{SEAT_NAMES[k]}</span>
              <span style={{ flexShrink: 0 }}><Av m={nm(id)} sz={26} /></span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(id)?.name}</span>
              {preview && <span style={{ fontWeight: 700, color: preview[id] >= 0 ? "#f7cd79" : "#7fb9e0" }}>{fmtPt(preview[id])}</span>}
            </div>
            <div className="tk-row">
              <input className="tk-in" style={{ flex: 2 }} inputMode="numeric" placeholder={auto ? `自動 ${Number(rawF[id]).toLocaleString()}` : "素点 例 42300"}
                value={raw[id]} onChange={e => setRaw(p => ({ ...p, [id]: e.target.value.replace(/[^\d-]/g, "") }))} />
              <button className="tk-btn sub" style={{ width: 34, padding: "6px 0" }} onClick={() => flip(setRaw, id)}>±</button>
              <input className="tk-in" style={{ flex: 1 }} inputMode="numeric" placeholder={num(chips[id]) === null && num(chipsF[id]) !== null ? `自動${chipsF[id]}` : "チップ"}
                value={chips[id]} onChange={e => setChips(p => ({ ...p, [id]: e.target.value.replace(/[^\d-]/g, "") }))} />
              <button className="tk-btn sub" style={{ width: 34, padding: "6px 0" }} onClick={() => flip(setChips, id)}>±</button>
              <label className="tk-row" style={{ gap: 3, fontSize: 11, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={yk.includes(id)} onChange={e => setYk(p => (e.target.checked ? [...p, id] : p.filter(x => x !== id)))} />役満
              </label>
            </div>
          </div>
        );
      })}
      <div className="tk-muted" style={{ marginTop: 6 }}>
        素点の合計：<b style={{ color: rawSum === total ? "#2ecc71" : "#e74c3c" }}>{rawSum.toLocaleString()}</b>／{total.toLocaleString()}{rawSum !== total && rawOk ? `（${rawSum > total ? "+" : ""}${(rawSum - total).toLocaleString()}点ずれ）` : ""}
        　チップの合計：<b style={{ color: chipSum === 0 ? "#2ecc71" : "#e74c3c" }}>{chipSum}</b>{chipSum !== 0 ? `（${chipSum > 0 ? "+" : ""}${chipSum}枚ずれ）` : ""}
      </div>
      <button className="tk-btn" style={{ marginTop: 12 }} disabled={busy} onClick={save}>{busy ? "保存中..." : "この点数で確定"}</button>
      <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={onClose}>閉じる</button>
    </>
  );
}

// ---- あみだくじ：位置選び・締め切り・スタート（チーム決めの欄の中） ----
function AmidaCard({ cur, draw, players, tEntries, members, Av, selfId, isAdmin, evenOk, saveDraw, showToast, reload }) {
  const n = players.length;
  const locked = !!draw.locked;
  const pickClosed = locked || !!(draw.pickDeadline && todayStr() > draw.pickDeadline);
  const amParticipant = players.some(p => p.id === selfId);
  const [dl, setDl] = useState(draw.pickDeadline || "");
  const [live, setLive] = useState(draw.liveAt || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDl(draw.pickDeadline || ""); setLive(draw.liveAt || ""); }, [draw.pickDeadline, draw.liveAt]);

  // 番号 → 選んだ人（締め切り後は確定した番号）
  const owner = {};
  if (locked) Object.entries(draw.slots || {}).forEach(([id, sl]) => { owner[sl] = Number(id); });
  else tEntries.forEach(e => { if (e.status === "join" && e.amida_slot && e.amida_slot <= n && players.some(p => p.id === e.member_id)) owner[e.amida_slot] = e.member_id; });
  const autoSet = new Set(draw.auto || []);

  const pick = async slot => {
    if (pickClosed || !amParticipant || busy) return;
    if (owner[slot] && owner[slot] !== selfId) { showToast("error", "⚠️ その番号はもう選ばれています"); return; }
    setBusy(true);
    const { error } = await supabase.from("tournament_entries").update({ amida_slot: slot, updated_at: new Date().toISOString() })
      .eq("tournament_id", cur.id).eq("member_id", selfId);
    setBusy(false);
    if (error) {
      showToast("error", error.code === "23505" ? "⚠️ その番号は先に選ばれました" : "⚠️ 保存失敗: " + error.message);
      reload(); return;
    }
    showToast("success", `🎲 ${slot}番を選びました`);
    reload();
  };
  const saveSchedule = async () => {
    await saveDraw({ ...draw, method: "amida", pickDeadline: dl || null, liveAt: live || null }, true);
    showToast("success", "あみだの日程を保存しました");
  };
  const lock = async () => {
    if (!evenOk) return;
    if (!window.confirm("位置選びを締め切ります。選んでいない人には、空いている番号を抽選で割り当てます。よろしいですか？")) return;
    const slots = {}, used = new Set(), auto = [];
    players.forEach(p => {
      const e = tEntries.find(x => x.member_id === p.id);
      const sl = e?.amida_slot;
      if (sl && sl <= n && !used.has(sl)) { slots[p.id] = sl; used.add(sl); }
    });
    const free = shuffle(Array.from({ length: n }, (_, i) => i + 1).filter(sl => !used.has(sl)));
    players.forEach(p => { if (!slots[p.id]) { slots[p.id] = free.shift(); auto.push(p.id); } });
    await saveDraw({ ...draw, method: "amida", locked: true, lockedAt: new Date().toISOString(), slots, auto }, true);
  };
  const unlock = async () => {
    if (!window.confirm("締め切りを取り消して、位置選びに戻しますか？")) return;
    await saveDraw({ ...draw, locked: false, slots: null, auto: null }, true);
  };
  const start = async () => {
    if (!evenOk || !locked) return;
    if (!window.confirm("あみだくじのライブをスタートします。\n線はこの瞬間に作られ、全員の画面で同時に流れます。やり直しはできません。よろしいですか？")) return;
    const seed = randomSeed();
    const teams = amidaTeams(seed, draw.slots);
    await saveDraw({ ...draw, method: "amida", seed, teams, startedAt: new Date().toISOString() }, true);
  };

  const sz = n > 10 ? 26 : 32;
  return (
    <>
      <div className="tk-muted" style={{ marginBottom: 8 }}>
        {draw.pickDeadline && <>位置選びの締切：<b style={{ color: "#f7cd79" }}>{fmtDate(draw.pickDeadline)}</b>　</>}
        {draw.liveAt && <>ライブ：<b style={{ color: "#f7cd79" }}>{fmtDateTime(draw.liveAt)}</b></>}
        {!draw.pickDeadline && !draw.liveAt && "位置選びの締切とライブの日時は、運営が決めます。"}
      </div>
      <div className="tk-muted" style={{ marginBottom: 6 }}>
        {locked ? "位置が確定しました。ライブで線が現れるまで、結果は誰にも分かりません。"
          : pickClosed ? "位置選びの締切を過ぎました。運営の締め切りをお待ちください。"
          : amParticipant ? "好きな番号を1つ選んでください（線はまだ見えません。締切までは選び直せます）" : "参加者が番号を選んでいます。"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(Math.ceil(n / 2), 7)},1fr)`, gap: 6, marginBottom: 8 }}>
        {Array.from({ length: n }, (_, i) => i + 1).map(sl => {
          const m = members.find(x => x.id === owner[sl]);
          const mine = owner[sl] === selfId;
          const clickable = !pickClosed && amParticipant && (!owner[sl] || mine);
          return (
            <div key={sl} onClick={() => clickable && pick(sl)}
              style={{ textAlign: "center", padding: "6px 2px", borderRadius: 9, cursor: clickable ? "pointer" : "default",
                border: mine ? "2px solid #f7cd79" : "1px solid rgba(255,255,255,.15)",
                background: mine ? "rgba(247,205,121,.16)" : m ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.03)" }}>
              <div style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 900, fontSize: 13, color: "#f7cd79" }}>{sl}</div>
              {m ? <Av m={m} sz={sz} /> : <div style={{ width: sz, height: sz, borderRadius: "50%", border: "1px dashed rgba(255,255,255,.3)", margin: "0 auto" }} />}
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m ? m.name : "空き"}{m && autoSet.has(m.id) ? "（自動）" : ""}
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 8 }}>
          <div className="tk-lbl" style={{ marginTop: 0 }}>位置選びの締切（運営）</div>
          <input className="tk-in" type="date" value={dl} onChange={e => setDl(e.target.value)} />
          <div className="tk-lbl">ライブの日時（運営）</div>
          <input className="tk-in" type="datetime-local" value={live} onChange={e => setLive(e.target.value)} />
          <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={saveSchedule}>💾 日程を保存</button>
          {!locked
            ? <button className="tk-btn" style={{ marginTop: 8 }} disabled={!evenOk} onClick={lock}>🔒 位置選びを締め切る（運営）</button>
            : <>
                <button className="tk-btn" style={{ marginTop: 8 }} disabled={!evenOk} onClick={start}>🎬 ライブスタート（運営）</button>
                <button className="tk-btn sub" style={{ marginTop: 8 }} onClick={unlock}>↩ 締め切りを取り消す</button>
              </>}
        </div>
      )}
    </>
  );
}

// ---- あみだくじのライブ演出 ----
function AmidaLive({ seed, slots, members, Av, startMs, onClose }) {
  const ids = useMemo(() => Object.keys(slots).map(Number).sort((a, b) => slots[a] - slots[b]), [slots]);
  const n = ids.length;
  const lad = useMemo(() => buildLadder(seed, n), [seed, n]);
  const teams = useMemo(() => amidaTeams(seed, slots), [seed, slots]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let raf;
    const f = () => { setNow(Date.now()); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, []);

  const el = (now - startMs) / 1000;
  const total = amidaTotal(n);
  const W = Math.min(340, window.innerWidth - 32), PAD = 20, TOP = 52, H = 300, BOT = TOP + H;
  const x = c => (n === 1 ? W / 2 : PAD + c * (W - 2 * PAD) / (n - 1));
  const y = r => TOP + (r + 1) * H / (AMIDA_ROWS + 1);
  const sz = n > 10 ? 20 : 26;
  const pathOf = id => {
    const cols = traceCols(lad, slots[id] - 1);
    const pts = [[x(cols[0]), TOP]];
    for (let r = 0; r < AMIDA_ROWS; r++) {
      pts.push([x(cols[r]), y(r)]);
      if (cols[r + 1] !== cols[r]) pts.push([x(cols[r + 1]), y(r)]);
    }
    pts.push([x(cols[AMIDA_ROWS]), BOT]);
    return { pts, end: cols[AMIDA_ROWS] };
  };
  const partial = (pts, p) => {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let rem = p * L; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (rem >= seg[i - 1]) { out.push(pts[i]); rem -= seg[i - 1]; }
      else { const f = seg[i - 1] ? rem / seg[i - 1] : 0; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]); break; }
    }
    return out;
  };

  const rowsShown = Math.min(AMIDA_ROWS, Math.floor(Math.max(0, el) / (AMIDA_LINES / AMIDA_ROWS)));
  const arrived = {};
  const traces = ids.map((id, i) => {
    const t0 = AMIDA_LINES + i * AMIDA_PER;
    const p = Math.max(0, Math.min(1, (el - t0) / (AMIDA_PER - 0.5)));
    const { pts, end } = pathOf(id);
    if (p >= 1) arrived[end] = id;
    return { id, p, part: partial(pts, p), active: el >= t0 && p < 1, color: TEAM_COLORS[lad.labels[end] % TEAM_COLORS.length] };
  });
  const active = traces.find(t => t.active);
  const finished = el >= AMIDA_LINES + n * AMIDA_PER;
  const nm = id => members.find(m => m.id === id);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 280, overflow: "auto", padding: "26px 16px 30px",
      background: `linear-gradient(rgba(8,4,6,.86),rgba(8,4,6,.94)),url(${BG_URL}) center/cover no-repeat` }}>
      <button onClick={onClose} style={{ position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", borderRadius: 16, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>閉じる</button>
      <div style={{ textAlign: "center" }}>
        <div className="tk-kicker" style={{ fontSize: 11 }}>AMIDA LIVE</div>
        <div className="tk-hero-title" style={{ fontSize: 28, margin: "4px 0 2px" }}>あみだくじ</div>
        <div style={{ minHeight: 22, fontSize: 13, color: "#ffe9a8", fontWeight: 700 }}>
          {el < AMIDA_LINES ? "線が現れます…" : active ? `${slots[active.id]}番 ${nm(active.id)?.name || ""} の行き先は…` : finished ? "チームが決まりました！" : ""}
        </div>
      </div>
      <div style={{ position: "relative", width: W, height: BOT + 46, margin: "6px auto 0" }}>
        <svg width={W} height={BOT + 46} style={{ position: "absolute", left: 0, top: 0 }}>
          {ids.map((_, c) => <line key={c} x1={x(c)} y1={TOP} x2={x(c)} y2={BOT} stroke="rgba(255,255,255,.45)" strokeWidth="2" />)}
          {lad.rungs.slice(0, rowsShown).map((row, r) => [...row].map(c => (
            <line key={`${r}-${c}`} x1={x(c)} y1={y(r)} x2={x(c + 1)} y2={y(r)} stroke="#f7cd79" strokeWidth="2.5" />
          )))}
          {traces.filter(t => t.p > 0).map(t => (
            <polyline key={t.id} points={t.part.map(pt => pt.join(",")).join(" ")} fill="none" stroke={t.color} strokeWidth={t.active ? 5 : 4} strokeLinejoin="round" strokeLinecap="round" opacity={t.active ? 1 : 0.85} />
          ))}
        </svg>
        {/* 上：番号とアイコン */}
        {ids.map((id, c) => (
          <div key={id} style={{ position: "absolute", left: x(c) - sz / 2, top: TOP - sz - 14, width: sz, textAlign: "center" }}>
            <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 9, fontWeight: 900, color: "#f7cd79", marginBottom: 1 }}>{slots[id]}</div>
            <Av m={nm(id)} sz={sz} />
          </div>
        ))}
        {/* 線をたどっている人 */}
        {active && (() => { const pt = active.part[active.part.length - 1]; return (
          <div style={{ position: "absolute", left: pt[0] - sz / 2 - 3, top: pt[1] - sz / 2 - 3, borderRadius: "50%", border: `3px solid ${active.color}`, boxShadow: `0 0 14px ${active.color}` }}>
            <Av m={nm(active.id)} sz={sz} />
          </div>
        ); })()}
        {/* 下：ゴール（着いたらチーム名） */}
        {ids.map((_, c) => {
          const who = arrived[c];
          const team = lad.labels[c];
          return (
            <div key={c} style={{ position: "absolute", left: x(c) - 15, top: BOT + 4, width: 30, textAlign: "center" }}>
              {who != null
                ? <div style={{ fontFamily: "Dela Gothic One, sans-serif", fontSize: 14, color: "#fff", background: TEAM_COLORS[team % TEAM_COLORS.length], borderRadius: 6, padding: "2px 0", boxShadow: `0 0 10px ${TEAM_COLORS[team % TEAM_COLORS.length]}` }}>{TEAM_NAMES[team]}</div>
                : <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", border: "1px dashed rgba(255,255,255,.3)", borderRadius: 6, padding: "2px 0" }}>?</div>}
            </div>
          );
        })}
      </div>
      {finished && (
        <div style={{ maxWidth: 420, margin: "10px auto 0" }}>
          {el < AMIDA_LINES + n * AMIDA_PER + 0.4 && <div style={{ position: "fixed", inset: 0, background: "#fff", opacity: 0.6, pointerEvents: "none" }} />}
          {teams.map((tm, i) => (
            <div key={i} className="tk-row" style={{ padding: "10px", marginBottom: 7, borderRadius: 12, border: `1px solid ${TEAM_COLORS[i % TEAM_COLORS.length]}`, background: "rgba(255,255,255,.06)", boxShadow: `0 0 12px ${TEAM_COLORS[i % TEAM_COLORS.length]}55` }}>
              <span style={{ fontFamily: "Dela Gothic One, sans-serif", color: TEAM_COLORS[i % TEAM_COLORS.length], width: 64, flexShrink: 0, fontSize: 14 }}>チーム{TEAM_NAMES[i]}</span>
              {tm.map((id, k) => (
                <span key={id} className="tk-row" style={{ gap: 5, flex: 1, minWidth: 0, justifyContent: "flex-start" }}>
                  {k === 1 && <span style={{ color: "#888", marginRight: 2 }}>×</span>}
                  <span style={{ flexShrink: 0 }}><Av m={nm(id)} sz={24} /></span><span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{nm(id)?.name}</span>
                </span>
              ))}
            </div>
          ))}
          {el > total && <button className="tk-btn" style={{ marginTop: 6 }} onClick={onClose}>閉じる</button>}
        </div>
      )}
    </div>
  );
}

// ---- 戦力均衡ランダムの発表演出 ----
function TeamReveal({ teams, members, Av, startMs, onClose }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 70);
    return () => clearInterval(t);
  }, []);
  const el = (now - startMs) / 1000;
  const total = revealTotal(teams.length);
  const pool = teams.map(tm => tm[1]);
  const nm = id => members.find(m => m.id === id);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 280, background: "radial-gradient(ellipse at center,rgba(60,10,10,.92),rgba(0,0,0,.96))", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", overflow: "auto" }}
      onClick={() => { if (el > total) onClose(); }}>
      <div className="tk-kicker" style={{ fontSize: 12 }}>TEAM DRAW</div>
      <div className="tk-hero-title" style={{ fontSize: 34, margin: "6px 0 18px" }}>チーム抽選</div>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {teams.map((tm, i) => {
          const t0 = REVEAL_INTRO + i * REVEAL_PER;
          if (el < t0) return null;
          const rolling = el < t0 + 1.0; // 最初の1秒は相方がルーレットで回る
          const mateId = rolling ? pool[Math.floor(now / 80) % pool.length] : tm[1];
          const a = nm(tm[0]), b = nm(mateId);
          return (
            <div key={i} className="tk-row" style={{ padding: "12px 10px", marginBottom: 8, borderRadius: 12, border: "1px solid rgba(247,205,121,.7)", background: rolling ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,rgba(247,205,121,.22),rgba(231,76,60,.18))", boxShadow: rolling ? "none" : "0 0 18px rgba(255,140,40,.5)", transition: "all .2s" }}>
              <span style={{ fontFamily: "Dela Gothic One, sans-serif", color: "#f7cd79", width: 74, fontSize: 15 }}>チーム{TEAM_NAMES[i]}</span>
              <span style={{ flexShrink: 0 }}><Av m={a} sz={30} /></span><span style={{ fontSize: 14, fontWeight: 700, margin: "0 8px 0 4px", whiteSpace: "nowrap" }}>{a?.name}</span>
              <span style={{ color: "#f7cd79", fontWeight: 900 }}>×</span>
              <span style={{ opacity: rolling ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                <span style={{ flexShrink: 0 }}><Av m={b} sz={30} /></span><span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{b?.name}</span>
              </span>
            </div>
          );
        })}
      </div>
      {el > total
        ? <button className="tk-btn" style={{ maxWidth: 420, marginTop: 12 }} onClick={onClose}>閉じる</button>
        : <div className="tk-muted" style={{ marginTop: 12 }}>抽選中…</div>}
    </div>
  );
}

// ---- 手動でチームを組む（運営） ----
function ManualTeams({ players, Av, disabled, onSave }) {
  const n = Math.floor(players.length / 2);
  const [pairs, setPairs] = useState(() => Array.from({ length: n }, () => ["", ""]));
  const used = new Set(pairs.flat().filter(Boolean));
  const setAt = (i, k, v) => setPairs(p => p.map((pr, j) => (j === i ? pr.map((x, kk) => (kk === k ? (v ? Number(v) : "") : x)) : pr)));
  return (
    <>
      {pairs.map((pr, i) => (
        <div key={i} className="tk-row" style={{ marginBottom: 6 }}>
          <span style={{ width: 64, color: "#f7cd79", fontSize: 13 }}>チーム{TEAM_NAMES[i]}</span>
          {[0, 1].map(k => (
            <select key={k} className="tk-in" style={{ flex: 1 }} value={pr[k]} onChange={e => setAt(i, k, e.target.value)}>
              <option value="">選ぶ</option>
              {players.filter(m => m.id === pr[k] || !used.has(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          ))}
        </div>
      ))}
      <button className="tk-btn" style={{ marginTop: 6 }} disabled={disabled} onClick={() => onSave(pairs)}>💾 このチームで決定（運営）</button>
    </>
  );
}

// ---- 参加・不参加の回答 ----
function AnswerSheet({ cur, me, Av, tDates, myEntry, dateIds, teamVoteOn, awardVoteOn, carryVoteOn, partyNote, entryOpen, showToast, onDone, onChangeWho }) {
  const [status, setStatus] = useState(myEntry?.status || null);
  const [picked, setPicked] = useState(() => (myEntry?.date_ids || []).filter(id => dateIds.has(id)));
  const [teamVote, setTeamVote] = useState(myEntry?.team_vote || null);
  const [comment, setComment] = useState(myEntry?.comment || "");
  const [awards, setAwards] = useState(myEntry?.award_votes || []);
  const [carryVote, setCarryVote] = useState(myEntry?.carry_vote || null);
  const [party, setParty] = useState(myEntry?.afterparty || null);
  const [companions, setCompanions] = useState(myEntry?.companions || 0);
  const toggleAward = k => setAwards(a => (a.includes(k) ? a.filter(x => x !== k) : a.length >= AWARD_VOTE_MAX ? a : [...a, k]));
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
      award_votes: status === "join" && awardVoteOn ? awards : [],
      carry_vote: status === "join" && carryVoteOn ? carryVote : null,
      afterparty: status === "join" && partyNote ? party : null,
      companions: status === "join" && partyNote && party === "yes" ? companions : 0,
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
      {status === "join" && carryVoteOn && (
        <>
          <div className="tk-lbl">決勝への予選の点の持ち越し（どれがいい？）</div>
          <div className="tk-seg">
            {CARRY_PRIORITY.map(k => <button key={k} className={carryVote === k ? "on" : ""} disabled={!entryOpen} onClick={() => setCarryVote(k)}>{CARRY_LABEL[k]}</button>)}
          </div>
          <div className="tk-muted" style={{ marginTop: 4 }}>締切の時点で多いルールに決まります（同数は「持ち越さない」）</div>
        </>
      )}
      {status === "join" && awardVoteOn && (
        <>
          <div className="tk-lbl">採用してほしい賞（{AWARD_VOTE_MAX}つまで）</div>
          <div className="tk-seg">
            {AWARD_CANDIDATES.map(k => (
              <button key={k} className={awards.includes(k) ? "on" : ""} disabled={!entryOpen || (!awards.includes(k) && awards.length >= AWARD_VOTE_MAX)} onClick={() => toggleAward(k)}>
                {PRIZES.find(x => x.key === k).voteLabel || PRIZES.find(x => x.key === k).label}
              </button>
            ))}
          </div>
          <div className="tk-muted" style={{ marginTop: 4 }}>{awards.length}／{AWARD_VOTE_MAX}つ選択中</div>
        </>
      )}
      {status && (
        <>
          <div className="tk-lbl">コメント（任意・全員に表示されます）</div>
          <textarea className="tk-in" style={{ height: 64, fontSize: 13 }} maxLength={200} disabled={!entryOpen}
            placeholder="例：19時からなら行けます／12/12はできれば避けたいです" value={comment} onChange={e => setComment(e.target.value)} />
        </>
      )}
      {status === "join" && partyNote && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🍻 二次会</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#ddd", marginBottom: 8 }}>{partyNote}</div>
          <div className="tk-seg">
            <button className={party === "yes" ? "on" : ""} disabled={!entryOpen} onClick={() => setParty("yes")}>参加する</button>
            <button className={party === "no" ? "on" : ""} disabled={!entryOpen} onClick={() => setParty("no")}>参加しない</button>
          </div>
          {party === "yes" && (
            <>
              <div className="tk-lbl">同伴者（恋人・家族など）の人数</div>
              <div className="tk-seg">
                {[0, 1, 2, 3, 4, 5].map(n => <button key={n} className={companions === n ? "on" : ""} disabled={!entryOpen} onClick={() => setCompanions(n)}>{n === 0 ? "なし" : `${n}名`}</button>)}
              </div>
            </>
          )}
        </div>
      )}
      <button className="tk-btn" style={{ marginTop: 14 }} disabled={!status || saving || !entryOpen} onClick={save}>
        {saving ? "保存中..." : "この内容で決定"}
      </button>
    </>
  );
}

// ---- 運営メニュー（りょう＋管理パスワード） ----
function AdminSheet({ me, isAdminUser, adminUnlocked, onUnlock, tournaments, cur, dates, joinCount, awardTally = {}, showToast, onSelectTournament, reload, onClose }) {
  const [pass, setPass] = useState("");
  const [creating, setCreating] = useState(false); // 大会がまだ無いときは、自動的に「新しく作る」になる
  const [form, setForm] = useState(() => toForm(cur));
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);

  // 編集する大会が切り替わったときだけ入力欄を読み直す
  // （運営メニューは開くたびに最新の内容で作り直される。開いている間に即時反映が届いても、入力途中の内容は消さない）
  useEffect(() => {
    if (!creating) setForm(toForm(cur));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, creating]);

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
  const visibleList = tournaments.filter(t => !t.deleted_at && !t.settings?.manual);

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
      <div className="tk-lbl">当日のスタート時刻（候補日の欄に表示）</div>
      <div className="tk-row">
        <input className="tk-in" type="time" value={form.settings.startTime || ""} onChange={e => setS("startTime", e.target.value)} />
        {form.settings.startTime && <button className="tk-btn sub" style={{ width: "auto", whiteSpace: "nowrap", padding: "8px 10px" }} onClick={() => setS("startTime", "")}>✕ クリア</button>}
      </div>

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
      <div className="tk-lbl">順位点のルール（配給原点・返し・ウマ1〜4位）</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <input className="tk-in" type="number" inputMode="numeric" value={form.settings.ruleStarting} onChange={e => setS("ruleStarting", Number(e.target.value))} />
        <input className="tk-in" type="number" inputMode="numeric" value={form.settings.ruleKaeshi} onChange={e => setS("ruleKaeshi", Number(e.target.value))} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <input key={i} className="tk-in" inputMode="numeric" value={(form.settings.ruleUma || [20, 10, -10, -20])[i]}
            onChange={e => { const u = [...(form.settings.ruleUma || [20, 10, -10, -20])]; u[i] = e.target.value === "-" ? "-" : Number(e.target.value); setS("ruleUma", u); }} />
        ))}
      </div>
      <div className="tk-lbl">予選の点を決勝に持ち越す</div>
      <Seg value={form.settings.carryOver || "none"} options={[["vote", "投票で決める"], ["none", "持ち越さない"], ["all", "全部"], ["half", "半分"]]} onChange={v => setS("carryOver", v)} />
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
              {p.label}{awardTally[p.key] ? <span className="tk-muted">（{awardTally[p.key].length}票）</span> : null}
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

      <div className="tk-lbl">候補日への運営コメント（全員に表示）</div>
      <textarea className="tk-in" style={{ height: 56 }} maxLength={200} placeholder="例：12/12は19時開始の予定です" value={form.settings.dateNote || ""} onChange={e => setS("dateNote", e.target.value)} />
      <div className="tk-lbl">二次会の案内文（入れると、参加の回答の最後に二次会の出欠を聞きます）</div>
      <textarea className="tk-in" style={{ height: 60 }} maxLength={300} placeholder="例：二件目で、一人3,000円で二次会をやりたいと思います。参加しますか？" value={form.settings.afterpartyNote || ""} onChange={e => setS("afterpartyNote", e.target.value)} />
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
