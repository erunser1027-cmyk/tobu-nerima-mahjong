import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const INVITE = "とうねり";
const AC = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#e67e22","#1abc9c","#e91e63"];
const RI = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣"];
const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DOW = ["日","月","火","水","木","金","土"];
const SCORE_RATES = [
  { label:"0.5レート（1000点=50円）", val:50 },
  { label:"0.3レート（1000点=30円）", val:30 },
];

const CHANGELOG = [
  { date:"2026-05-02", features:[
    "生涯成績の各項目に色分け基準を設定（黄・オレンジ・紫・青）",
    "ゲスト追加機能（ゲスト1・2…と自動採番）",
    "役満達成時に演出アニメーション追加",
    "LIVE途中経過パネル追加（LIVEバッジタップで表示）",
    "対局開始ボタン押下でLIVEバッジ点滅開始",
    "対人成績をランダム選出に変更（🎲）",
    "生涯成績詳細に各項目の順位表示追加（👑）",
    "履歴を日付順に変更",
    "メンバー名前編集機能追加（✏️ボタン）",
    "役満の種類入力追加（編集モーダル・入力画面両対応）",
    "開放立直振込ギャラリー（💀タブ）追加",
    "役満ギャラリーをダッシュボードのサブタブに移動",
    "対人成績に過去ランダム10戦ゲームモード追加",
    "生涯成績テーブルを上部に移動・行タップで詳細表示",
    "対人成績タブ（⚔️）追加",
    "過去の成績編集に開放立直・振り込みチェック追加",
    "編集モーダルに写真追加機能",
    "編集モーダルにレート変更追加",
    "過去の成績編集にテンキー・役満チェック追加",
    "履歴の削除・編集機能追加",
    "メンバー削除2段階確認追加",
    "保存後すぐ反映されるよう修正",
    "場代を合計入力→人数割り勘自動計算に変更",
    "チップ自動計算ボタン追加",
    "生涯成績タブ追加（トップ率・連対率・ラスト率・役満回数）",
    "カレンダーの役満日を金色表示",
    "対局履歴のタップで展開・折りたたみ機能",
    "役満チェックボックス追加",
  ]},
  { date:"2026-05-01", features:[
    "Supabase統合（リアルタイムデータ共有）",
    "独自ドメイン設定（tleague.nerima-night-crew.com）",
    "PWA化（ホーム画面アイコン追加対応）",
    "Vercelデプロイ・GitHub連携",
    "デフォルトを0.3レート・チップ50円に変更",
    "日付タイムゾーンバグ修正",
    "バグ修正：履歴スコア表示・役満バッジ・抜け番",
    "アイコン・レイアウト修正",
    "順位点直接入力方式に変更（テンキー・±キー付き）",
    "5人以上参加時の抜け番対応",
    "写真アップロード機能（半荘・プロフィール）",
    "月別スコア推移グラフ追加",
    "カレンダー機能追加",
    "対人成績基本機能",
  ]},
];

const N = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
const fw = n => (n >= 0 ? "+" : "") + Math.round(n).toLocaleString();
const fwy = n => fw(n) + "円";
const cc = n => n >= 0 ? "#2ecc71" : "#e74c3c";
const mc = m => AC[(m.id - 1) % AC.length];

function calcTotals(sess) {
  const res = {};
  sess.members.forEach(id => {
    const sid = String(id);
    let sc = 0;
    sess.rounds.forEach(r => {
      const v = r.scores[sid] ?? r.scores[id];
      if (v != null) sc += N(v);
    });
    const ch = N(sess.chips[sid] ?? sess.chips[id]);
    const scY = sc * N(sess.rules.scoreRate);
    const chY = ch * N(sess.rules.chipRate);
    const ba = N(sess.bashiro?.[sid] ?? sess.bashiro?.[id]);
    const seisan = scY + chY;
    res[id] = { sc, chip:ch, scY, chY, seisan, ba, kati:seisan - ba };
  });
  return res;
}

function Av({ m, sz }) {
  if (!m) return <div style={{ width:sz, height:sz, borderRadius:"50%", background:"#333", margin:"0 auto" }} />;
  if (m.photo) return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", overflow:"hidden", margin:"0 auto" }}>
      <img src={m.photo} alt={m.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
    </div>
  );
  const c = mc(m);
  return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", background:c, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:600, fontSize:Math.round(sz*.4), margin:"0 auto" }}>
      {m.name.slice(0,1)}
    </div>
  );
}

function Keypad({ value, onChange }) {
  function press(k) {
    if (k === "⌫") { onChange(value.length > 1 ? value.slice(0,-1) : ""); return; }
    if (k === "±") {
      if (!value || value === "0") return;
      onChange(value.startsWith("-") ? value.slice(1) : "-" + value);
      return;
    }
    if (value.replace("-","").length >= 4) return;
    if (k === "0" && (value === "0" || value === "-0")) return;
    if (!value || value === "0") { onChange(k); return; }
    if (value === "-0") { onChange("-" + k); return; }
    onChange(value + k);
  }
  const rows = [["7","8","9"],["4","5","6"],["1","2","3"],["±","0","⌫"]];
  return (
    <div style={{ background:"#12122a", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:6, marginTop:5 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginBottom: ri<3 ? 4 : 0 }}>
          {row.map(k => (
            <button key={k} onClick={() => press(k)} style={{
              padding:"12px 0", borderRadius:7, border:"none", cursor:"pointer",
              fontSize:18, fontWeight:500,
              background: k==="±" ? "rgba(231,76,60,0.35)" : k==="⌫" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.14)",
              color: k==="±" ? "#e74c3c" : "#fff",
            }}>{k}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(()=>{
    try {
      const saved = localStorage.getItem("tleague_auth");
      if (!saved) return false;
      const { expire } = JSON.parse(saved);
      return Date.now() < expire;
    } catch { return false; }
  });
  const [ci, setCi] = useState(""); const [ce, setCe] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [period, setPeriod] = useState("all");
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lr, setLr] = useState({ kaeshi:30000, starting:25000, uma:[20,10,-10,-20], scoreRate:30, chipRate:50 });
  const [lb, setLb] = useState(null);
  const [calY, setCalY] = useState(new Date().getFullYear());
  const [calM, setCalM] = useState(new Date().getMonth());
  const [calSel, setCalSel] = useState(null);
  const [mfShow, setMfShow] = useState(false);
  const [mfName, setMfName] = useState("");
  const [mfPhoto, setMfPhoto] = useState(null);

  const [addStep, setAddStep] = useState(0);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const [addDate, setAddDate] = useState(today());
  const [addRules, setAddRules] = useState({ kaeshi:30000, starting:25000, uma:[20,10,-10,-20], scoreRate:30, chipRate:50 });
  const [addSel, setAddSel] = useState([]);
  const [addRounds, setAddRounds] = useState([]);
  const [rpSc, setRpSc] = useState({});
  const [rpAutoId, setRpAutoId] = useState(null);
  const [rpPhotos, setRpPhotos] = useState({});
  const [rpYakuman, setRpYakuman] = useState([]);
  const [rpYakumanTypes, setRpYakumanTypes] = useState({});
  const [rpOpenRiichi, setRpOpenRiichi] = useState([]); // 開放立直したプレイヤー
  const [rpDealIn, setRpDealIn] = useState([]);         // 振り込んだプレイヤー
  const [rpActive, setRpActive] = useState(null);
  const [addErr, setAddErr] = useState("");
  const [addChips, setAddChips] = useState({});
  const [addBashiro, setAddBashiro] = useState({});
  const [chipActive, setChipActive] = useState(null);
  const [histOpen, setHistOpen] = useState({});
  const [bashiroTotal, setBashiroTotal] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editSession, setEditSession] = useState(null);
  const [memberDeleteStep, setMemberDeleteStep] = useState({});
  const [memberEditId, setMemberEditId] = useState(null);
  const [memberEditName, setMemberEditName] = useState("");
  const [editKeypadActive, setEditKeypadActive] = useState(null); // "ri-pid"
  const [dashSub, setDashSub] = useState("summary");
  const [sortKey, setSortKey] = useState("sc");
  const [sortAsc, setSortAsc] = useState(false);
  const [h2hA, setH2hA] = useState(null);
  const [h2hB, setH2hB] = useState(null);
  const [lifeDetail, setLifeDetail] = useState(null);
  const [last10Mode, setLast10Mode] = useState(false);
  const [last10Revealed, setLast10Revealed] = useState({});
  const [last10Seed, setLast10Seed] = useState(0);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const [yakumanCelebration, setYakumanCelebration] = useState(null);
  const [showChangelog, setShowChangelog] = useState(false); // {name, type}

  const fileRef = useRef(null);
  const [photoTgt, setPhotoTgt] = useState(null);
  const cvRef = useRef(null);

  const gm = id => members.find(m => m.id === Number(id));
  const is5 = addSel.length > 4;

  // ---- Supabase: データ取得 ----
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: mData }, { data: sData }] = await Promise.all([
        supabase.from("members").select("*").order("id"),
        supabase.from("sessions").select("*").order("created_at"),
      ]);
      if (mData) setMembers(mData);
      if (sData) setSessions(sData);
      setLoading(false);
    }
    fetchData();

    // リアルタイム購読
    const channel = supabase.channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        supabase.from("members").select("*").order("id").then(({ data }) => { if (data) setMembers(data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        supabase.from("sessions").select("*").order("created_at").then(({ data }) => { if (data) setSessions(data); });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ---- 統計 ----
  function getStats() {
    const now = new Date();
    const fil = sessions.filter(s => {
      const d = new Date(s.date);
      if (period === "month") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
      if (period === "year") return d.getFullYear()===now.getFullYear();
      return true;
    });
    return members.map(m => {
      const sid = String(m.id);
      let sc=0, scY=0, chY=0, ba=0, games=0, wins=0;
      const monthly = {};
      fil.forEach(s => {
        if (!s.members.map(Number).includes(m.id)) return;
        const mo = s.date.slice(0,7);
        if (!monthly[mo]) monthly[mo] = {sc:0};
        let ss = 0;
        s.rounds.forEach(r => {
          const v = r.scores[sid] ?? r.scores[m.id];
          if (v == null) return;
          games++;
          const sc2 = N(v);
          sc += sc2; ss += sc2;
          const maxSc = Math.max(...r.players.map(pid => N(r.scores[String(pid)] ?? r.scores[pid])));
          if (sc2 === maxSc) wins++;
          monthly[mo].sc += sc2;
        });
        scY += ss * N(s.rules.scoreRate);
        chY += N(s.chips[sid] ?? s.chips[m.id]) * N(s.rules.chipRate);
        ba += N(s.bashiro?.[sid] ?? s.bashiro?.[m.id]);
      });
      const seisan = scY + chY, kati = seisan - ba;
      return { ...m, sc:Math.round(sc), scY, chY, seisan, ba, kati, games, wins, wr:games?Math.round(wins/games*100):0, monthly };
    });
  }

  // ---- チャート ----
  useEffect(() => {
    if (tab !== "dashboard" || dashSub !== "summary") return;
    const cv = cvRef.current; if (!cv) return;
    const st = getStats();
    const actM = members.filter(m => sessions.some(s => s.members.includes(m.id)));
    const months = [...new Set(sessions.map(s => s.date.slice(0,7)))].sort();
    if (!months.length || !actM.length) return;
    const ctx = cv.getContext("2d"), W = cv.offsetWidth || 360;
    cv.width = W; cv.height = 130;
    const pad = {l:28,r:4,t:8,b:16}, pw = W-pad.l-pad.r, ph = 130-pad.t-pad.b;
    const data = months.map(mo => { const e={month:mo.slice(5)+"月"}; st.forEach(s=>{e[s.id]=s.monthly[mo]?.sc||0;}); return e; });
    const vs = data.flatMap(d => actM.map(m => d[m.id]||0));
    const mn=Math.min(...vs), mx=Math.max(...vs), rng=mx-mn||1;
    const yx = v => pad.t+ph-(v-mn)/rng*ph, xx = i => pad.l+i/Math.max(data.length-1,1)*pw;
    ctx.clearRect(0,0,W,130);
    for (let i=0;i<4;i++) {
      const y=pad.t+i*ph/3;
      ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+pw,y); ctx.stroke();
      ctx.fillStyle="#555"; ctx.font="8px sans-serif"; ctx.textAlign="right";
      ctx.fillText(Math.round(mx-i*rng/3), pad.l-2, y+3);
    }
    data.forEach((d,i)=>{ ctx.fillStyle="#444"; ctx.font="8px sans-serif"; ctx.textAlign="center"; ctx.fillText(d.month, xx(i), 128); });
    actM.forEach(m => {
      const c=mc(m); ctx.strokeStyle=c; ctx.lineWidth=2; ctx.beginPath();
      data.forEach((d,i)=>{ const v=d[m.id]||0; i===0?ctx.moveTo(xx(i),yx(v)):ctx.lineTo(xx(i),yx(v)); }); ctx.stroke();
      data.forEach((d,i)=>{ ctx.beginPath(); ctx.arc(xx(i),yx(d[m.id]||0),3,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); });
    });
    actM.forEach((m,i)=>{
      const c=mc(m), lx=pad.l+i*Math.min(50,pw/actM.length);
      ctx.fillStyle=c; ctx.fillRect(lx,0,7,7);
      ctx.fillStyle="#bbb"; ctx.font="8px sans-serif"; ctx.textAlign="left"; ctx.fillText(m.name,lx+10,7);
    });
  });

  // ---- 写真 ----
  function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement("canvas");
        const isP = photoTgt?.t==="p"||photoTgt?.t==="np";
        const sz = isP ? 80 : 150; c.width=sz; c.height=sz;
        const ctx=c.getContext("2d"), s=Math.min(img.width,img.height), sx=(img.width-s)/2, sy=(img.height-s)/2;
        ctx.drawImage(img,sx,sy,s,s,0,0,sz,sz);
        const d = c.toDataURL("image/jpeg",0.8);
        if (photoTgt?.t==="p") {
          supabase.from("members").update({ photo: d }).eq("id", photoTgt.id).then(() => {});
          setMembers(ms=>ms.map(m=>m.id===photoTgt.id?{...m,photo:d}:m));
        } else if (photoTgt?.t==="np") {
          setMfPhoto(d);
        } else if (photoTgt?.t==="r") {
          setRpPhotos(prev=>{ const a=[...(prev[photoTgt.id]||[])]; if(a.length<3)a.push(d); return{...prev,[photoTgt.id]:a}; });
        } else if (photoTgt?.t==="edit") {
          const { ri, pid } = photoTgt;
          setEditSession(prev=>{
            const newRounds = prev.rounds.map((rr,i)=>i!==ri?rr:{
              ...rr, photos:{...rr.photos,[pid]:[...(rr.photos?.[pid]||[]),d].slice(0,3)}
            });
            return{...prev,rounds:newRounds};
          });
        }
      }; img.src=ev.target.result;
    }; reader.readAsDataURL(f);
  }

  // ---- 順位点入力 ----
  function handleScore(id, val) {
    const newSc = { ...rpSc, [id]: val };
    if (rpAutoId === id) setRpAutoId(null);
    setRpSc(newSc);
  }

  function autoCalc(targetId) {
    const others = addSel.filter(id => id !== targetId);
    const filled = others.filter(id => String(rpSc[id]||"").trim() !== "");
    if (filled.length !== 3) { setAddErr("他の3人の点数を先に入力してください"); return; }
    const sum = filled.reduce((acc, id) => acc + N(rpSc[id]), 0);
    setRpSc(prev => ({ ...prev, [targetId]: String(-sum) }));
    setRpAutoId(targetId);
    setRpActive(null);
    setAddErr("");
  }

  function confirmRound() {
    const playing = addSel.filter(id => String(rpSc[id]||"").trim() !== "");
    if (playing.length !== 4) { setAddErr("4人分の点数を入力してください"); return; }
    const scores = {};
    playing.forEach(id => { scores[id] = N(rpSc[id]); });
    setAddRounds(prev => [...prev, { players: playing, scores, photos:{...rpPhotos}, yakuman:[...rpYakuman], yakumanTypes:{...rpYakumanTypes}, openRiichi:[...rpOpenRiichi], dealIn:[...rpDealIn] }]);

    // 役満演出
    if (rpYakuman.length > 0) {
      const pid = rpYakuman[0];
      const m = gm(pid);
      setYakumanCelebration({ name: m?.name||"", type: rpYakumanTypes[pid]||"" });
      setTimeout(() => setYakumanCelebration(null), 4000);
    }
    setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
    setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null); setAddErr("");
  }

  function startAdd() {
    setAddStep(2);
    setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
    setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes([]); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null);
    setAddRounds([]); setAddChips({}); setAddBashiro({}); setAddErr("");
  }

  async function saveSession() {
    const chips={}, bashiro={};
    addSel.forEach(id => { chips[id]=N(addChips[id]); bashiro[id]=N(addBashiro[id]); });
    const newSess = {
      date: addDate,
      rules: {...addRules, uma: addRules.uma.map(Number)},
      members: [...addSel],
      rounds: addRounds,
      chips,
      bashiro,
    };
    const { data } = await supabase.from("sessions").insert(newSess).select().single();
    if (data) setSessions(p => [...p, data]);
    setLr({...addRules, uma:addRules.uma.map(Number)});
    setBashiroTotal("");
    setAddStep(0); setTab("history");
  }

  async function deleteSession(id) {
    await supabase.from("sessions").delete().eq("id", id);
    setSessions(p => p.filter(s => s.id !== id));
    setDeleteConfirm(null);
    setHistOpen(prev => { const n={...prev}; delete n[id]; return n; });
  }

  async function saveEditSession() {
    const updated = { ...editSession };
    await supabase.from("sessions").update({
      rounds: updated.rounds,
      chips: updated.chips,
      bashiro: updated.bashiro,
      rules: updated.rules,
    }).eq("id", updated.id);    setSessions(p => p.map(s => s.id === updated.id ? updated : s));
    setEditSession(null);
    setEditKeypadActive(null);
  }

  function resetAdd() {
    setAddStep(0); setAddRules({...lr}); setAddSel([]); setAddRounds([]);
    setAddDate(today());
    setRpSc({}); setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setAddChips({}); setAddBashiro({});
    setRpActive(null); setChipActive(null); setAddErr(""); setBashiroTotal("");
  }

  // ---- スタイル ----
  const S = {
    card: (ex) => ({ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:10, marginBottom:8, ...ex }),
    inp: (ex) => ({ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:6, padding:"6px 8px", fontSize:13, width:"100%", outline:"none", ...ex }),
    sel: (ex) => ({ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:6, padding:"6px 8px", fontSize:13, width:"100%", outline:"none", cursor:"pointer", ...ex }),
    br: (ex) => ({ padding:"9px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#e74c3c,#c0392b)", color:"#fff", cursor:"pointer", fontWeight:"bold", fontSize:13, ...ex }),
    bb: (ex) => ({ padding:"9px 16px", borderRadius:8, border:"none", background:"rgba(52,152,219,0.8)", color:"#fff", cursor:"pointer", fontWeight:"bold", fontSize:13, ...ex }),
    bg: (ex) => ({ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:12, ...ex }),
    bs: (ex) => ({ padding:"4px 9px", borderRadius:5, border:"none", background:"rgba(255,255,255,0.1)", color:"#aaa", cursor:"pointer", fontSize:11, ...ex }),
    nav: (on) => ({ padding:"5px 9px", borderRadius:16, border:"none", color:"#fff", cursor:"pointer", fontSize:11, fontWeight:500, background:on?"#e74c3c":"rgba(255,255,255,0.1)" }),
    pd: (on) => ({ padding:"4px 10px", borderRadius:13, cursor:"pointer", fontSize:11, background:"transparent", border:on?"1px solid #e74c3c":"1px solid rgba(255,255,255,0.18)", color:on?"#e74c3c":"#888" }),
  };

  // ---- ログイン画面 ----
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, padding:"28px 22px", width:260, textAlign:"center" }}>
        <div style={{ fontSize:38, marginBottom:6 }}>🀄</div>
        <div style={{ color:"#fff", fontSize:15, fontWeight:600, marginBottom:2 }}>東武練馬Tリーグ</div>
        <div style={{ color:"#e74c3c", fontSize:12, marginBottom:14, fontWeight:500 }}>麻雀スコア表</div>
        <input value={ci} onChange={e=>{setCi(e.target.value);setCe(false);}}
          onKeyDown={e=>{if(e.key==="Enter"){if(ci===INVITE){localStorage.setItem("tleague_auth",JSON.stringify({expire:Date.now()+30*24*60*60*1000}));setAuthed(true);}else setCe(true);}}}
          placeholder="招待コードを入力"
          style={{...S.inp({textAlign:"center",letterSpacing:2,fontSize:14,borderColor:ce?"#e74c3c":"rgba(255,255,255,0.2)"})}} />
        {ce && <div style={{color:"#e74c3c",fontSize:11,marginTop:4}}>コードが違います</div>}
        <button onClick={()=>{
          if(ci===INVITE){
            localStorage.setItem("tleague_auth", JSON.stringify({expire: Date.now()+30*24*60*60*1000}));
            setAuthed(true);
          } else { setCe(true); }
        }} style={{...S.br({marginTop:10,width:"100%",fontSize:14})}}>入室する</button>
      </div>
    </div>
  );

  // ---- ローディング ----
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0f0f1a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ textAlign:"center", color:"#fff" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🀄</div>
        <div style={{ fontSize:14, color:"#888" }}>データを読み込み中...</div>
      </div>
    </div>
  );

  const stats = getStats();
  const sortedStats = [...stats].sort((a,b)=>b.sc-a.sc);

  function ConfirmedRound({ r, ri, sessMembers }) {
    const allM = sessMembers.map(id=>gm(id)).filter(Boolean);
    const sortedPlayers = [...r.players].sort((a,b)=>N(r.scores[b])-N(r.scores[a]));
    return (
      <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:7, padding:7, marginBottom:6 }}>
        <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>第{ri+1}半荘 <span style={{color:"#555"}}>確定済</span></div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${allM.length},1fr)`, gap:3 }}>
          {allM.map(m => {
            const isPlaying = r.players.includes(m.id);
            if (!isPlaying) return (
              <div key={m.id} style={{ textAlign:"center", padding:4, opacity:0.3 }}>
                <Av m={m} sz={18}/><div style={{fontSize:9,color:"#555",marginTop:1}}>休憩</div>
              </div>
            );
            const sc2 = N(r.scores[m.id]);
            const rank = sortedPlayers.indexOf(m.id) + 1;
            const ph = (r.photos?.[m.id])||[];
            return (
              <div key={m.id} style={{ textAlign:"center", padding:4, background:rank===1?"rgba(231,76,60,0.1)":"rgba(255,255,255,0.03)", borderRadius:5 }}>
                <Av m={m} sz={18}/>
                <div style={{fontSize:9,marginTop:1}}>{m.name}</div>
                <div style={{fontSize:13,fontWeight:"bold",color:cc(sc2)}}>{fw(sc2)}</div>
                {ph.length>0 && (
                  <div style={{display:"flex",gap:2,justifyContent:"center",marginTop:3,flexWrap:"wrap"}}>
                    {ph.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setLb(p)} style={{width:36,height:36,borderRadius:5,objectFit:"cover",cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)"}}/>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width:"100%", maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#0f0f1a", color:"#fff", fontFamily:"sans-serif", boxSizing:"border-box" }}>
      <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onFile}/>
      {lb && <div onClick={()=>setLb(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,cursor:"pointer"}}><img src={lb} alt="" style={{maxWidth:"90%",maxHeight:"80vh",borderRadius:8}}/></div>}

      {/* 編集モーダル */}
      {editSession && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:999,overflowY:"auto",padding:"16px 12px"}}>
          <div style={{maxWidth:480,margin:"0 auto",background:"#1a1a2e",borderRadius:12,padding:14}}>
            <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:12}}>✏️ 対戦記録を編集</div>
            <div style={{fontSize:11,color:"#888",marginBottom:10}}>📅 {editSession.date}</div>

            {/* 半荘ごとのスコア編集 */}
            {editSession.rounds.map((r, ri) => {
              const sortedPl = [...r.players].sort((a,b) => N(r.scores[b]) - N(r.scores[a]));
              return (
                <div key={ri} style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:9,marginBottom:8}}>
                  <div style={{fontSize:11,color:"#ccc",marginBottom:7}}>第{ri+1}半荘</div>
                  {sortedPl.map(pid => {
                    const m = gm(pid); if (!m) return null;
                    const key = `${ri}-${pid}`;
                    const isActive = editKeypadActive === key;
                    const v = String(r.scores[pid] ?? "");
                    const isYakuman = r.yakuman && r.yakuman.includes(pid);
                    const isOpenRiichi = r.openRiichi && r.openRiichi.map(Number).includes(Number(pid));
                    const isDealIn = r.dealIn && r.dealIn.map(Number).includes(Number(pid));

                    const toggleArr = (field, pid) => {
                      setEditSession(prev=>{
                        const newRounds=prev.rounds.map((rr,i)=>i!==ri?rr:{
                          ...rr,[field]: (rr[field]||[]).map(Number).includes(Number(pid))
                            ? (rr[field]||[]).filter(x=>Number(x)!==Number(pid))
                            : [...(rr[field]||[]),pid]
                        });
                        return{...prev,rounds:newRounds};
                      });
                    };

                    return (
                      <div key={pid} style={{marginBottom:8,background:"rgba(255,255,255,0.04)",borderRadius:7,padding:7}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                          <Av m={m} sz={22}/>
                          <div style={{fontSize:12,flex:1}}>{m.name}</div>
                          {/* 役満チェック */}
                          <div onClick={()=>toggleArr("yakuman",pid)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 7px",borderRadius:6,cursor:"pointer",background:isYakuman?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.05)",border:isYakuman?"1px solid rgba(255,215,0,0.5)":"1px solid rgba(255,255,255,0.1)"}}>
                            <span style={{fontSize:12}}>{isYakuman?"☑️":"⬜"}</span>
                            <span style={{fontSize:10,color:isYakuman?"#ffd700":"#666"}}>役満</span>
                          </div>
                          {/* 開放立直チェック */}
                          <div onClick={()=>toggleArr("openRiichi",pid)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 7px",borderRadius:6,cursor:"pointer",background:isOpenRiichi?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.05)",border:isOpenRiichi?"1px solid rgba(52,152,219,0.5)":"1px solid rgba(255,255,255,0.1)"}}>
                            <span style={{fontSize:12}}>{isOpenRiichi?"☑️":"⬜"}</span>
                            <span style={{fontSize:10,color:isOpenRiichi?"#3498db":"#666"}}>開放立直</span>
                          </div>
                        </div>
                        {/* 役満種類入力 */}
                        {isYakuman && (
                          <input type="text" placeholder="種類（例: 国士無双）"
                            value={(r.yakumanTypes?.[String(pid)]??r.yakumanTypes?.[pid])||""}
                            onChange={e=>{
                              const val=e.target.value;
                              setEditSession(prev=>{
                                const newRounds=prev.rounds.map((rr,i)=>i!==ri?rr:{
                                  ...rr,yakumanTypes:{...(rr.yakumanTypes||{}),[pid]:val}
                                });
                                return{...prev,rounds:newRounds};
                              });
                            }}
                            onClick={e=>e.stopPropagation()}
                            style={{marginBottom:4,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.3)",color:"#ffd700",borderRadius:6,padding:"4px 8px",fontSize:12,width:"100%",outline:"none"}}/>
                        )}
                        {/* 振り込みチェック（開放立直のときのみ） */}
                        {isOpenRiichi && (
                          <div onClick={()=>toggleArr("dealIn",pid)} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,padding:"5px 8px",borderRadius:6,cursor:"pointer",background:isDealIn?"rgba(231,76,60,0.15)":"rgba(255,255,255,0.03)",border:isDealIn?"1px solid rgba(231,76,60,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                            <span style={{fontSize:12}}>{isDealIn?"☑️":"⬜"}</span>
                            <span style={{fontSize:11,color:isDealIn?"#e74c3c":"#666",fontWeight:isDealIn?600:400}}>💀 振り込み</span>
                          </div>
                        )}
                        {/* スコア表示 → タップでテンキー */}
                        <div onClick={()=>setEditKeypadActive(isActive?null:key)}
                          style={{textAlign:"center",padding:"8px 6px",borderRadius:7,cursor:"pointer",marginBottom:isActive?4:0,
                            background:isActive?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.06)",
                            border:isActive?"1px solid rgba(231,76,60,0.4)":"1px solid rgba(255,255,255,0.1)"}}>
                          <span style={{fontSize:18,fontWeight:"bold",color:N(v)>=0?"#2ecc71":"#e74c3c"}}>
                            {v!==""?(N(v)>=0?"+":"")+v:"タップで入力"}
                          </span>
                        </div>
                        {isActive && (
                          <Keypad value={v} onChange={val=>{
                            setEditSession(prev=>{
                              const newRounds = prev.rounds.map((rr,i)=>i!==ri?rr:{
                                ...rr, scores:{...rr.scores,[pid]:val}
                              });
                              return{...prev,rounds:newRounds};
                            });
                          }}/>
                        )}
                        {/* 写真追加 */}
                        {(() => {
                          const ph = (r.photos?.[pid]) || [];
                          return (
                            <div style={{marginTop:6}}>
                              {ph.length > 0 && (
                                <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:4}}>
                                  {ph.map((p,i)=>(
                                    <span key={i} style={{position:"relative",display:"inline-block"}}>
                                      <img src={p} alt="" style={{width:46,height:46,borderRadius:5,objectFit:"cover",cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)"}} onClick={()=>setLb(p)}/>
                                      <span onClick={()=>setEditSession(prev=>{
                                        const newRounds=prev.rounds.map((rr,idx)=>idx!==ri?rr:{
                                          ...rr,photos:{...rr.photos,[pid]:(rr.photos?.[pid]||[]).filter((_,pi)=>pi!==i)}
                                        });
                                        return{...prev,rounds:newRounds};
                                      })} style={{position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:"50%",background:"#e74c3c",color:"#fff",fontSize:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {ph.length < 3 && (
                                <button onClick={()=>{
                                  setPhotoTgt({t:"edit",ri,pid});
                                  fileRef.current.value="";
                                  fileRef.current.click();
                                }} style={{width:"100%",padding:"5px 0",borderRadius:6,border:"1px dashed rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.03)",color:"#888",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                                  📷 <span>写真を追加（{ph.length}/3）</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* レート編集 */}
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:9,marginBottom:8}}>
              <div style={{fontSize:11,color:"#ccc",marginBottom:7}}>💴 レート設定</div>
              <div style={{display:"flex",gap:6}}>
                {SCORE_RATES.map(r=>(
                  <div key={r.val} onClick={()=>setEditSession(prev=>({...prev,rules:{...prev.rules,scoreRate:r.val}}))}
                    style={{flex:1,padding:"8px 6px",borderRadius:7,cursor:"pointer",textAlign:"center",
                      background:editSession.rules.scoreRate===r.val?"rgba(231,76,60,0.2)":"rgba(255,255,255,0.04)",
                      border:editSession.rules.scoreRate===r.val?"1px solid #e74c3c":"1px solid rgba(255,255,255,0.15)"}}>
                    <div style={{fontSize:12,fontWeight:editSession.rules.scoreRate===r.val?600:400,color:editSession.rules.scoreRate===r.val?"#fff":"#aaa"}}>{r.label.split("（")[0]}</div>
                    <div style={{fontSize:10,color:"#666"}}>{r.label.match(/\((.+)\)/)?.[1]||""}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* チップ編集 */}
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:9,marginBottom:8}}>
              <div style={{fontSize:11,color:"#ccc",marginBottom:7}}>🎰 チップ枚数</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                {editSession.members.map(id => {
                  const m = gm(id); if (!m) return null;
                  return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:6}}>
                      <Av m={m} sz={20}/>
                      <div style={{fontSize:11,flex:1}}>{m.name}</div>
                      <input type="text" inputMode="decimal" value={editSession.chips[id]||0}
                        onChange={e => setEditSession(prev => ({...prev, chips:{...prev.chips,[id]:N(e.target.value)}}))}
                        style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,padding:"4px 6px",fontSize:12,width:60,textAlign:"center",outline:"none"}}/>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 場代編集 */}
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:9,marginBottom:12}}>
              <div style={{fontSize:11,color:"#ccc",marginBottom:7}}>🏠 場代（円）</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                {editSession.members.map(id => {
                  const m = gm(id); if (!m) return null;
                  return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:6}}>
                      <Av m={m} sz={20}/>
                      <div style={{fontSize:11,flex:1}}>{m.name}</div>
                      <input type="text" inputMode="decimal" value={editSession.bashiro[id]||0}
                        onChange={e => setEditSession(prev => ({...prev, bashiro:{...prev.bashiro,[id]:N(e.target.value)}}))}
                        style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,padding:"4px 6px",fontSize:12,width:60,textAlign:"center",outline:"none"}}/>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",gap:6}}>
              <button onClick={saveEditSession} style={S.br({flex:1})}>💾 保存する</button>
              <button onClick={()=>{setEditSession(null);setEditKeypadActive(null);}} style={S.bg()}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{background:"rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.12)",padding:"8px 10px",display:"flex",alignItems:"center",gap:7,position:"sticky",top:0,zIndex:50}}>
        <span style={{fontSize:18}}>🀄</span>
        <div>
          <div style={{fontSize:9,color:"#e74c3c",fontWeight:600,lineHeight:1.2}}>東武練馬Tリーグ</div>
          <div style={{fontSize:12,fontWeight:500,lineHeight:1.2}}>麻雀スコア表</div>
        </div>
        {/* LIVE バッジ */}
        {(addStep === 2 || sessions.some(s => s.date === today())) && (
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:16,background:"rgba(231,76,60,0.25)",border:"2px solid rgba(231,76,60,0.7)",cursor:addStep===2?"pointer":"default",boxShadow:"0 0 12px rgba(231,76,60,0.4)"}}
            onClick={()=>{ if(addStep===2) setShowLivePanel(p=>!p); }}>
            <span style={{width:10,height:10,borderRadius:"50%",background:"#e74c3c",display:"inline-block",animation:"pulse 1s infinite",boxShadow:"0 0 6px #e74c3c"}}/>
            <span style={{fontSize:15,fontWeight:800,color:"#e74c3c",letterSpacing:2}}>LIVE</span>
            {addStep===2&&<span style={{fontSize:11,color:"#e74c3c"}}>{showLivePanel?"▲":"▼"}</span>}
          </div>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {[["dashboard","📊"],["calendar","🗓"],["history","📅"],["skull","💀"],["add","➕"],["members","👥"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={S.nav(tab===t)}>{l}</button>
          ))}
        </div>
      </div>

      {/* LIVE途中経過パネル */}
      {addStep===2 && showLivePanel && (
        <div style={{background:"linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.15))",border:"2px solid rgba(231,76,60,0.6)",borderBottom:"3px solid #e74c3c",padding:"14px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:"#e74c3c",display:"inline-block",animation:"pulse 1s infinite",boxShadow:"0 0 6px #e74c3c"}}/>
              <div style={{fontSize:15,fontWeight:800,color:"#e74c3c",letterSpacing:2}}>LIVE 途中経過</div>
            </div>
            <div style={{fontSize:12,color:"#aaa",background:"rgba(0,0,0,0.3)",padding:"2px 10px",borderRadius:10}}>{addRounds.length}半荘終了</div>
          </div>
          {(() => {
            const totals = {};
            addSel.forEach(id => { totals[id] = 0; });
            addRounds.forEach(r => {
              Object.entries(r.scores).forEach(([pid, sc]) => {
                if (totals[Number(pid)] !== undefined) totals[Number(pid)] += N(sc);
              });
            });
            const sorted = addSel.map(id => ({ id, m: gm(id), sc: totals[id]||0 }))
              .sort((a,b) => b.sc - a.sc);
            return (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {sorted.map((p,i) => (
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:i===0?"rgba(231,76,60,0.2)":"rgba(255,255,255,0.06)",borderRadius:10,border:i===0?"1px solid rgba(231,76,60,0.4)":"1px solid rgba(255,255,255,0.08)"}}>
                    <span style={{fontSize:18,width:26}}>{RI[i]||"—"}</span>
                    <Av m={p.m} sz={34}/>
                    <div style={{fontSize:14,fontWeight:600,flex:1}}>{p.m?.name}</div>
                    <div style={{fontSize:22,fontWeight:"bold",color:cc(p.sc)}}>{fw(p.sc)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          {addRounds.length===0&&<div style={{fontSize:12,color:"#666",textAlign:"center",padding:12}}>まだ半荘の記録がありません</div>}
        </div>
      )}

      {/* 役満演出オーバーレイ */}
      {yakumanCelebration && (
        <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{background:"linear-gradient(135deg,rgba(0,0,0,0.92),rgba(20,0,0,0.95))",border:"3px solid #ffd700",borderRadius:20,padding:"32px 28px",textAlign:"center",boxShadow:"0 0 60px rgba(255,215,0,0.6),0 0 120px rgba(255,215,0,0.3)",animation:"yakumanPop 0.4s ease-out",maxWidth:300,width:"85%"}}>
            <div style={{fontSize:52,marginBottom:8}}>🀄</div>
            <div style={{fontSize:28,fontWeight:900,color:"#ffd700",letterSpacing:3,marginBottom:6,textShadow:"0 0 20px rgba(255,215,0,0.8)"}}>役満達成！</div>
            {yakumanCelebration.type&&(
              <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8}}>【{yakumanCelebration.type}】</div>
            )}
            <div style={{fontSize:18,color:"#ffd700",fontWeight:600}}>{yakumanCelebration.name}</div>
            <div style={{marginTop:16,display:"flex",justifyContent:"center",gap:6}}>
              {["🎊","✨","🎉","✨","🎊"].map((e,i)=>(
                <span key={i} style={{fontSize:20,animation:`yakumanFloat ${0.5+i*0.1}s ease-in-out infinite alternate`}}>{e}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes yakumanPop { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes yakumanFloat { 0%{transform:translateY(0)} 100%{transform:translateY(-8px)} }
      `}</style>

      <div style={{padding:10,paddingBottom:28}}>
        {(tab==="dashboard"||tab==="history") && (
          <div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center"}}>
            {[["all","全期間"],["year","今年"],["month","今月"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={S.pd(period===v)}>{l}</button>
            ))}
            <button onClick={()=>setShowChangelog(p=>!p)} style={{marginLeft:"auto",padding:"4px 10px",borderRadius:13,cursor:"pointer",fontSize:11,background:"transparent",border:showChangelog?"1px solid #7fb9e0":"1px solid rgba(255,255,255,0.18)",color:showChangelog?"#7fb9e0":"#888"}}>
              📋 更新履歴
            </button>
          </div>
        )}

        {/* 更新履歴モーダル */}
        {showChangelog && (
          <div style={{...S.card({background:"rgba(52,152,219,0.06)",border:"1px solid rgba(52,152,219,0.25)",marginBottom:10})}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#7fb9e0"}}>📋 更新履歴</div>
              <button onClick={()=>setShowChangelog(false)} style={S.bs()}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {CHANGELOG.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<CHANGELOG.length-1?"1px solid rgba(255,255,255,0.06)":"none"}}>
                  <div style={{fontSize:10,color:"#555",whiteSpace:"nowrap",minWidth:70,paddingTop:2}}>{item.date}</div>
                  <div style={{flex:1}}>
                    {item.features.map((f,j)=>(
                      <div key={j} style={{fontSize:11,color:"#ccc",marginBottom:2,display:"flex",gap:5,alignItems:"flex-start"}}>
                        <span style={{color:"#3498db",fontSize:10,marginTop:1}}>✦</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== DASHBOARD ===== */}
        {tab==="dashboard" && (() => {
          const lifetimeStats = members.map(m=>{
            const sid = String(m.id);
            let sc=0,scY=0,chY=0,ba=0,games=0,r1=0,r2=0,r3=0,r4=0,yakuman=0,openRiichiCount=0,dealInCount=0;
            sessions.forEach(s=>{
              if(!s.members.map(Number).includes(m.id)) return;
              let ss=0;
              s.rounds.forEach(r=>{
                const v = r.scores[sid] ?? r.scores[m.id];
                if(v==null) return;
                games++;
                const sc2=N(v);
                sc+=sc2; ss+=sc2;
                const sorted=[...r.players].sort((a,b)=>N(r.scores[String(b)]??r.scores[b])-N(r.scores[String(a)]??r.scores[a]));
                const rank=sorted.map(Number).indexOf(m.id)+1;
                if(rank===1)r1++; else if(rank===2)r2++; else if(rank===3)r3++; else if(rank===4)r4++;
                if(r.yakuman&&r.yakuman.map(Number).includes(m.id)) yakuman++;
                if(r.openRiichi&&r.openRiichi.map(Number).includes(m.id)) openRiichiCount++;
                if(r.dealIn&&r.dealIn.map(Number).includes(m.id)) dealInCount++;
              });
              scY+=ss*N(s.rules.scoreRate);
              chY+=N(s.chips[sid]??s.chips[m.id])*N(s.rules.chipRate);
              ba+=N(s.bashiro?.[sid]??s.bashiro?.[m.id]);
            });
            const seisan=scY+chY, kati=seisan-ba;
            const avgRank=games?(r1*1+r2*2+r3*3+r4*4)/games:0;
            return{
              ...m, sc:Math.round(sc), seisan, ba, kati, games,
              r1,r2,r3,r4,yakuman,openRiichiCount,dealInCount,
              dealInRate: games?Math.round(dealInCount/games*1000)/10:0,
              topRate:  games?Math.round(r1/games*1000)/10:0,
              renRate:  games?Math.round((r1+r2)/games*1000)/10:0,
              lastRate: games?Math.round(r4/games*1000)/10:0,
              avgRank:  Math.round(avgRank*100)/100,
            };
          }).filter(p=>p.games>0);

          const avgRankCol = v => v<=2.32?"#ffd700":v<=2.37?"#f39c12":v<=2.5?"#9b59b6":"#3498db";
          const topRateCol = v => v>=30?"#ffd700":v>=28?"#f39c12":v>=25?"#9b59b6":"#3498db";
          const renRateCol = v => v>=60?"#ffd700":v>=55?"#f39c12":v>=50?"#9b59b6":"#3498db";
          const lastRateCol = v => v<=16?"#ffd700":v<=20?"#f39c12":v<=23?"#9b59b6":"#3498db";

          const handleSort = (key) => {
            if(sortKey===key) setSortAsc(a=>!a);
            else { setSortKey(key); setSortAsc(false); }
          };
          const liSorted = [...lifetimeStats].sort((a,b)=> sortAsc ? a[sortKey]-b[sortKey] : b[sortKey]-a[sortKey]);
          const sortTh = (k, label) => (
            <th key={k} onClick={()=>handleSort(k)} style={{color:sortKey===k?"#e74c3c":"#666",fontWeight:400,padding:"5px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",whiteSpace:"nowrap",userSelect:"none",fontSize:10}}>
              {label}{sortKey===k?(sortAsc?"↑":"↓"):""}
            </th>
          );

          return (
            <>
              <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                {[["summary","📊 概要"],["lifetime","🏆 生涯成績"],["h2h","⚔️ 対人成績"],["yakuman","🀄 役満"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setDashSub(v)} style={{padding:"5px 12px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:dashSub===v?"#e74c3c":"rgba(255,255,255,0.1)",color:"#fff"}}>{l}</button>
                ))}
              </div>

              {dashSub==="summary" && (
                <>
                  {members.length === 0 ? (
                    <div style={{textAlign:"center",color:"#666",padding:40}}>
                      <div style={{fontSize:32,marginBottom:8}}>👥</div>
                      <div>まずメンバーを登録してください</div>
                    </div>
                  ) : (
                    <>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginBottom:10}}>
                        {sortedStats.filter(p=>p.games>0).map((p,i)=>(
                          <div key={p.id} style={S.card({background:i===0?"linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.12))":"rgba(255,255,255,0.05)",border:`1px solid ${i===0?"#e74c3c":"rgba(255,255,255,0.1)"}`,textAlign:"center",padding:10})}>
                            <Av m={gm(p.id)} sz={36}/>
                            <div style={{fontSize:12,fontWeight:500,marginTop:4}}>{p.name}</div>
                            <div style={{fontSize:18,fontWeight:"bold",color:cc(p.sc),marginTop:2}}>{fw(p.sc)}</div>
                            <div style={{fontSize:10,color:cc(p.seisan)}}>清算 {fwy(p.seisan)}</div>
                            <div style={{fontSize:10,color:cc(p.kati),fontWeight:500}}>勝ち分 {fwy(p.kati)}</div>
                            <div style={{fontSize:10,color:"#666",marginTop:2}}>{p.games}半荘 {p.wr}%</div>
                          </div>
                        ))}
                      </div>
                      <div style={S.card()}>
                        <div style={{fontSize:11,color:"#ccc",marginBottom:8}}>💰 収支内訳</div>
                        {sortedStats.filter(p=>p.games>0).map(p=>(
                          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                            <Av m={gm(p.id)} sz={28}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:500}}>{p.name}</div>
                              <div style={{fontSize:10,color:"#666"}}>{p.games}半荘</div>
                            </div>
                            <div style={{textAlign:"right",minWidth:60}}>
                              <div style={{fontSize:13,fontWeight:"bold",color:cc(p.sc)}}>{fw(p.sc)}</div>
                              <div style={{fontSize:9,color:"#666"}}>スコア</div>
                            </div>
                            <div style={{textAlign:"right",minWidth:72}}>
                              <div style={{fontSize:13,fontWeight:"bold",color:cc(p.seisan)}}>{fwy(p.seisan)}</div>
                              <div style={{fontSize:9,color:"#666"}}>清算</div>
                            </div>
                            <div style={{textAlign:"right",minWidth:72}}>
                              <div style={{fontSize:13,fontWeight:"bold",color:cc(p.kati)}}>{fwy(p.kati)}</div>
                              <div style={{fontSize:9,color:"#666"}}>勝ち分</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={S.card()}>
                        <div style={{fontSize:11,color:"#ccc",marginBottom:5}}>📈 月別スコア推移</div>
                        <canvas ref={cvRef} style={{width:"100%"}}/>
                      </div>
                    </>
                  )}
                </>
              )}

              {dashSub==="lifetime" && (
                <>
                  <div style={{fontSize:10,color:"#888",marginBottom:6}}>列タップでソート　行タップで詳細</div>
                  {/* 色凡例 */}
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    {[["#ffd700","最高"],["#f39c12","良"],["#9b59b6","平均"],["#3498db","要改善"]].map(([col,label])=>(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:3}}>
                        <span style={{width:10,height:10,borderRadius:"50%",background:col,display:"inline-block"}}/>
                        <span style={{fontSize:9,color:"#666"}}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 比較テーブル（上に移動） */}
                  <div style={S.card({padding:"8px 6px"})}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,whiteSpace:"nowrap"}}>
                        <thead>
                          <tr>
                            <th style={{color:"#666",fontWeight:400,padding:"5px 4px",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,0.1)",fontSize:10}}>名前</th>
                            {sortTh("games","回数")}
                            {sortTh("sc","スコア")}
                            {sortTh("avgRank","平均順位")}
                            {sortTh("topRate","トップ%")}
                            {sortTh("renRate","連対%")}
                            {sortTh("lastRate","ラスト%")}
                            {sortTh("r1","1位")}
                            {sortTh("r2","2位")}
                            {sortTh("r3","3位")}
                            {sortTh("r4","4位")}
                            {sortTh("yakuman","役満")}
                          </tr>
                        </thead>
                        <tbody>
                          {liSorted.map((p,i)=>(
                            <tr key={p.id} onClick={()=>setLifeDetail(lifeDetail===p.id?null:p.id)}
                              style={{cursor:"pointer",background:lifeDetail===p.id?"rgba(231,76,60,0.08)":i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                              <td style={{padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:11}}>{RI[i]||"—"}</span>
                                  <Av m={gm(p.id)} sz={18}/>
                                  <span style={{fontSize:12,fontWeight:500}}>{p.name}</span>
                                </div>
                              </td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#aaa"}}>{p.games}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:cc(p.sc),fontWeight:"bold"}}>{fw(p.sc)}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:avgRankCol(p.avgRank)}}>{p.avgRank.toFixed(2)}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:topRateCol(p.topRate)}}>{p.topRate}%</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:renRateCol(p.renRate)}}>{p.renRate}%</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:lastRateCol(p.lastRate)}}>{p.lastRate}%</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#f39c12"}}>{p.r1}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#aaa"}}>{p.r2}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#888"}}>{p.r3}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#e74c3c"}}>{p.r4}</td>
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:"#ffd700",fontWeight:p.yakuman>0?"bold":"normal"}}>{p.yakuman}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 詳細カード（行タップで表示） */}
                  {lifeDetail && (() => {
                    const p = liSorted.find(x=>x.id===lifeDetail);
                    const i = liSorted.indexOf(p);
                    if (!p) return null;
                    return (
                      <div style={{...S.card({background:i===0?"linear-gradient(135deg,rgba(231,76,60,0.15),rgba(192,57,43,0.08))":"rgba(255,255,255,0.05)",border:`1px solid ${i===0?"rgba(231,76,60,0.5)":"rgba(255,255,255,0.15)"}`})}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                          <div style={{fontSize:22}}>{RI[i]||"—"}</div>
                          <Av m={gm(p.id)} sz={44}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,fontWeight:700}}>{p.name}</div>
                            <div style={{fontSize:11,color:"#888"}}>{p.games}半荘</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:18,fontWeight:"bold",color:cc(p.sc)}}>{fw(p.sc)}</div>
                            <div style={{fontSize:10,color:"#888"}}>累計スコア</div>
                          </div>
                          <button onClick={()=>setLifeDetail(null)} style={{padding:"3px 7px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.1)",color:"#aaa",cursor:"pointer",fontSize:12}}>✕</button>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:6}}>
                          {[
                            ["平均順位", p.avgRank.toFixed(2)+"位", avgRankCol(p.avgRank), [...liSorted].sort((a,b)=>a.avgRank-b.avgRank).findIndex(x=>x.id===p.id)+1],
                            ["トップ率", p.topRate+"%", topRateCol(p.topRate), [...liSorted].sort((a,b)=>b.topRate-a.topRate).findIndex(x=>x.id===p.id)+1],
                            ["連対率",   p.renRate+"%", renRateCol(p.renRate), [...liSorted].sort((a,b)=>b.renRate-a.renRate).findIndex(x=>x.id===p.id)+1],
                            ["ラスト率", p.lastRate+"%", lastRateCol(p.lastRate), [...liSorted].sort((a,b)=>a.lastRate-b.lastRate).findIndex(x=>x.id===p.id)+1],
                          ].map(([label,val,col,rank])=>(
                            <div key={label} style={{background:"rgba(255,255,255,0.05)",borderRadius:7,padding:"7px 4px",textAlign:"center"}}>
                              <div style={{fontSize:15,fontWeight:"bold",color:col}}>{val}</div>
                              <div style={{fontSize:9,color:"#666",marginTop:2}}>{label}</div>
                              <div style={{fontSize:9,color:rank===1?"#ffd700":"#555",marginTop:2,fontWeight:rank===1?700:400}}>
                                {rank===1?"👑":""}{rank}位 / {liSorted.length}人
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3}}>
                          {[
                            [p.r1,"1位","#f39c12",[...liSorted].sort((a,b)=>b.r1-a.r1).findIndex(x=>x.id===p.id)+1],
                            [p.r2,"2位","#aaa",[...liSorted].sort((a,b)=>b.r2-a.r2).findIndex(x=>x.id===p.id)+1],
                            [p.r3,"3位","#888",[...liSorted].sort((a,b)=>b.r3-a.r3).findIndex(x=>x.id===p.id)+1],
                            [p.r4,"4位","#e74c3c",[...liSorted].sort((a,b)=>b.r4-a.r4).findIndex(x=>x.id===p.id)+1],
                            [p.yakuman,"役満","#ffd700",[...liSorted].sort((a,b)=>b.yakuman-a.yakuman).findIndex(x=>x.id===p.id)+1],
                          ].map(([cnt,label,col,rank])=>(
                            <div key={label} style={{background:label==="役満"?"rgba(255,215,0,0.08)":"rgba(255,255,255,0.03)",border:label==="役満"?"1px solid rgba(255,215,0,0.3)":"none",borderRadius:6,padding:"6px 3px",textAlign:"center"}}>
                              <div style={{fontSize:14,fontWeight:"bold",color:col}}>{cnt}回</div>
                              <div style={{fontSize:9,color:"#555"}}>{label}</div>
                              <div style={{fontSize:9,color:rank===1?"#ffd700":"#555",marginTop:1,fontWeight:rank===1?700:400}}>
                                {rank===1?"👑":""}{rank}位
                              </div>
                            </div>
                          ))}
                        </div>
                        {p.dealInCount > 0 && (
                          <div style={{marginTop:6,background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.5)",borderRadius:7,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div style={{fontSize:11,color:"#e74c3c",fontWeight:600}}>💀 開放立直振込</div>
                            <div style={{fontSize:13,fontWeight:"bold",color:"#e74c3c"}}>
                              {p.dealInCount}回
                              <span style={{fontSize:11,color:"#aaa",marginLeft:6}}>({p.dealInRate}% / {p.games}半荘)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              {dashSub==="h2h" && (() => {
                // 2人選択UI
                const selectRow = (label, val, setter, exclude) => (
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:"#888",marginBottom:5}}>{label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4}}>
                      {members.filter(m=>m.id!==exclude).map(m=>{
                        const on = val===m.id;
                        return (
                          <div key={m.id} onClick={()=>{setter(on?null:m.id);setLast10Mode(false);setLast10Revealed({});}}
                            style={{borderRadius:8,padding:"6px 4px",textAlign:"center",cursor:"pointer",
                              border:on?"2px solid #e74c3c":"1px solid rgba(255,255,255,0.15)",
                              background:on?"rgba(231,76,60,0.15)":"rgba(255,255,255,0.04)"}}>
                            <Av m={m} sz={28}/>
                            <div style={{fontSize:11,marginTop:3,color:on?"#fff":"#aaa"}}>{m.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );

                // 対人成績計算
                let h2hStats = null;
                if (h2hA && h2hB) {
                  const mA = gm(h2hA), mB = gm(h2hB);
                  const sidA = String(h2hA), sidB = String(h2hB);
                  let togames=0, aWins=0, bWins=0, aSc=0, bSc=0;
                  let aR1=0,aR2=0,aR3=0,aR4=0, bR1=0,bR2=0,bR3=0,bR4=0;
                  const history = [];

                  sessions.forEach(s => {
                    const sMembers = s.members.map(Number);
                    if (!sMembers.includes(h2hA) || !sMembers.includes(h2hB)) return;
                    s.rounds.forEach(r => {
                      const rPlayers = r.players.map(Number);
                      if (!rPlayers.includes(h2hA) || !rPlayers.includes(h2hB)) return;
                      const va = N(r.scores[sidA] ?? r.scores[h2hA]);
                      const vb = N(r.scores[sidB] ?? r.scores[h2hB]);
                      togames++;
                      aSc += va; bSc += vb;
                      if (va > vb) aWins++; else if (vb > va) bWins++;
                      // 順位
                      const sorted = [...rPlayers].sort((x,y)=>N(r.scores[String(y)]??r.scores[y])-N(r.scores[String(x)]??r.scores[x]));
                      const rankA = sorted.indexOf(h2hA)+1, rankB = sorted.indexOf(h2hB)+1;
                      if(rankA===1)aR1++; else if(rankA===2)aR2++; else if(rankA===3)aR3++; else aR4++;
                      if(rankB===1)bR1++; else if(rankB===2)bR2++; else if(rankB===3)bR3++; else bR4++;
                      history.push({ date:s.date, va, vb, rankA, rankB });
                    });
                  });

                  h2hStats = { mA, mB, togames, aWins, bWins, aSc, bSc, aR1,aR2,aR3,aR4, bR1,bR2,bR3,bR4, history };
                }

                const Bar = ({aVal, bVal, aCol="#e74c3c", bCol="#3498db"}) => {
                  const total = aVal + bVal || 1;
                  const aW = Math.round(aVal/total*100);
                  return (
                    <div style={{display:"flex",borderRadius:6,overflow:"hidden",height:12}}>
                      <div style={{width:`${aW}%`,background:aCol,transition:"width 0.3s"}}/>
                      <div style={{flex:1,background:bCol}}/>
                    </div>
                  );
                };

                return (
                  <>
                    <div style={{fontSize:10,color:"#888",marginBottom:8}}>同卓時の対戦成績を比較します</div>

                    {/* 選手選択 */}
                    <div style={S.card()}>
                      <div style={{fontSize:11,color:"#ccc",marginBottom:8}}>👥 比較する2人を選択</div>
                      <div style={{display:"flex",gap:10}}>
                        {selectRow("選手A", h2hA, setH2hA, h2hB)}
                        <div style={{display:"flex",alignItems:"center",fontSize:18,color:"#555",paddingTop:20}}>⚔️</div>
                        {selectRow("選手B", h2hB, setH2hB, h2hA)}
                      </div>
                    </div>

                    {/* 結果表示 */}
                    {h2hStats && h2hStats.togames > 0 && (() => {
                      const { mA, mB, togames, aWins, bWins, aSc, bSc, aR1,aR2,aR3,aR4, bR1,bR2,bR3,bR4, history } = h2hStats;
                      const diff = aSc - bSc;
                      return (
                        <>
                          {/* メイン比較カード */}
                          <div style={S.card({background:"rgba(255,255,255,0.04)"})}>
                            <div style={{fontSize:11,color:"#888",textAlign:"center",marginBottom:10}}>同卓 {togames}半荘</div>

                            {/* アバター比較 */}
                            <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:14}}>
                              <div style={{flex:1,textAlign:"center"}}>
                                <Av m={mA} sz={48}/>
                                <div style={{fontSize:13,fontWeight:600,marginTop:5}}>{mA?.name}</div>
                                <div style={{fontSize:20,fontWeight:"bold",color:aSc>=bSc?"#2ecc71":"#e74c3c",marginTop:3}}>{fw(aSc)}</div>
                                <div style={{fontSize:11,color:"#888"}}>累計スコア</div>
                              </div>
                              <div style={{textAlign:"center",padding:"0 8px"}}>
                                <div style={{fontSize:11,color:"#666",marginBottom:4}}>スコア差</div>
                                <div style={{fontSize:16,fontWeight:"bold",color:diff>=0?"#2ecc71":"#e74c3c"}}>{fw(diff)}</div>
                              </div>
                              <div style={{flex:1,textAlign:"center"}}>
                                <Av m={mB} sz={48}/>
                                <div style={{fontSize:13,fontWeight:600,marginTop:5}}>{mB?.name}</div>
                                <div style={{fontSize:20,fontWeight:"bold",color:bSc>=aSc?"#2ecc71":"#e74c3c",marginTop:3}}>{fw(bSc)}</div>
                                <div style={{fontSize:11,color:"#888"}}>累計スコア</div>
                              </div>
                            </div>

                            {/* 勝敗バー */}
                            <div style={{marginBottom:12}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:12,fontWeight:"bold",color:"#e74c3c"}}>{aWins}勝</span>
                                <span style={{fontSize:11,color:"#666"}}>勝敗（スコア上位）</span>
                                <span style={{fontSize:12,fontWeight:"bold",color:"#3498db"}}>{bWins}勝</span>
                              </div>
                              <Bar aVal={aWins} bVal={bWins}/>
                            </div>

                            {/* 着順比較 */}
                            <div style={{fontSize:11,color:"#ccc",marginBottom:6}}>📊 着順内訳</div>
                            {[["1位","#f39c12",aR1,bR1],["2位","#aaa",aR2,bR2],["3位","#888",aR3,bR3],["4位","#e74c3c",aR4,bR4]].map(([label,col,av,bv])=>(
                              <div key={label} style={{marginBottom:6}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                  <span style={{fontSize:11,color:col,fontWeight:"bold"}}>{av}回</span>
                                  <span style={{fontSize:10,color:"#555"}}>{label}</span>
                                  <span style={{fontSize:11,color:col,fontWeight:"bold"}}>{bv}回</span>
                                </div>
                                <Bar aVal={av} bVal={bv} aCol="#e74c3c" bCol="#3498db"/>
                              </div>
                            ))}

                            {/* 率比較 */}
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
                              {[
                                ["トップ率",togames?Math.round(aR1/togames*100):0,togames?Math.round(bR1/togames*100):0],
                                ["連対率",togames?Math.round((aR1+aR2)/togames*100):0,togames?Math.round((bR1+bR2)/togames*100):0],
                                ["ラスト率",togames?Math.round(aR4/togames*100):0,togames?Math.round(bR4/togames*100):0],
                              ].map(([label,av,bv])=>(
                                <div key={label} style={{background:"rgba(255,255,255,0.04)",borderRadius:7,padding:"7px 5px",textAlign:"center"}}>
                                  <div style={{fontSize:9,color:"#666",marginBottom:4}}>{label}</div>
                                  <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
                                    <span style={{fontSize:13,fontWeight:"bold",color:"#e74c3c"}}>{av}%</span>
                                    <span style={{fontSize:9,color:"#555"}}>vs</span>
                                    <span style={{fontSize:13,fontWeight:"bold",color:"#3498db"}}>{bv}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 対戦履歴 */}
                          <div style={S.card()}>
                            <div style={{fontSize:11,color:"#ccc",marginBottom:7}}>📅 半荘別履歴（全{history.length}戦）</div>
                            {[...history].reverse().map((h,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                                <div style={{fontSize:10,color:"#666",width:56}}>{h.date.slice(5)}</div>
                                <div style={{textAlign:"right",flex:1}}>
                                  <span style={{fontSize:13,fontWeight:"bold",color:h.va>=h.vb?"#2ecc71":"#e74c3c"}}>{fw(h.va)}</span>
                                  <span style={{fontSize:9,color:"#555",marginLeft:3}}>{RI[h.rankA-1]}</span>
                                </div>
                                <div style={{fontSize:10,color:"#555"}}>vs</div>
                                <div style={{textAlign:"left",flex:1}}>
                                  <span style={{fontSize:9,color:"#555",marginRight:3}}>{RI[h.rankB-1]}</span>
                                  <span style={{fontSize:13,fontWeight:"bold",color:h.vb>=h.va?"#2ecc71":"#e74c3c"}}>{fw(h.vb)}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 過去10戦ゲームモード */}
                          {history.length > 0 && (() => {
                            const allHistory = [...history];
                            // ランダムに10戦選ぶ
                            const shuffled = allHistory.sort(()=>Math.random()-0.5);
                            const last10 = shuffled.slice(0, Math.min(10, shuffled.length));
                            const isPlaying = last10Mode;
                            const revealed = last10Revealed;
                            const allRevealed = last10.every((_,i)=>revealed[i]);
                            const aWins10 = last10.filter((_,i)=>revealed[i]&&last10[i].va>last10[i].vb).length;
                            const bWins10 = last10.filter((_,i)=>revealed[i]&&last10[i].vb>last10[i].va).length;
                            return (
                              <div style={{...S.card({background:"linear-gradient(135deg,rgba(231,76,60,0.08),rgba(52,152,219,0.08))",border:"1px solid rgba(255,255,255,0.15)"})}}>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isPlaying?12:0}}>
                                  <div>
                                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>🎲 ランダム{Math.min(10,last10.length)}戦で勝負する</div>
                                    {isPlaying&&<div style={{fontSize:10,color:"#888",marginTop:2}}>タップで結果をめくる</div>}
                                  </div>
                                  <button onClick={()=>{
                                    if(isPlaying){ setLast10Mode(false); setLast10Revealed({}); }
                                    else { setLast10Mode(true); setLast10Revealed({}); setLast10Seed(Date.now()); }
                                  }} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:"bold",fontSize:12,
                                    background:isPlaying?"rgba(255,255,255,0.1)":"linear-gradient(135deg,#e74c3c,#3498db)",color:"#fff"}}>
                                    {isPlaying?"やめる":"START ▶"}
                                  </button>
                                </div>

                                {isPlaying && (
                                  <>
                                    {/* 対戦カード */}
                                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                                      {last10.map((h,i)=>{
                                        const isRev = !!revealed[i];
                                        const aWin = h.va > h.vb;
                                        return (
                                          <div key={i} onClick={()=>!isRev&&setLast10Revealed(prev=>({...prev,[i]:true}))}
                                            style={{borderRadius:9,overflow:"hidden",cursor:isRev?"default":"pointer",
                                              border:`1px solid ${isRev?(aWin?"rgba(231,76,60,0.4)":"rgba(52,152,219,0.4)"):"rgba(255,255,255,0.12)"}`,
                                              background:isRev?(aWin?"rgba(231,76,60,0.08)":"rgba(52,152,219,0.08)"):"rgba(255,255,255,0.04)"}}>
                                            {!isRev ? (
                                              <div style={{padding:"14px 12px",textAlign:"center"}}>
                                                <div style={{fontSize:22}}>🀄</div>
                                                <div style={{fontSize:11,color:"#555",marginTop:4}}>第{i+1}戦　タップでめくる</div>
                                              </div>
                                            ) : (
                                              <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                                                <div style={{fontSize:11,color:"#666",width:36}}>第{i+1}戦</div>
                                                <div style={{flex:1,textAlign:"right"}}>
                                                  <div style={{fontSize:15,fontWeight:"bold",color:aWin?"#2ecc71":"#e74c3c"}}>{fw(h.va)}</div>
                                                  <div style={{fontSize:9,color:"#888"}}>{RI[h.rankA-1]} {h2hStats.mA?.name}</div>
                                                </div>
                                                <div style={{fontSize:13,fontWeight:700,color:aWin?"#e74c3c":"#3498db",width:36,textAlign:"center"}}>
                                                  {aWin?"勝":"負"}
                                                </div>
                                                <div style={{flex:1,textAlign:"left"}}>
                                                  <div style={{fontSize:15,fontWeight:"bold",color:aWin?"#e74c3c":"#2ecc71"}}>{fw(h.vb)}</div>
                                                  <div style={{fontSize:9,color:"#888"}}>{RI[h.rankB-1]} {h2hStats.mB?.name}</div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* 全部めくったら結果発表 */}
                                    {allRevealed && (
                                      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:10,padding:14,textAlign:"center"}}>
                                        <div style={{fontSize:13,color:"#ccc",marginBottom:10}}>🏁 過去{last10.length}戦の結果</div>
                                        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
                                          <div style={{textAlign:"center"}}>
                                            <Av m={h2hStats.mA} sz={44}/>
                                            <div style={{fontSize:13,fontWeight:600,marginTop:5}}>{h2hStats.mA?.name}</div>
                                            <div style={{fontSize:28,fontWeight:"bold",color:aWins10>=bWins10?"#2ecc71":"#e74c3c",marginTop:4}}>{aWins10}勝</div>
                                          </div>
                                          <div style={{fontSize:18,color:"#555"}}>vs</div>
                                          <div style={{textAlign:"center"}}>
                                            <Av m={h2hStats.mB} sz={44}/>
                                            <div style={{fontSize:13,fontWeight:600,marginTop:5}}>{h2hStats.mB?.name}</div>
                                            <div style={{fontSize:28,fontWeight:"bold",color:bWins10>=aWins10?"#2ecc71":"#e74c3c",marginTop:4}}>{bWins10}勝</div>
                                          </div>
                                        </div>
                                        {aWins10 !== bWins10 && (
                                          <div style={{marginTop:12,fontSize:16,fontWeight:700,color:"#ffd700"}}>
                                            🏆 {aWins10>bWins10?h2hStats.mA?.name:h2hStats.mB?.name} の勝ち！
                                          </div>
                                        )}
                                        {aWins10 === bWins10 && (
                                          <div style={{marginTop:12,fontSize:16,fontWeight:700,color:"#aaa"}}>🤝 引き分け！</div>
                                        )}
                                        <button onClick={()=>{setLast10Mode(false);setLast10Revealed({});}}
                                          style={{marginTop:14,padding:"8px 20px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.1)",color:"#aaa",cursor:"pointer",fontSize:12}}>
                                          閉じる
                                        </button>
                                      </div>
                                    )}

                                    {/* 進捗 */}
                                    {!allRevealed && (
                                      <div style={{textAlign:"center",fontSize:11,color:"#666"}}>
                                        {Object.keys(revealed).length} / {last10.length} めくり済み
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}

                    {h2hStats && h2hStats.togames === 0 && (
                      <div style={{textAlign:"center",color:"#666",padding:24,fontSize:13}}>
                        この2人が同卓した記録がありません
                      </div>
                    )}

                    {(!h2hA || !h2hB) && (
                      <div style={{textAlign:"center",color:"#555",padding:24,fontSize:12}}>
                        2人選択すると対戦成績が表示されます
                      </div>
                    )}
                  </>
                );
              })()}

              {/* 役満ギャラリー サブタブ */}
              {dashSub==="yakuman" && (() => {
                const yakumanScenes = [];
                [...sessions].reverse().forEach(s => {
                  s.rounds.forEach((r, ri) => {
                    if (!r.yakuman || r.yakuman.length === 0) return;
                    r.yakuman.forEach(pid => {
                      const m = gm(Number(pid)||pid); if (!m) return;
                      const sid = String(pid);
                      const sc = N(r.scores[sid]??r.scores[pid]);
                      const photos = (r.photos?.[sid]??r.photos?.[pid])||[];
                      const yakumanType = r.yakumanTypes?.[sid]??r.yakumanTypes?.[pid]??"";
                      yakumanScenes.push({ date:s.date, ri, m, sc, photos, yakumanType });
                    });
                  });
                });
                return (
                  <>
                    <div style={{fontSize:13,fontWeight:600,color:"#ffd700",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                      🀄 役満ギャラリー <span style={{fontSize:11,color:"#888",fontWeight:400}}>({yakumanScenes.length}件)</span>
                    </div>
                    {yakumanScenes.length === 0 ? (
                      <div style={{textAlign:"center",padding:40,color:"#555"}}>
                        <div style={{fontSize:36,marginBottom:10}}>🀄</div>
                        <div style={{fontSize:13}}>まだ役満の記録がありません</div>
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {yakumanScenes.map((scene,i)=>(
                          <div key={i} style={{background:"linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,165,0,0.05))",border:"1px solid rgba(255,215,0,0.35)",borderRadius:12,overflow:"hidden"}}>
                            {scene.photos.length > 0 ? (
                              <div style={{position:"relative"}}>
                                <div style={{display:"flex",gap:2}}>
                                  {scene.photos.map((p,pi)=><img key={pi} src={p} alt="" onClick={()=>setLb(p)} style={{flex:1,height:scene.photos.length===1?200:130,objectFit:"cover",cursor:"pointer"}}/>)}
                                </div>
                                <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.7)",borderRadius:6,padding:"3px 8px"}}>
                                  <span style={{fontSize:11,color:"#ffd700",fontWeight:600}}>{scene.date}</span>
                                </div>
                              </div>
                            ) : (
                              <div style={{background:"rgba(255,215,0,0.06)",height:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <span style={{fontSize:30}}>🀄</span>
                              </div>
                            )}
                            <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                              <Av m={scene.m} sz={40}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{scene.m?.name}</div>
                                <div style={{fontSize:12,color:"#ffd700",marginTop:1}}>
                                  🀄 役満達成！{scene.yakumanType&&<span style={{fontSize:13,fontWeight:700,marginLeft:4}}>【{scene.yakumanType}】</span>}
                                </div>
                                <div style={{fontSize:10,color:"#888",marginTop:1}}>{scene.date}　第{scene.ri+1}半荘</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:20,fontWeight:"bold",color:"#ffd700"}}>{fw(scene.sc)}</div>
                                <div style={{fontSize:10,color:"#888"}}>順位点</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          );
        })()}

        {/* ===== 💀 オープンリーチ振込ギャラリー ===== */}
        {tab==="skull" && (() => {
          const scenes = [];
          [...sessions].reverse().forEach(s => {
            s.rounds.forEach((r, ri) => {
              if (!r.openRiichi || r.openRiichi.length === 0) return;
              r.openRiichi.forEach(pid => {
                const m = gm(Number(pid)||pid); if (!m) return;
                const sid = String(pid);
                const dealedIn = r.dealIn && r.dealIn.map(Number).includes(Number(pid));
                const sc = N(r.scores[sid]??r.scores[pid]);
                const photos = (r.photos?.[sid]??r.photos?.[pid])||[];
                scenes.push({ date:s.date, ri, m, sc, photos, dealedIn });
              });
            });
          });
          const dealInScenes = scenes.filter(s=>s.dealedIn);
          const openRiichiTotal = scenes.length;
          const dealInTotal = dealInScenes.length;
          return (
            <>
              <div style={{fontSize:13,fontWeight:600,color:"#e74c3c",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                💀 オープンリーチ振込ギャラリー
              </div>
              <div style={{fontSize:10,color:"#888",marginBottom:10}}>開放立直を宣言して振り込んだ屈辱の記録</div>

              {/* 統計：プレイヤー別振込率 */}
              {dealInScenes.length > 0 && (() => {
                // プレイヤーごとの振込回数を集計
                const playerStats = {};
                dealInScenes.forEach(scene => {
                  const id = scene.m.id;
                  if (!playerStats[id]) playerStats[id] = { m: scene.m, count: 0, games: 0 };
                  playerStats[id].count++;
                });
                // 総半荘数を取得
                sessions.forEach(s => {
                  s.rounds.forEach(r => {
                    r.players.map(Number).forEach(pid => {
                      if (playerStats[pid]) playerStats[pid].games++;
                    });
                  });
                });
                return (
                  <div style={S.card({background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.2)",marginBottom:10})}>
                    <div style={{fontSize:11,color:"#ccc",marginBottom:8}}>💀 プレイヤー別振込率</div>
                    {Object.values(playerStats).sort((a,b)=>b.count-a.count).map(ps=>(
                      <div key={ps.m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        <Av m={ps.m} sz={24}/>
                        <div style={{flex:1,fontSize:12,fontWeight:500}}>{ps.m.name}</div>
                        <div style={{fontSize:13,fontWeight:"bold",color:"#e74c3c"}}>{ps.count}回</div>
                        <div style={{fontSize:11,color:"#aaa"}}>
                          {ps.games?Math.round(ps.count/ps.games*1000)/10:0}%
                          <span style={{fontSize:10,color:"#666",marginLeft:4}}>/ {ps.games}半荘</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {dealInScenes.length === 0 ? (
                <div style={{textAlign:"center",padding:40,color:"#555"}}>
                  <div style={{fontSize:36,marginBottom:10}}>💀</div>
                  <div style={{fontSize:13}}>振り込み記録がありません</div>
                  <div style={{fontSize:11,color:"#444",marginTop:4}}>開放立直で振り込んだら記録されます</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {dealInScenes.map((scene,i)=>(
                    <div key={i} style={{background:"linear-gradient(135deg,rgba(231,76,60,0.1),rgba(192,57,43,0.05))",border:"1px solid rgba(231,76,60,0.35)",borderRadius:12,overflow:"hidden"}}>
                      {scene.photos.length > 0 && (
                        <div style={{display:"flex",gap:2}}>
                          {scene.photos.map((p,pi)=><img key={pi} src={p} alt="" onClick={()=>setLb(p)} style={{flex:1,height:scene.photos.length===1?180:120,objectFit:"cover",cursor:"pointer"}}/>)}
                        </div>
                      )}
                      <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                        <Av m={scene.m} sz={40}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{scene.m?.name}</div>
                          <div style={{fontSize:12,color:"#e74c3c",marginTop:1}}>💀 開放立直で振り込み</div>
                          <div style={{fontSize:10,color:"#888",marginTop:1}}>{scene.date}　第{scene.ri+1}半荘</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:20,fontWeight:"bold",color:cc(scene.sc)}}>{fw(scene.sc)}</div>
                          <div style={{fontSize:10,color:"#888"}}>順位点</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {/* ===== CALENDAR ===== */}
        {tab==="calendar" && (
          <>
            <div style={{...S.card(),padding:9}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <button style={S.bs()} onClick={()=>{let m=calM-1,y=calY;if(m<0){m=11;y--;}setCalM(m);setCalY(y);setCalSel(null);}}>◀</button>
                <div style={{fontSize:13,fontWeight:500}}>{calY}年 {MONTHS[calM]}</div>
                <button style={S.bs()} onClick={()=>{let m=calM+1,y=calY;if(m>11){m=0;y++;}setCalM(m);setCalY(y);setCalSel(null);}}>▶</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {DOW.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#666",padding:"1px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array(new Date(calY,calM,1).getDay()).fill(null).map((_,i)=><div key={i}/>)}
                {Array(new Date(calY,calM+1,0).getDate()).fill(null).map((_,i)=>{
                  const day=i+1, ds=`${calY}-${String(calM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const ss=sessions.filter(s=>s.date===ds);
                  const now=new Date(), isT=now.getFullYear()===calY&&now.getMonth()===calM&&now.getDate()===day;
                  const isSel=calSel===ds;
                  let winner=null, hasYakuman=false;
                  if (ss.length) {
                    const s=ss[0], tot=calcTotals(s);
                    const wid=s.members.slice().sort((a,b)=>(tot[b]?.sc||0)-(tot[a]?.sc||0))[0];
                    winner=gm(wid);
                    hasYakuman=s.rounds.some(r=>r.yakuman&&r.yakuman.length>0);
                  }
                  return (
                    <div key={day} onClick={()=>setCalSel(calSel===ds?null:ds)} style={{borderRadius:5,padding:"3px 1px",textAlign:"center",cursor:"pointer",minHeight:44,
                      background:isSel?"rgba(231,76,60,0.2)":hasYakuman?"rgba(255,215,0,0.12)":ss.length?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.03)",
                      border:isSel?"1px solid #e74c3c":hasYakuman?"1px solid rgba(255,215,0,0.6)":ss.length?"1px solid rgba(231,76,60,0.3)":isT?"1px solid rgba(52,152,219,0.5)":"1px solid rgba(255,255,255,0.05)"}}>
                      <div style={{fontSize:10,fontWeight:isT?"bold":"normal",color:isT?"#7fb9e0":"#ccc"}}>{day}</div>
                      {winner&&<><div style={{marginTop:1}}><Av m={winner} sz={16}/></div><div style={{fontSize:8,color:hasYakuman?"#ffd700":"#e74c3c"}}>{hasYakuman?"役満🀄":`${ss.length}試`}</div></>}
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:9,color:"#555",marginTop:6}}>🔴対局あり　🟡役満　タップで詳細</div>
            </div>
            {calSel && (() => {
              const ss = sessions.filter(s=>s.date===calSel);
              if (!ss.length) return <div style={{color:"#555",fontSize:12,textAlign:"center",padding:12}}>記録なし</div>;
              return ss.map(s => {
                const tot=calcTotals(s), mems=s.members.map(id=>gm(id)).filter(Boolean);
                const sorted2=[...mems].sort((a,b)=>(tot[b.id]?.sc||0)-(tot[a.id]?.sc||0));
                return (
                  <div key={s.id} style={S.card()}>
                    <div style={{fontSize:11,fontWeight:500,color:"#ccc",marginBottom:7}}>📅 {s.date}（{s.rounds.length}半荘）</div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      {sorted2.map((m,i)=>{ const t=tot[m.id]||{}; return (
                        <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:i===0?"rgba(231,76,60,0.1)":"rgba(255,255,255,0.03)",borderRadius:7}}>
                          <div style={{fontSize:16,width:22,textAlign:"center"}}>{RI[i]}</div>
                          <Av m={m} sz={28}/>
                          <div style={{flex:1,fontSize:13,fontWeight:500}}>{m.name}</div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:14,fontWeight:"bold",color:cc(t.sc||0)}}>{fw(t.sc||0)}</div>
                            <div style={{fontSize:10,color:cc(t.kati||0)}}>勝{fwy(t.kati||0)}</div>
                          </div>
                        </div>
                      );})}
                    </div>
                  </div>
                );
              });
            })()}
          </>
        )}

        {/* ===== HISTORY ===== */}
        {tab==="history" && (
          <>
            {!sessions.length
              ? <div style={{color:"#888",textAlign:"center",padding:30}}>まだ記録がありません</div>
              : [...sessions].sort((a,b)=>b.date.localeCompare(a.date)).map(s => {
                const tot=calcTotals(s), mems=s.members.map(id=>gm(id)).filter(Boolean);
                const rL=SCORE_RATES.find(r=>r.val===s.rules.scoreRate)?.label.split("（")[0]||"";
                const isOpen=histOpen[s.id];
                const sortedMems=[...mems].sort((a,b)=>(tot[b.id]?.sc||0)-(tot[a.id]?.sc||0));
                return (
                  <div key={s.id} style={S.card()}>
                    {/* 削除確認 */}
                    {deleteConfirm === s.id && (
                      <div style={{background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.4)",borderRadius:8,padding:10,marginBottom:8,textAlign:"center"}}>
                        <div style={{fontSize:12,color:"#fff",marginBottom:8}}>⚠️ この対戦記録を削除しますか？</div>
                        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                          <button style={S.br({fontSize:12,padding:"6px 14px"})} onClick={()=>deleteSession(s.id)}>削除する</button>
                          <button style={S.bg({fontSize:12})} onClick={()=>setDeleteConfirm(null)}>キャンセル</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isOpen?10:0}}>
                      <div onClick={()=>setHistOpen(prev=>({...prev,[s.id]:!isOpen}))} style={{cursor:"pointer",flex:1,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontWeight:500,fontSize:12,color:"#ccc"}}>📅 {s.date}（{s.rounds.length}半荘）</span>
                        <span style={{fontSize:10,color:"#555"}}>{rL}</span>
                        <span style={{fontSize:14,color:"#888",marginLeft:"auto"}}>{isOpen?"▲":"▼"}</span>
                      </div>
                      <div style={{display:"flex",gap:4,marginLeft:8}}>
                        <button onClick={e=>{e.stopPropagation();setEditSession(JSON.parse(JSON.stringify(s)));}} style={S.bs({fontSize:11,color:"#7fb9e0"})}>✏️ 編集</button>
                        <button onClick={e=>{e.stopPropagation();setDeleteConfirm(s.id);}} style={S.bs({fontSize:11,color:"#e74c3c"})}>🗑️</button>
                      </div>
                    </div>
                    {!isOpen && (
                      <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:6}}>
                        {sortedMems.map((m,i)=>(
                          <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 7px",background:i===0?"rgba(231,76,60,0.08)":"rgba(255,255,255,0.03)",borderRadius:6}}>
                            <span style={{fontSize:12,width:20,textAlign:"center"}}>{RI[i]||`${i+1}位`}</span>
                            <Av m={m} sz={22}/>
                            <div style={{fontSize:12,fontWeight:500,flex:1}}>{m.name}</div>
                            <div style={{fontSize:13,fontWeight:"bold",color:cc(tot[m.id]?.sc||0)}}>{fw(tot[m.id]?.sc||0)}</div>
                            <div style={{fontSize:11,color:"#888"}}>chip{fw(tot[m.id]?.chip||0)}</div>
                            <div style={{fontSize:11,fontWeight:"bold",color:cc(tot[m.id]?.kati||0)}}>{fwy(tot[m.id]?.kati||0)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isOpen && (
                      <>
                        {s.rounds.map((r,ri)=>{
                          const sortedPl=[...r.players].sort((a,b)=>N(r.scores[String(b)]??r.scores[b])-N(r.scores[String(a)]??r.scores[a]));
                          return (
                            <div key={ri} style={{background:"rgba(0,0,0,0.18)",borderRadius:7,padding:6,marginBottom:5}}>
                              <div style={{fontSize:10,color:"#888",marginBottom:4}}>第{ri+1}半荘</div>
                              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                {sortedPl.map((pid,rank)=>{
                                  const m=gm(pid); if(!m) return null;
                                  const sc2=N(r.scores[String(pid)]??r.scores[pid]);
                                  const ph=(r.photos?.[String(pid)]??r.photos?.[pid])||[];
                                  const isYakuman=r.yakuman&&(r.yakuman.map(Number).includes(Number(pid)));
                                  return (
                                    <div key={pid} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",background:rank===0?"rgba(231,76,60,0.1)":"rgba(255,255,255,0.03)",borderRadius:6}}>
                                      <span style={{fontSize:14,width:22,textAlign:"center"}}>{RI[rank]||"—"}</span>
                                      <Av m={m} sz={24}/>
                                      <div style={{fontSize:12,fontWeight:500,flex:1}}>
                                        {m.name}{isYakuman&&<span style={{fontSize:10,color:"#ffd700",marginLeft:4}}>役満🀄</span>}
                                      </div>
                                      <div style={{fontSize:15,fontWeight:"bold",color:cc(sc2)}}>{fw(sc2)}</div>
                                      {ph.length>0&&(
                                        <div style={{display:"flex",gap:2}}>
                                          {ph.map((p,i)=><img key={i} src={p} alt="" onClick={e=>{e.stopPropagation();setLb(p);}} style={{width:40,height:40,borderRadius:5,objectFit:"cover",cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)"}}/>)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {mems.filter(m=>!r.players.map(Number).includes(m.id)).map(m=>(
                                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 8px",opacity:0.35}}>
                                    <span style={{fontSize:14,width:22,textAlign:"center"}}>💤</span>
                                    <Av m={m} sz={24}/>
                                    <div style={{fontSize:12,color:"#555",flex:1}}>{m.name}（抜け番）</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div style={{fontSize:10,color:"#888",margin:"8px 0 4px"}}>📊 この日の合計</div>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          {sortedMems.map((m,i)=>(
                            <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 9px",background:i===0?"rgba(231,76,60,0.1)":"rgba(52,152,219,0.07)",borderRadius:7}}>
                              <Av m={m} sz={26}/>
                              <div style={{fontSize:12,fontWeight:500,flex:1}}>{m.name}</div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:14,fontWeight:"bold",color:cc(tot[m.id]?.sc||0)}}>{fw(tot[m.id]?.sc||0)}</div>
                                <div style={{fontSize:10,color:"#888"}}>chip {fw(tot[m.id]?.chip||0)}</div>
                              </div>
                              <div style={{textAlign:"right",minWidth:78}}>
                                <div style={{fontSize:11,color:cc(tot[m.id]?.seisan||0)}}>清算{fwy(tot[m.id]?.seisan||0)}</div>
                                <div style={{fontSize:11,fontWeight:"bold",color:cc(tot[m.id]?.kati||0)}}>勝{fwy(tot[m.id]?.kati||0)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </>
        )}

        {/* ===== ADD ===== */}
        {tab==="add" && (
          <>
            {addStep===0 && (
              <div style={S.card()}>
                <div style={{fontSize:13,fontWeight:500,color:"#ccc",marginBottom:10}}>⚙️ ルール設定</div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>日付</div>
                  <input type="date" value={addDate} onChange={e=>setAddDate(e.target.value)} style={{...S.inp({maxWidth:160})}}/>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>レート</div>
                  <select value={addRules.scoreRate} onChange={e=>setAddRules(r=>({...r,scoreRate:Number(e.target.value)}))} style={S.sel()}>
                    {SCORE_RATES.map(r=><option key={r.val} value={r.val}>{r.label}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>ウマ（1〜4位）</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
                    {[0,1,2,3].map(i=>(
                      <div key={i}>
                        <div style={{fontSize:10,color:"#666",marginBottom:2}}>{i+1}位</div>
                        <input type="text" inputMode="decimal" value={addRules.uma[i]}
                          onChange={e=>{const u=[...addRules.uma];u[i]=e.target.value;setAddRules(r=>({...r,uma:u}));}}
                          style={S.inp({textAlign:"center"})}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,color:"#888",marginBottom:3}}>返し点</div>
                    <input type="text" inputMode="decimal" value={addRules.kaeshi} onChange={e=>setAddRules(r=>({...r,kaeshi:N(e.target.value)}))} style={S.inp()}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#888",marginBottom:3}}>配給原点</div>
                    <input type="text" inputMode="decimal" value={addRules.starting} onChange={e=>setAddRules(r=>({...r,starting:N(e.target.value)}))} style={S.inp()}/>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>チップレート（円/枚）</div>
                  <input type="text" inputMode="decimal" value={addRules.chipRate} onChange={e=>setAddRules(r=>({...r,chipRate:N(e.target.value)}))} style={S.inp()}/>
                </div>
                <div style={{background:"rgba(52,152,219,0.08)",border:"1px solid rgba(52,152,219,0.2)",borderRadius:7,padding:8,marginBottom:10,fontSize:11,color:"#888"}}>
                  💡 順位点を直接入力<br/>
                  <span style={{fontSize:10,color:"#7fb9e0"}}>3人入力 → 残り1人を自動計算（合計ゼロ）</span>
                </div>
                <button style={S.br()} onClick={()=>setAddStep(1)}>▶ メンバー選択へ</button>
              </div>
            )}

            {addStep===1 && (
              <div style={S.card()}>
                <div style={{fontSize:13,fontWeight:500,color:"#ccc",marginBottom:8}}>👥 本日の参加メンバー（{addSel.length}人）</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10}}>
                  {members.map(m=>{
                    const on=addSel.includes(m.id);
                    return (
                      <div key={m.id} onClick={()=>setAddSel(p=>on?p.filter(x=>x!==m.id):[...p,m.id])}
                        style={{borderRadius:9,padding:"9px 6px",textAlign:"center",cursor:"pointer",border:on?"2px solid #e74c3c":"1px solid rgba(255,255,255,0.15)",background:on?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.04)"}}>
                        <Av m={m} sz={38}/>
                        <div style={{fontSize:12,marginTop:4,color:on?"#fff":"#aaa",fontWeight:on?500:400}}>{m.name}</div>
                        <div style={{fontSize:10,color:on?"#e74c3c":"#444"}}>{on?"✔":"—"}</div>
                      </div>
                    );
                  })}
                </div>
                {addSel.length<4 && <div style={{color:"#e74c3c",fontSize:11,marginBottom:7}}>4人以上選択してください</div>}
                {is5 && <div style={{color:"#f39c12",fontSize:11,marginBottom:7}}>✅ {addSel.length}人参加 — 点数を入れた4人が対局、空欄が抜け番扱いになります</div>}
                <div style={{display:"flex",gap:6}}>
                  <button style={S.bg()} onClick={()=>setAddStep(0)}>← 戻る</button>
                  <button style={{...S.br({opacity:addSel.length<4?0.4:1})}} disabled={addSel.length<4} onClick={startAdd}>▶ 対局開始</button>
                </div>
              </div>
            )}

            {addStep===2 && (
              <>
                <div style={{fontSize:10,color:"#888",marginBottom:7,background:"rgba(255,255,255,0.04)",borderRadius:7,padding:7}}>
                  📅 {addDate}　ウマ: {addRules.uma.join("/")}　{SCORE_RATES.find(r=>r.val===addRules.scoreRate)?.label.split("（")[0]}
                </div>
                {addRounds.map((r,ri)=><ConfirmedRound key={ri} r={r} ri={ri} sessMembers={addSel}/>)}
                <div style={S.card({borderColor:"rgba(231,76,60,0.4)"})}>
                  <div style={{fontSize:12,color:"#ccc",marginBottom:8}}>第{addRounds.length+1}半荘</div>
                  {(() => {
                    const filledCount = addSel.filter(id=>String(rpSc[id]||"").trim()!=="").length;
                    return (
                      <>
                        <div style={{fontSize:10,color:"#7fb9e0",marginBottom:8,background:"rgba(52,152,219,0.08)",borderRadius:6,padding:6}}>
                          📌 対局した4人の順位点を入力（空欄=抜け番）<br/>
                          <span style={{fontSize:9,color:"#666"}}>3人入力で残り1人を自動計算（空欄が1人のとき）</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:8}}>
                          {addSel.map(id=>{
                            const m=gm(id); if(!m) return null;
                            const v=String(rpSc[id]||"");
                            const isAuto=rpAutoId===id;
                            const hasV=v.trim()!=="";
                            const isActive=rpActive===id;
                            const ph=rpPhotos[id]||[];
                            const othersFilled = addSel.filter(oid => oid !== id && String(rpSc[oid]||"").trim() !== "").length === 3;
                            const showAutoBtn = !hasV && othersFilled;
                            return (
                              <div key={id} style={{borderRadius:9,background:hasV?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.02)",border:`2px solid ${isActive?"#e74c3c":isAuto?"rgba(52,152,219,0.5)":hasV?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)"}`,padding:8}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                                  <Av m={m} sz={28}/>
                                  <div>
                                    <div style={{fontSize:12,fontWeight:500}}>{m.name}</div>
                                    {isAuto&&<div style={{fontSize:9,color:"#3498db"}}>🔵 自動計算</div>}
                                    {!hasV&&<div style={{fontSize:9,color:"#555"}}>未入力</div>}
                                  </div>
                                </div>
                                {showAutoBtn ? (
                                  <button onClick={()=>autoCalc(id)} style={{width:"100%",padding:"10px 6px",borderRadius:7,border:"none",background:"rgba(52,152,219,0.25)",color:"#7fb9e0",cursor:"pointer",fontWeight:"bold",fontSize:13,marginBottom:4}}>
                                    🔄 自動計算
                                  </button>
                                ) : (
                                  <div onClick={()=>{ if(isAuto){setRpAutoId(null);setRpActive(id);} else setRpActive(isActive?null:id); }}
                                    style={{textAlign:"center",padding:"10px 6px",borderRadius:7,cursor:"pointer",
                                      background:isActive?"rgba(231,76,60,0.12)":isAuto?"rgba(52,152,219,0.08)":hasV?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",
                                      border:isActive?"1px solid rgba(231,76,60,0.4)":isAuto?"1px solid rgba(52,152,219,0.3)":"1px solid rgba(255,255,255,0.08)",
                                      marginBottom:4}}>
                                    <div style={{fontSize:hasV?22:12,fontWeight:hasV?"bold":"normal",color:hasV?cc(N(v)):"#333",minHeight:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                      {hasV?(N(v)>=0?"+":"")+v:"タップで入力"}
                                    </div>
                                  </div>
                                )}
                                {isActive&&<Keypad value={v} onChange={val=>handleScore(id,val)}/>}
                                {/* 役満チェック + 種類入力 */}
                                <div style={{marginTop:6}}>
                                  <div onClick={()=>setRpYakuman(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
                                    style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,cursor:"pointer",background:rpYakuman.includes(id)?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.03)",border:rpYakuman.includes(id)?"1px solid rgba(255,215,0,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                                    <span style={{fontSize:14}}>{rpYakuman.includes(id)?"☑️":"⬜"}</span>
                                    <span style={{fontSize:11,color:rpYakuman.includes(id)?"#ffd700":"#666",fontWeight:rpYakuman.includes(id)?600:400}}>役満</span>
                                    {rpYakuman.includes(id)&&<span style={{fontSize:10,color:"#ffd700"}}>🀄</span>}
                                  </div>
                                  {rpYakuman.includes(id) && (
                                    <input type="text" placeholder="種類を入力（例: 四暗刻）"
                                      value={rpYakumanTypes[id]||""}
                                      onChange={e=>setRpYakumanTypes(prev=>({...prev,[id]:e.target.value}))}
                                      onClick={e=>e.stopPropagation()}
                                      style={{...S.inp({marginTop:4,fontSize:12,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.3)",color:"#ffd700"})}}/>
                                  )}
                                </div>
                                {/* 開放立直 */}
                                <div style={{marginTop:4}}>
                                  <div onClick={()=>setRpOpenRiichi(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
                                    style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,cursor:"pointer",background:rpOpenRiichi.includes(id)?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.03)",border:rpOpenRiichi.includes(id)?"1px solid rgba(52,152,219,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                                    <span style={{fontSize:14}}>{rpOpenRiichi.includes(id)?"☑️":"⬜"}</span>
                                    <span style={{fontSize:11,color:rpOpenRiichi.includes(id)?"#3498db":"#666",fontWeight:rpOpenRiichi.includes(id)?600:400}}>開放立直</span>
                                  </div>
                                  {rpOpenRiichi.includes(id) && (
                                    <div onClick={()=>setRpDealIn(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
                                      style={{display:"flex",alignItems:"center",gap:5,marginTop:3,padding:"5px 8px",borderRadius:6,cursor:"pointer",background:rpDealIn.includes(id)?"rgba(231,76,60,0.15)":"rgba(255,255,255,0.03)",border:rpDealIn.includes(id)?"1px solid rgba(231,76,60,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                                      <span style={{fontSize:14}}>{rpDealIn.includes(id)?"☑️":"⬜"}</span>
                                      <span style={{fontSize:11,color:rpDealIn.includes(id)?"#e74c3c":"#666",fontWeight:rpDealIn.includes(id)?600:400}}>💀 振り込み</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{marginTop:6}}>
                                  {ph.length > 0 && (
                                    <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap",marginBottom:4}}>
                                      {ph.map((p,i)=>(
                                        <span key={i} style={{position:"relative",display:"inline-block"}}>
                                          <img src={p} alt="" style={{width:52,height:52,borderRadius:6,objectFit:"cover",cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)"}} onClick={()=>setLb(p)}/>
                                          <span onClick={()=>setRpPhotos(prev=>{const a=[...(prev[id]||[])];a.splice(i,1);return{...prev,[id]:a};})}
                                            style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#e74c3c",color:"#fff",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>✕</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {ph.length < 3 && (
                                    <button onClick={()=>{setPhotoTgt({t:"r",id});fileRef.current.value="";fileRef.current.click();}}
                                      style={{width:"100%",padding:"7px 0",borderRadius:6,border:"1px dashed rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.03)",color:"#888",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                                      📷 <span>写真を追加（{ph.length}/3）</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {addErr&&<div style={{color:"#e74c3c",fontSize:11,marginBottom:7}}>{addErr}</div>}
                        <button style={{...S.bb({opacity:filledCount===4?1:0.4})}} disabled={filledCount!==4} onClick={confirmRound}>✔ この半荘を確定</button>
                      </>
                    );
                  })()}
                </div>
                {addRounds.length>0&&(
                  <button style={{...S.br({marginTop:2})}} onClick={()=>{setRpActive(null);setShowLivePanel(false);setAddStep(3);}}>✅ 対局終了 → 精算へ</button>
                )}
              </>
            )}

            {addStep===3 && (
              <div style={S.card()}>
                <div style={{fontSize:13,fontWeight:500,color:"#ccc",marginBottom:4}}>💴 精算入力（チップ＋場代）</div>
                <div style={{fontSize:10,color:"#888",marginBottom:10}}>チップ合計はゼロサム。3人入力で最後の1人を自動計算できます。</div>
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:10,marginBottom:12}}>
                  <div style={{fontSize:11,color:"#ccc",fontWeight:500,marginBottom:6}}>🏠 場代（割り勘）</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>合計金額（円）</div>
                      <input type="text" inputMode="decimal" placeholder="例: 2000"
                        value={bashiroTotal}
                        onChange={e=>{
                          setBashiroTotal(e.target.value);
                          const total=N(e.target.value);
                          if(total>0){
                            const perPerson=Math.ceil(total/addSel.length);
                            const newB={};
                            addSel.forEach(id=>{newB[id]=String(perPerson);});
                            setAddBashiro(newB);
                          } else {
                            setAddBashiro({});
                          }
                        }}
                        style={S.inp({fontSize:14})}/>
                    </div>
                    <div style={{textAlign:"center",paddingTop:16}}>
                      <div style={{fontSize:10,color:"#888"}}>÷ {addSel.length}人</div>
                      <div style={{fontSize:16,fontWeight:"bold",color:"#7fb9e0",marginTop:2}}>
                        {bashiroTotal&&N(bashiroTotal)>0 ? `=${Math.ceil(N(bashiroTotal)/addSel.length).toLocaleString()}円` : "—"}
                      </div>
                    </div>
                  </div>
                  {bashiroTotal&&N(bashiroTotal)>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:4}}>個別調整</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                        {addSel.map(id=>{
                          const m=gm(id); if(!m) return null;
                          return(
                            <div key={id} style={{display:"flex",alignItems:"center",gap:6}}>
                              <Av m={m} sz={22}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:10,color:"#888",marginBottom:2}}>{m.name}</div>
                                <input type="text" inputMode="decimal" value={addBashiro[id]||""}
                                  onChange={e=>setAddBashiro(p=>({...p,[id]:e.target.value}))}
                                  style={S.inp({padding:"4px 7px",fontSize:12})}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{fontSize:11,color:"#ccc",fontWeight:500,marginBottom:6}}>🎰 チップ枚数</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:10}}>
                  {addSel.map(id=>{
                    const m=gm(id); if (!m) return null;
                    let sc=0;
                    addRounds.forEach(r=>{ if(r.scores[id]!=null) sc+=N(r.scores[id]); });
                    const isCA=chipActive===id;
                    const chipVal=String(addChips[id]||"");
                    const hasChip=chipVal.trim()!=="";
                    const totalChipFilled=addSel.filter(oid=>String(addChips[oid]||"").trim()!=="").length;
                    const showChipAuto=!hasChip && totalChipFilled===3;
                    return (
                      <div key={id} style={{textAlign:"center"}}>
                        <Av m={m} sz={28}/>
                        <div style={{fontSize:12,fontWeight:500,margin:"4px 0 2px"}}>{m.name}</div>
                        <div style={{fontSize:12,fontWeight:"bold",color:cc(sc),marginBottom:6}}>{fw(sc)}</div>
                        {showChipAuto ? (
                          <button onClick={()=>{
                            setAddChips(prev => {
                              const sum = addSel.filter(oid=>oid!==id).reduce((a,oid)=>a+N(prev[oid]),0);
                              return {...prev, [id]: String(-sum)};
                            });
                            setChipActive(null);
                          }} style={{width:"100%",padding:"9px 6px",borderRadius:7,border:"none",background:"rgba(52,152,219,0.25)",color:"#7fb9e0",cursor:"pointer",fontWeight:"bold",fontSize:13,marginBottom:4}}>
                            🔄 自動計算
                          </button>
                        ) : (
                          <div onClick={()=>setChipActive(isCA?null:id)} style={{padding:"8px 6px",borderRadius:7,cursor:"pointer",background:isCA?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.06)",border:isCA?"1px solid #e74c3c":"1px solid rgba(255,255,255,0.15)",marginBottom:4,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:16,fontWeight:"bold",color:hasChip?cc(N(chipVal)):"#444"}}>
                              {hasChip?(N(chipVal)>=0?"+":"")+chipVal:"タップで入力"}
                            </span>
                          </div>
                        )}
                        {isCA&&<Keypad value={chipVal} onChange={val=>setAddChips(p=>({...p,[id]:val}))}/>}
                      </div>
                    );
                  })}
                </div>
                {(()=>{
                  const filled=addSel.filter(id=>String(addChips[id]||"").trim()!=="");
                  if(!filled.length) return null;
                  const total=filled.reduce((a,id)=>a+N(addChips[id]),0);
                  const allFilled=filled.length===addSel.length;
                  return(
                    <div style={{background:allFilled&&total!==0?"rgba(231,76,60,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${allFilled&&total!==0?"rgba(231,76,60,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"6px 10px",marginBottom:10,fontSize:11,display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#888"}}>チップ合計</span>
                      <span style={{fontWeight:"bold",color:total===0?"#2ecc71":total>0?"#f39c12":"#e74c3c"}}>
                        {fw(total)}{allFilled&&total!==0?" ⚠ ゼロになりません":""}
                      </span>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:6}}>
                  <button style={S.bg()} onClick={()=>setAddStep(2)}>← 戻る</button>
                  <button style={S.br()} onClick={()=>setAddStep(4)}>📊 集計して結果を見る</button>
                </div>
              </div>
            )}

            {addStep===4 && (() => {
              const results=addSel.map(id=>{
                const m=gm(id); let sc=0;
                addRounds.forEach(r=>{ if(r.scores[id]!=null) sc+=N(r.scores[id]); });
                const ch=N(addChips[id]), scY=sc*N(addRules.scoreRate), chY=ch*N(addRules.chipRate);
                const seisan=scY+chY, ba=N(addBashiro[id]), kati=seisan-ba;
                return{id,m,sc,chip:ch,scY,chY,seisan,ba,kati};
              }).sort((a,b)=>b.sc-a.sc);
              return (
                <>
                  <div style={{background:"rgba(52,152,219,0.08)",border:"1px solid rgba(52,152,219,0.25)",borderRadius:11,padding:11,marginBottom:9}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#7fb9e0",marginBottom:8}}>📊 {addDate} 最終結果</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {results.map((p,i)=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:i===0?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.04)",borderRadius:9}}>
                          <div style={{fontSize:20,width:26,textAlign:"center"}}>{RI[i]||"—"}</div>
                          <Av m={p.m} sz={36}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:500}}>{p.m?.name}</div>
                            <div style={{fontSize:10,color:"#666"}}>chip{fw(p.chip)} / 場{p.ba.toLocaleString()}円</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:18,fontWeight:"bold",color:cc(p.sc)}}>{fw(p.sc)}</div>
                            <div style={{fontSize:11,color:cc(p.seisan)}}>清算 {fwy(p.seisan)}</div>
                            <div style={{fontSize:11,fontWeight:"bold",color:cc(p.kati)}}>勝ち分 {fwy(p.kati)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,paddingBottom:14}}>
                    <button style={S.br()} onClick={saveSession}>💾 保存する</button>
                    <button style={S.bg()} onClick={resetAdd}>✖ 破棄</button>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* ===== MEMBERS ===== */}
        {tab==="members" && (
          <>
            {mfShow ? (
              <div style={{...S.card({borderColor:"rgba(231,76,60,0.3)"}),marginBottom:9}}>
                <div style={{fontSize:12,color:"#ccc",marginBottom:7}}>新しいメンバーを追加</div>
                <div style={{marginBottom:7}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:2}}>名前</div>
                  <input type="text" placeholder="名前" value={mfName} onChange={e=>setMfName(e.target.value)} style={S.inp({maxWidth:180})}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:3}}>写真（任意）</div>
                  {mfPhoto
                    ? <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:38,height:38,borderRadius:"50%",overflow:"hidden"}}><img src={mfPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><button style={S.bs()} onClick={()=>setMfPhoto(null)}>削除</button></div>
                    : <button style={S.bs()} onClick={()=>{setPhotoTgt({t:"np"});fileRef.current.value="";fileRef.current.click();}}>📷 選択</button>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={S.br()} onClick={async()=>{
                    if(!mfName.trim()) return;
                    const { data } = await supabase.from("members").insert({ name: mfName.trim(), photo: mfPhoto }).select().single();
                    if (data) setMembers(ms=>[...ms, data]);
                    setMfName(""); setMfPhoto(null); setMfShow(false);
                  }}>追加</button>
                  <button style={S.bg()} onClick={()=>{ setMfShow(false); setMfName(""); setMfPhoto(null); }}>キャンセル</button>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",gap:6,marginBottom:9}}>
                <button style={S.br()} onClick={()=>setMfShow(true)}>＋ メンバーを追加</button>
                <button style={{...S.bg({border:"1px solid rgba(255,255,255,0.3)",color:"#ccc"})}} onClick={async()=>{
                  // 既存のゲスト番号を確認して次の番号を決める
                  const guestNums = members
                    .filter(m=>m.name.startsWith("ゲスト"))
                    .map(m=>parseInt(m.name.replace("ゲスト",""))||0)
                    .filter(n=>!isNaN(n));
                  const nextNum = guestNums.length > 0 ? Math.max(...guestNums) + 1 : 1;
                  const guestName = `ゲスト${nextNum}`;
                  const { data } = await supabase.from("members").insert({ name: guestName, photo: null }).select().single();
                  if (data) setMembers(ms=>[...ms, data]);
                }}>👤 ゲストを追加</button>
              </div>
            )}
            {members.map(m=>(
              <div key={m.id} style={S.card({marginBottom:7})}>
                {memberEditId === m.id ? (
                  /* 編集モード */
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <Av m={m} sz={38}/>
                    <input type="text" value={memberEditName} onChange={e=>setMemberEditName(e.target.value)}
                      onKeyDown={async e=>{
                        if(e.key==="Enter"&&memberEditName.trim()){
                          await supabase.from("members").update({name:memberEditName.trim()}).eq("id",m.id);
                          setMembers(ms=>ms.map(x=>x.id===m.id?{...x,name:memberEditName.trim()}:x));
                          setMemberEditId(null);
                        }
                      }}
                      style={{...S.inp({flex:1,fontSize:14})}} autoFocus/>
                    <button style={S.br({fontSize:12,padding:"6px 12px"})} onClick={async()=>{
                      if(!memberEditName.trim()) return;
                      await supabase.from("members").update({name:memberEditName.trim()}).eq("id",m.id);
                      setMembers(ms=>ms.map(x=>x.id===m.id?{...x,name:memberEditName.trim()}:x));
                      setMemberEditId(null);
                    }}>保存</button>
                    <button style={S.bg({fontSize:12})} onClick={()=>setMemberEditId(null)}>✕</button>
                  </div>
                ) : (
                  /* 通常表示 */
                  <div style={{display:"flex",alignItems:"center",gap:9,padding:"0"}}>
                    <Av m={m} sz={38}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500}}>{m.name}</div>
                      {m.name.startsWith("ゲスト")&&<div style={{fontSize:10,color:"#888"}}>ゲスト（一時参加）</div>}
                    </div>
                    <button style={S.bs()} onClick={()=>{ setPhotoTgt({t:"p",id:m.id}); fileRef.current.value=""; fileRef.current.click(); }}>📷</button>
                    <button style={S.bs({color:"#7fb9e0"})} onClick={()=>{ setMemberEditId(m.id); setMemberEditName(m.name); }}>✏️</button>
                    {!memberDeleteStep[m.id] && (
                      <button style={S.bs({color:"#e74c3c"})} onClick={()=>setMemberDeleteStep(p=>({...p,[m.id]:1}))}>削除</button>
                    )}
                    {memberDeleteStep[m.id]===1 && (
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        <span style={{fontSize:10,color:"#e74c3c"}}>削除してよいですか？</span>
                        <button style={S.bs({color:"#e74c3c",fontSize:11})} onClick={()=>setMemberDeleteStep(p=>({...p,[m.id]:2}))}>はい</button>
                        <button style={S.bs({fontSize:11})} onClick={()=>setMemberDeleteStep(p=>({...p,[m.id]:0}))}>いいえ</button>
                      </div>
                    )}
                    {memberDeleteStep[m.id]===2 && (
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        <span style={{fontSize:10,color:"#e74c3c"}}>本当に良いですか？</span>
                        <button style={S.bs({color:"#e74c3c",fontSize:11})} onClick={async()=>{
                          await supabase.from("members").delete().eq("id", m.id);
                          setMembers(ms=>ms.filter(x=>x.id!==m.id));
                          setMemberDeleteStep(p=>({...p,[m.id]:0}));
                        }}>削除する</button>
                        <button style={S.bs({fontSize:11})} onClick={()=>setMemberDeleteStep(p=>({...p,[m.id]:0}))}>いいえ</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
