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

// 更新履歴 - 新しい機能は必ず今日の日付で追加してください
// 今日: 2026-05-11
const CHANGELOG = [
  { date:"2026-05-12", features:[
    "LINEシェア機能追加（設定タブからアプリURLをLINEで送信可能）",
    "MVP演出条件を変更（場代抜き清算額+3,000円以上 かつ 3半荘以上参加）",
    "当月MVP演出追加（炎アバター・👑王冠・金バッジ・confetti紙吹雪）",
    "月別プルダウンフィルター追加（全期間〜今月の間に月を選んで表示）",
    "操作ログ機能追加（対局の削除・編集時に操作者を記録）",
    "設定画面にJSONバックアップ書き出し機能追加（全対戦データをファイルで保存可能）",
    "ESLintエラー修正・バグ修正3件",
  ]},
  { date:"2026-05-11", features:[
    "設定ボタンに更新通知ドット追加（未読の更新があると赤く光る）",
    "履歴の場代込みバッジをタップで場代抜き金額に切り替え可能に",
    "設定画面にTリーグオフィシャルロゴ・Nerima Night Crew・Waiting for the Flow. を表示",
    "履歴表示に場代金額を追加（場代込みの対局で収支の下に場代金額を表示）",
    "履歴表示にプレイ半荘数を追加（名前の横に「(3半荘)」と表示）",
    "通信エラー時のトースト通知追加（保存成功・失敗を画面下部に表示）",
    "二重送信防止機能追加（保存ボタン連打による重複登録を防止）",
    "保存処理のエラーハンドリング強化（通信失敗時も下書きが残る仕様に）",
    "履歴表示に場代込みバッジ追加（場代が入力された対局に「場代込み」バッジ表示）",
    "履歴編集で半荘の順番を入れ替える機能追加（↑↓ボタン）",
    "履歴編集で新規半荘追加UIを対局中と同じKeypad＋自動計算に変更",
    "エラーハンドリング強化（Supabase通信エラーへの対応）",
    "履歴編集で半荘データの削除機能追加（🗑️ボタン・確認ダイアログ付き）",
    "LIVEバッジのバグ修正（保存後も消えない問題を解消）",
    "古い下書きの自動削除機能追加（今日以外の下書きは自動削除）",
  ]},
  { date:"2026-05-08", features:[
    "最高点入力モーダルのバグ修正（保存・スキップが正常に動作するように）",
    "確定済み半荘の削除機能追加（🗑️ボタン）",
    "対局中のメンバー途中参加機能追加（➕ボタン）",
    "チップ王をダッシュボードのサブタブに配置（💰 チップ王）",
    "チップ王ランキング機能追加（生涯成績にチップ収支を表示）",
    "設定タブ追加（更新履歴・アプリにする方法を統合）",
    "生涯成績の色分け基準を折りたたみ式に変更",
    "色分け基準の説明を「※全国およびMリーグ基準に基づく」に更新",
    "最高点ランキング機能追加（70以上でトップ時に持ち点を記録）",
    "確定済み半荘の編集機能追加（写真・役満・開放立直の追加が可能）",
  ]},
  { date:"2026-05-04", features:[
    "入力中データをSupabaseに自動保存（アプリを閉じても消えない・全員で共有）",
    "招待コード30日間スキップ機能追加",
    "更新履歴タブ追加（📋ボタン）",
  ]},
  { date:"2026-05-02", features:[
    "生涯成績の色分け基準を設定（黄・オレンジ・紫・青）",
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
    "編集モーダルに写真追加・レート変更・テンキー・役満チェック追加",
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
  ]},
];

const N = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
const fw = n => (n >= 0 ? "+" : "") + Math.round(n).toLocaleString();
const fwy = n => fw(n) + "円";
const cc = n => n >= 0 ? "#2ecc71" : "#e74c3c";
const mc = m => AC[(m.id - 1) % AC.length];

// 利用可能な月一覧を生成
function getMonthList(sessions) {
  const months = [...new Set(sessions.map(s => s.date.slice(0, 7)))].sort().reverse();
  return months;
}

// 当月MVP判定（閾値：純利益+3000円以上 OR 3回以上かつトータルプラス）
function calcMvpIds(sessions, members, targetMonth) {
  const filtered = sessions.filter(s => s.date.startsWith(targetMonth));
  const totals = {};
  members.forEach(m => { totals[m.id] = { seisan: 0, rounds: 0 }; });
  filtered.forEach(sess => {
    const tot = calcTotals(sess);
    sess.members.forEach(id => {
      if (!totals[id]) totals[id] = { seisan: 0, rounds: 0 };
      totals[id].seisan += (tot[id]?.seisan || 0); // 場代抜きの純粋な勝ち点
      totals[id].rounds += sess.rounds.filter(r => r.players.map(Number).includes(Number(id))).length;
    });
  });
  return members
    .filter(m => {
      const t = totals[m.id];
      if (!t || t.rounds === 0) return false;
      return t.seisan >= 3000 && t.rounds >= 3; // 両方満たす場合のみ
    })
    .map(m => m.id);
}

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

// Confetti紙吹雪コンポーネント
function Confetti() {
  const pieces = Array.from({length:38}, (_,i)=>i);
  const colors = ["#e74c3c","#f1c40f","#2ecc71","#3498db","#e67e22","#9b59b6","#fff","#ff69b4"];
  return (
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9990,overflow:"hidden"}}>
      {pieces.map(i=>{
        const left = Math.random()*100;
        const delay = Math.random()*2;
        const duration = 2.5 + Math.random()*2;
        const size = 6 + Math.random()*8;
        const color = colors[i % colors.length];
        const shape = i % 3 === 0 ? "50%" : "0%";
        return (
          <div key={i} style={{
            position:"absolute", left:`${left}%`, top:"-20px",
            width:size, height:size, borderRadius:shape,
            background:color, opacity:0.9,
            animation:`confettiFall ${duration}s ${delay}s ease-in forwards`,
          }}/>
        );
      })}
    </div>
  );
}

// MVP用アバター（炎エフェクト付き）
function MvpAv({ m, sz }) {
  return (
    <div style={{position:"relative", display:"inline-block"}}>
      <div style={{
        width:sz, height:sz, borderRadius:"50%", overflow:"hidden",
        animation:"flame 1.5s ease-in-out infinite",
        flexShrink:0,
      }}>
        <Av m={m} sz={sz}/>
      </div>
      <div style={{
        position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
        fontSize:12, animation:"crownBounce 1.2s ease-in-out infinite",
        filter:"drop-shadow(0 0 4px #f1c40f)",
      }}>👑</div>
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

// CSS animations injection
if (!document.getElementById("tleague-animations")) {
  const style = document.createElement("style");
  style.id = "tleague-animations";
  style.textContent = `
    @keyframes flame {
      0%,100% { box-shadow: 0 0 8px 3px #ff6b00, 0 0 18px 6px #ff000088; filter: brightness(1.1); }
      50% { box-shadow: 0 0 14px 6px #ffaa00, 0 0 28px 12px #ff440066; filter: brightness(1.25); }
    }
    @keyframes aura {
      0%,100% { box-shadow: 0 0 10px 4px #f1c40f88; }
      50% { box-shadow: 0 0 20px 10px #f1c40fcc; }
    }
    @keyframes crownBounce {
      0%,100% { transform: translateY(0) rotate(-5deg); }
      50% { transform: translateY(-3px) rotate(5deg); }
    }
    @keyframes cardReveal {
      0% { opacity:0; transform: scale(0.92) translateY(10px); }
      100% { opacity:1; transform: scale(1) translateY(0); }
    }
    @keyframes confettiFall {
      0% { transform: translateY(-10px) rotate(0deg); opacity:1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
    }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
    @keyframes badgeIn {
      0% { transform: scale(0); opacity:0; }
      70% { transform: scale(1.2); }
      100% { transform: scale(1); opacity:1; }
    }
  `;
  document.head.appendChild(style);
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
  const [selectedMonth, setSelectedMonth] = useState(""); // "YYYY-MM" or ""
  const [confettiShown, setConfettiShown] = useState(false);
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
  const [draftId, setDraftId] = useState(null); // Supabaseのdraft ID
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
  const [bashiroExclude, setBashiroExclude] = useState({});
  const [bashiroTotal, setBashiroTotal] = useState("");
  const [editSession, setEditSession] = useState(null);
  const [toast, setToast] = useState(null); // {type:"error"|"success", msg:string}
  const [isSaving, setIsSaving] = useState(false);
  const [memberDeleteStep, setMemberDeleteStep] = useState({});
  const [auditModal, setAuditModal] = useState(null); // {action:"delete"|"edit", label, onConfirm}
  const [auditWho, setAuditWho] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
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
  const [, setLast10Seed] = useState(0);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const [yakumanCelebration, setYakumanCelebration] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const latestChangelogDate = CHANGELOG[0]?.date || "";
  const latestChangelogKey = `${latestChangelogDate}-${CHANGELOG[0]?.features?.length||0}`;
  const [hasNewUpdate, setHasNewUpdate] = useState(()=>{
    const seen = localStorage.getItem("tleague_settings_seen");
    return seen !== latestChangelogKey;
  });
  const [showChangelogSection, setShowChangelogSection] = useState(false);
  const [showAppGuideSection, setShowAppGuideSection] = useState(false);
  const [showMvpSection, setShowMvpSection] = useState(false);
  const [showColorLegend, setShowColorLegend] = useState(false);
  const [editRoundIndex, setEditRoundIndex] = useState(null);

  // 月一覧（プルダウン用）
  const monthList = getMonthList(sessions);

  // 当月MVP判定
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const mvpIds = period === "month" || (period === "pick" && selectedMonth === currentMonth)
    ? calcMvpIds(sessions, members, currentMonth)
    : [];
  const [highScoreModal, setHighScoreModal] = useState(null); // {roundIndex, playerId, score}
  const [highScoreInput, setHighScoreInput] = useState(""); // {name, type}
  const [showMemberAdd, setShowMemberAdd] = useState(false);
  const [editAddingRound, setEditAddingRound] = useState(false);
  const [editNewRoundSc, setEditNewRoundSc] = useState({});
  const [editNewRoundActive, setEditNewRoundActive] = useState(null);

  const fileRef = useRef(null);
  const [photoTgt, setPhotoTgt] = useState(null);
  const cvRef = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const writeAuditLog = async (memberName, action, detail) => {
    if (memberName === "りょう") return; // りょうはログなし
    await supabase.from("audit_log").insert({ member_name: memberName, action, detail });
    // ローカルにも即反映
    setAuditLog(prev => [{
      created_at: new Date().toISOString(),
      member_name: memberName,
      action,
      detail
    }, ...prev]);
  };

  // audit_log 読み込み
  useEffect(()=>{
    supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(50)
      .then(({data})=>{ if(data) setAuditLog(data); });
  },[]);

  // 今月表示時にconfettiを1回だけ発火
  useEffect(()=>{
    if (period === "month" && mvpIds.length > 0 && !confettiShown) {
      setConfettiShown(true);
      setTimeout(()=>setConfettiShown(false), 4500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[period, mvpIds.length]);

  const gm = id => members.find(m => m.id === Number(id));
  const is5 = addSel.length > 4;

  // 起動時にSupabaseから下書き復元
  useEffect(()=>{
    async function loadDraft(){
      const today = new Date().toISOString().slice(0,10);
      
      // Supabase から取得試行
      try {
        const { data } = await supabase.from("drafts").select("*").order("updated_at",{ascending:false}).limit(1).single();
        if(data && data.date === today){
          setDraftId(data.id);
          setAddDate(data.date);
          setAddRules(data.rules);
          setAddSel(data.members);
          setAddRounds(data.rounds);
          setAddStep(data.rounds.length>0?2:0);
          return;
        } else if(data) {
          await supabase.from("drafts").delete().eq("id",data.id);
        }
      } catch (e) {
        console.error("Failed to load draft from Supabase:", e);
      }
      
      // Supabase失敗時 → localStorage から復元
      try {
        const backup = localStorage.getItem("tleague_draft_backup");
        if(backup){
          const draft = JSON.parse(backup);
          if(draft.date === today){
            setAddDate(draft.date);
            setAddRules(draft.rules);
            setAddSel(draft.members);
            setAddRounds(draft.rounds);
            setAddStep(draft.rounds.length>0?2:0);
            showToast("success", "📦 ローカル保存から復元しました");
          } else {
            localStorage.removeItem("tleague_draft_backup");
          }
        }
      } catch (e) {
        console.error("localStorage restore failed:", e);
      }
    }
    loadDraft();
  },[]);

  // 半荘確定のたびにSupabaseに下書き保存
  async function saveDraft(date, rules, sel, rounds){
    if(rounds.length===0) return;
    const payload = { date, rules, members:sel, rounds, updated_at: new Date().toISOString() };
    
    // localStorage にバックアップ（オフライン時の保険）
    try {
      localStorage.setItem("tleague_draft_backup", JSON.stringify(payload));
    } catch (e) {
      console.error("localStorage backup failed:", e);
    }
    
    // Supabase に保存
    try {
      if(draftId){
        await supabase.from("drafts").update(payload).eq("id",draftId);
      } else {
        const { data } = await supabase.from("drafts").insert(payload).select().single();
        if(data) setDraftId(data.id);
      }
    } catch (error) {
      console.error("Error saving draft to Supabase:", error);
      showToast("error", "⚠️ 通信エラー。下書きはローカル保存されています");
    }
  }

  // 下書き削除
  async function deleteDraft(){
    try {
      if(draftId){ 
        await supabase.from("drafts").delete().eq("id",draftId); 
        setDraftId(null); 
      }
      localStorage.removeItem("tleague_draft");
      localStorage.removeItem("tleague_draft_backup");
    } catch (error) {
      console.error("Error deleting draft:", error);
    }
  }
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
      if (period === "pick") return s.date.startsWith(selectedMonth);
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
        } else if (photoTgt?.t==="cr") {
          const { ri, id } = photoTgt;
          setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
            ...rr, photos:{...rr.photos,[id]:[...(rr.photos?.[id]||[]),d].slice(0,3)}
          }));
          saveDraft(addDate, addRules, addSel, addRounds.map((rr,idx)=>idx!==ri?rr:{
            ...rr, photos:{...rr.photos,[id]:[...(rr.photos?.[id]||[]),d].slice(0,3)}
          }));
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
    const newRounds = [...addRounds, { players: playing, scores, photos:{...rpPhotos}, yakuman:[...rpYakuman], yakumanTypes:{...rpYakumanTypes}, openRiichi:[...rpOpenRiichi], dealIn:[...rpDealIn] }];
    setAddRounds(newRounds);
    
    // 70以上でトップを取った人を検出
    const sorted = playing.map(pid=>({pid, sc:N(scores[pid])})).sort((a,b)=>b.sc-a.sc);
    const topPlayer = sorted[0];
    if (topPlayer.sc >= 70) {
      setHighScoreModal({ roundIndex: newRounds.length-1, playerId: topPlayer.pid, score: topPlayer.sc });
      setHighScoreInput("");
      return; // 持ち点入力待ち
    }
    
    saveDraft(addDate, addRules, addSel, newRounds);

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
    if (isSaving) return; // 二重送信防止
    setIsSaving(true);
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
    try {
      const { data, error } = await supabase.from("sessions").insert(newSess).select().single();
      if (error) throw error;
      if (data) setSessions(p => [...p, data]);
      setLr({...addRules, uma:addRules.uma.map(Number)});
      setBashiroTotal("");
      await deleteDraft();
      setDraftId(null);
      setAddStep(0); setTab("history");
      showToast("success", "✅ 保存しました");
    } catch (e) {
      console.error("saveSession error:", e);
      showToast("error", "⚠️ 保存失敗。下書きは残っています。再度お試しください");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSession(id, memberName) {
    try {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
      const s = sessions.find(s=>s.id===id);
      await writeAuditLog(memberName, "削除", `${s?.date||id} の対局を削除`);
      setSessions(p => p.filter(s => s.id !== id));
      setHistOpen(prev => { const n={...prev}; delete n[id]; return n; });
      showToast("success", "🗑 削除しました");
    } catch (e) {
      console.error("deleteSession error:", e);
      showToast("error", "⚠️ 削除に失敗しました");
    }
  }

  async function saveEditSession(memberName) {
    if (isSaving) return;
    setIsSaving(true);
    const updated = { ...editSession };
    try {
      const { error } = await supabase.from("sessions").update({
        rounds: updated.rounds,
        chips: updated.chips,
        bashiro: updated.bashiro,
        rules: updated.rules,
      }).eq("id", updated.id);
      if (error) throw error;
      await writeAuditLog(memberName, "編集", `${updated.date} の対局を編集`);
      setSessions(p => p.map(s => s.id === updated.id ? updated : s));
      setEditSession(null);
      setEditKeypadActive(null);
      setEditAddingRound(false);
      setEditNewRoundSc({});
      setEditNewRoundActive(null);
      showToast("success", "✅ 編集を保存しました");
    } catch (e) {
      console.error("saveEditSession error:", e);
      showToast("error", "⚠️ 編集の保存失敗。再度お試しください");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetAdd() {
    await deleteDraft();
    setAddStep(0); setAddRules({...lr}); setAddSel([]); setAddRounds([]);
    setAddDate(today());
    setRpSc({}); setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setAddChips({}); setAddBashiro({});
    setRpActive(null); setChipActive(null); setAddErr(""); setBashiroTotal("");
    setDraftId(null);
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
    const isEditing = editRoundIndex === ri;
    
    return (
      <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:7, padding:7, marginBottom:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:10, color:"#888" }}>第{ri+1}半荘 <span style={{color:"#555"}}>確定済</span></div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>{
              if(!window.confirm(`第${ri+1}半荘を削除しますか？\nこの操作は取り消せません。`)) return;
              const updated = addRounds.filter((_,i)=>i!==ri);
              setAddRounds(updated);
              saveDraft(addDate,addRules,addSel,updated);
              setEditRoundIndex(null);
            }} style={S.bs({fontSize:11,color:"#e74c3c"})}>
              🗑️ 削除
            </button>
            <button onClick={()=>setEditRoundIndex(isEditing?null:ri)} style={S.bs({fontSize:11,color:isEditing?"#e74c3c":"#7fb9e0"})}>
              {isEditing?"✕ 閉じる":"✏️ 編集"}
            </button>
          </div>
        </div>

        {!isEditing && (
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
              const hasYakuman = r.yakuman && r.yakuman.includes(m.id);
              const hasOpenRiichi = r.openRiichi && r.openRiichi.includes(m.id);
              return (
                <div key={m.id} style={{ textAlign:"center", padding:4, background:rank===1?"rgba(231,76,60,0.1)":"rgba(255,255,255,0.03)", borderRadius:5 }}>
                  <Av m={m} sz={18}/>
                  <div style={{fontSize:9,marginTop:1}}>{m.name}</div>
                  <div style={{fontSize:13,fontWeight:"bold",color:cc(sc2)}}>{fw(sc2)}</div>
                  {hasYakuman&&<div style={{fontSize:9,color:"#ffd700"}}>🀄 役満</div>}
                  {hasOpenRiichi&&<div style={{fontSize:9,color:"#3498db"}}>開放立直</div>}
                  {ph.length>0 && (
                    <div style={{display:"flex",gap:2,justifyContent:"center",marginTop:3,flexWrap:"wrap"}}>
                      {ph.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setLb(p)} style={{width:36,height:36,borderRadius:5,objectFit:"cover",cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)"}}/>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isEditing && (
          <div style={{background:"rgba(52,152,219,0.06)",borderRadius:7,padding:8,marginTop:6}}>
            <div style={{fontSize:10,color:"#7fb9e0",marginBottom:8}}>📷 写真・🀄 役満・開放立直の追加のみ可能（スコアは変更不可）</div>
            {r.players.map(pid => {
              const m = gm(pid); if (!m) return null;
              const ph = (r.photos?.[pid])||[];
              const hasYakuman = r.yakuman && r.yakuman.includes(pid);
              const yakumanType = r.yakumanTypes?.[pid]||"";
              const hasOpenRiichi = r.openRiichi && r.openRiichi.includes(pid);
              const hasDealIn = r.dealIn && r.dealIn.includes(pid);
              
              return (
                <div key={pid} style={{background:"rgba(255,255,255,0.04)",borderRadius:6,padding:7,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <Av m={m} sz={24}/>
                    <div style={{fontSize:12,fontWeight:500}}>{m.name}</div>
                  </div>

                  {/* 写真追加 */}
                  <button onClick={()=>{ setPhotoTgt({t:"cr",ri,id:pid}); fileRef.current.value=""; fileRef.current.click(); }}
                    style={{...S.bs({fontSize:11,marginBottom:6,width:"100%",background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.3)"})}}> 📷 写真を追加</button>
                  {ph.length>0 && (
                    <div style={{display:"flex",gap:3,marginBottom:6,flexWrap:"wrap"}}>
                      {ph.map((p,i)=>(
                        <div key={i} style={{position:"relative"}}>
                          <img src={p} alt="" onClick={()=>setLb(p)} style={{width:50,height:50,borderRadius:5,objectFit:"cover",cursor:"pointer"}}/>
                          <button onClick={()=>{
                            setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                              ...rr, photos:{...rr.photos, [pid]:(rr.photos?.[pid]||[]).filter((_,ii)=>ii!==i)}
                            }));
                          }} style={{position:"absolute",top:-6,right:-6,background:"#e74c3c",border:"none",borderRadius:"50%",width:18,height:18,fontSize:10,cursor:"pointer",color:"#fff"}}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 役満チェック */}
                  <div onClick={()=>{
                    setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                      ...rr, yakuman: hasYakuman
                        ? (rr.yakuman||[]).filter(x=>x!==pid)
                        : [...(rr.yakuman||[]),pid]
                    }));
                  }} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,cursor:"pointer",marginBottom:4,background:hasYakuman?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.03)",border:hasYakuman?"1px solid rgba(255,215,0,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                    <span style={{fontSize:12}}>{hasYakuman?"☑️":"⬜"}</span>
                    <span style={{fontSize:11,color:hasYakuman?"#ffd700":"#666"}}>役満</span>
                  </div>
                  {hasYakuman && (
                    <input type="text" placeholder="種類（例: 四暗刻）"
                      value={yakumanType}
                      onChange={e=>{
                        const val=e.target.value;
                        setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                          ...rr,yakumanTypes:{...(rr.yakumanTypes||{}),[pid]:val}
                        }));
                      }}
                      onClick={e=>e.stopPropagation()}
                      style={{marginBottom:4,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.3)",color:"#ffd700",borderRadius:6,padding:"4px 8px",fontSize:12,width:"100%",outline:"none"}}/>
                  )}

                  {/* 開放立直チェック */}
                  <div onClick={()=>{
                    setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                      ...rr, openRiichi: hasOpenRiichi
                        ? (rr.openRiichi||[]).filter(x=>x!==pid)
                        : [...(rr.openRiichi||[]),pid]
                    }));
                  }} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,cursor:"pointer",marginBottom:4,background:hasOpenRiichi?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.03)",border:hasOpenRiichi?"1px solid rgba(52,152,219,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                    <span style={{fontSize:12}}>{hasOpenRiichi?"☑️":"⬜"}</span>
                    <span style={{fontSize:11,color:hasOpenRiichi?"#3498db":"#666"}}>開放立直</span>
                  </div>

                  {/* 振り込みチェック */}
                  {hasOpenRiichi && (
                    <div onClick={()=>{
                      setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                        ...rr, dealIn: hasDealIn
                          ? (rr.dealIn||[]).filter(x=>x!==pid)
                          : [...(rr.dealIn||[]),pid]
                      }));
                    }} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,cursor:"pointer",background:hasDealIn?"rgba(231,76,60,0.15)":"rgba(255,255,255,0.03)",border:hasDealIn?"1px solid rgba(231,76,60,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                      <span style={{fontSize:12}}>{hasDealIn?"☑️":"⬜"}</span>
                      <span style={{fontSize:11,color:hasDealIn?"#e74c3c":"#666"}}>💀 振り込み</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={()=>{
              setEditRoundIndex(null);
              saveDraft(addDate, addRules, addSel, addRounds);
            }} style={{...S.br({width:"100%",marginTop:6,fontSize:12})}}>✅ 保存して閉じる</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width:"100%", maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#0f0f1a", color:"#fff", fontFamily:"sans-serif", boxSizing:"border-box" }}>
      <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onFile}/>
      {lb && <div onClick={()=>setLb(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,cursor:"pointer"}}><img src={lb} alt="" style={{maxWidth:"90%",maxHeight:"80vh",borderRadius:8}}/></div>}

      {/* 持ち点入力モーダル */}
      {highScoreModal && (()=>{
        const m = gm(highScoreModal.playerId);
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,165,0,0.1))",border:"2px solid rgba(255,215,0,0.6)",borderRadius:16,padding:20,maxWidth:340,width:"90%"}}>
              <div style={{fontSize:16,fontWeight:700,color:"#ffd700",marginBottom:8,textAlign:"center"}}>🏆 最高点記録！</div>
              <div style={{fontSize:13,color:"#ccc",marginBottom:12,textAlign:"center"}}>
                {m?.name}さんが <span style={{color:"#ffd700",fontWeight:"bold",fontSize:15}}>{fw(highScoreModal.score)}</span> でトップ！
              </div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:8}}>持ち点を入力してください（例: 85000）</div>
              <input type="number" value={highScoreInput} onChange={e=>setHighScoreInput(e.target.value)}
                placeholder="持ち点を入力"
                style={{...S.inp({width:"100%",fontSize:16,textAlign:"center",marginBottom:12})}}
                autoFocus/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{
                  if(!highScoreInput||highScoreInput<25000){alert("正しい持ち点を入力してください");return;}
                  const updated = addRounds.map((r,i)=>i===highScoreModal.roundIndex?{...r,highScore:{playerId:highScoreModal.playerId,rawScore:parseInt(highScoreInput)}}:r);
                  setAddRounds(updated);
                  saveDraft(addDate,addRules,addSel,updated);
                  setHighScoreModal(null);
                  // フォームをリセット
                  setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
                  setRpPhotos({});
                  setRpYakuman([]);
                  setRpYakumanTypes({});
                  setRpOpenRiichi([]);
                  setRpDealIn([]);
                  setRpAutoId(null);
                  setRpActive(null);
                  setAddErr("");
                }} style={{...S.br({flex:1,fontSize:13})}}>✅ 記録する</button>
                <button onClick={()=>{
                  saveDraft(addDate,addRules,addSel,addRounds);
                  setHighScoreModal(null);
                  // フォームをリセット
                  setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
                  setRpPhotos({});
                  setRpYakuman([]);
                  setRpYakumanTypes({});
                  setRpOpenRiichi([]);
                  setRpDealIn([]);
                  setRpAutoId(null);
                  setRpActive(null);
                  setAddErr("");
                }} style={{...S.bg({flex:1,fontSize:13})}}>スキップ</button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <div style={{fontSize:11,color:"#ccc"}}>第{ri+1}半荘</div>
                    <div style={{display:"flex",gap:4}}>
                      {/* 上に移動 */}
                      {ri > 0 && (
                        <button onClick={()=>{
                          setEditSession(prev=>{
                            const newRounds = [...prev.rounds];
                            [newRounds[ri-1], newRounds[ri]] = [newRounds[ri], newRounds[ri-1]];
                            return {...prev, rounds: newRounds};
                          });
                        }} style={{...S.bs({fontSize:10,color:"#7fb9e0",padding:"3px 8px"})}}>
                          ↑
                        </button>
                      )}
                      {/* 下に移動 */}
                      {ri < editSession.rounds.length - 1 && (
                        <button onClick={()=>{
                          setEditSession(prev=>{
                            const newRounds = [...prev.rounds];
                            [newRounds[ri], newRounds[ri+1]] = [newRounds[ri+1], newRounds[ri]];
                            return {...prev, rounds: newRounds};
                          });
                        }} style={{...S.bs({fontSize:10,color:"#7fb9e0",padding:"3px 8px"})}}>
                          ↓
                        </button>
                      )}
                      {/* 削除 */}
                      <button onClick={()=>{
                        if(!window.confirm(`第${ri+1}半荘を削除しますか？\nこの操作は取り消せません。`)) return;
                        setEditSession(prev=>({
                          ...prev,
                          rounds: prev.rounds.filter((_,i)=>i!==ri)
                        }));
                      }} style={{...S.bs({fontSize:10,color:"#e74c3c",padding:"3px 8px"})}}>
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
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

            {/* 新規半荘追加 */}
            <div style={{marginTop:8,marginBottom:8}}>
              {!editAddingRound ? (
                <button onClick={()=>{
                  setEditAddingRound(true);
                  setEditNewRoundSc(Object.fromEntries(editSession.members.map(id=>[id,""])));
                }} style={{...S.bs({width:"100%",fontSize:11,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.3)",color:"#7fb9e0"})}}>
                  ➕ 新規半荘を追加
                </button>
              ) : (
                <div style={{background:"rgba(52,152,219,0.06)",borderRadius:8,padding:10,border:"1px solid rgba(52,152,219,0.3)"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#7fb9e0",marginBottom:8}}>➕ 新規半荘を追加</div>
                  <div style={{fontSize:10,color:"#aaa",marginBottom:8}}>
                    4人分の順位点を入力してください<br/>
                    <span style={{fontSize:9,color:"#666"}}>3人入力で残り1人を自動計算（空欄が1人のとき）</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:8}}>
                    {editSession.members.map(id=>{
                      const m = gm(id); if(!m) return null;
                      const v = String(editNewRoundSc[id]||"");
                      const hasV = v.trim() !== "";
                      const isActive = editNewRoundActive === id;
                      const othersFilled = editSession.members.filter(oid => oid !== id && String(editNewRoundSc[oid]||"").trim() !== "").length === editSession.members.length - 1;
                      const showAutoBtn = !hasV && othersFilled;
                      
                      return (
                        <div key={id} style={{borderRadius:9,background:hasV?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.02)",border:`2px solid ${isActive?"#e74c3c":hasV?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)"}`,padding:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                            <Av m={m} sz={28}/>
                            <div>
                              <div style={{fontSize:12,fontWeight:500}}>{m.name}</div>
                              {!hasV&&<div style={{fontSize:9,color:"#555"}}>未入力</div>}
                            </div>
                          </div>
                          {showAutoBtn ? (
                            <button onClick={()=>{
                              const others = editSession.members.filter(oid => oid !== id);
                              const filled = others.filter(oid => String(editNewRoundSc[oid]||"").trim() !== "");
                              const sum = filled.reduce((acc, oid) => acc + N(editNewRoundSc[oid]), 0);
                              setEditNewRoundSc(prev => ({ ...prev, [id]: String(-sum) }));
                            }} style={{width:"100%",padding:"10px 6px",borderRadius:7,border:"none",background:"rgba(52,152,219,0.25)",color:"#7fb9e0",cursor:"pointer",fontWeight:"bold",fontSize:13}}>
                              🔄 自動計算
                            </button>
                          ) : (
                            <div onClick={()=>setEditNewRoundActive(isActive?null:id)}
                              style={{textAlign:"center",padding:"10px 6px",borderRadius:7,cursor:"pointer",
                                background:isActive?"rgba(231,76,60,0.12)":hasV?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",
                                border:isActive?"1px solid rgba(231,76,60,0.4)":"1px solid rgba(255,255,255,0.08)"}}>
                              <div style={{fontSize:hasV?22:12,fontWeight:hasV?"bold":"normal",color:hasV?cc(N(v)):"#333",minHeight:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {hasV?(N(v)>=0?"+":"")+v:"タップで入力"}
                              </div>
                            </div>
                          )}
                          {isActive&&<Keypad value={v} onChange={val=>setEditNewRoundSc(prev=>({...prev,[id]:val}))}/>}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{
                      const playing = editSession.members.filter(id=>String(editNewRoundSc[id]||"").trim()!=="");
                      if(playing.length!==4){alert("4人分の点数を入力してください");return;}
                      const scores = {};
                      playing.forEach(id=>{scores[id]=N(editNewRoundSc[id]);});
                      setEditSession(prev=>({
                        ...prev,
                        rounds:[...prev.rounds,{players:playing,scores,photos:{},yakuman:[],yakumanTypes:{},openRiichi:[],dealIn:[]}]
                      }));
                      setEditAddingRound(false);
                      setEditNewRoundSc({});
                      setEditNewRoundActive(null);
                    }} style={{...S.br({flex:1,fontSize:11})}}>✅ 追加</button>
                    <button onClick={()=>{
                      setEditAddingRound(false);
                      setEditNewRoundSc({});
                      setEditNewRoundActive(null);
                    }} style={{...S.bg({fontSize:11})}}>キャンセル</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setAuditWho(null);setAuditModal({action:"edit",label:`${editSession.date}の対局`,onConfirm:(name)=>saveEditSession(name)});}} style={S.br({flex:1})}>💾 保存する</button>
              <button onClick={()=>{
                setEditSession(null);
                setEditKeypadActive(null);
                setEditAddingRound(false);
                setEditNewRoundSc({});
                setEditNewRoundActive(null);
              }} style={S.bg()}>キャンセル</button>
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
          <div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
            {[["all","全期間"],["year","今年"],["month","今月"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={S.pd(period===v)}>{l}</button>
            ))}
            {/* 月別プルダウン */}
            <select
              value={period==="pick" ? selectedMonth : ""}
              onChange={e=>{
                if(e.target.value){ setPeriod("pick"); setSelectedMonth(e.target.value); }
              }}
              style={{
                padding:"4px 6px", borderRadius:13, fontSize:11, cursor:"pointer",
                background: period==="pick" ? "transparent" : "transparent",
                border: period==="pick" ? "1px solid #e74c3c" : "1px solid rgba(255,255,255,0.18)",
                color: period==="pick" ? "#e74c3c" : "#888",
                outline:"none", maxWidth:90,
              }}>
              <option value="" style={{background:"#1a1a2e",color:"#888"}}>月を選ぶ</option>
              {monthList.map(m=>(
                <option key={m} value={m} style={{background:"#1a1a2e",color:"#ccc"}}>
                  {m.replace("-","年").replace(/^(\d+年)0?(\d+)$/,"$1$2月")}
                </option>
              ))}
            </select>
            <button onClick={()=>{
                setShowSettings(p=>!p);
                if(hasNewUpdate){
                  localStorage.setItem("tleague_settings_seen", latestChangelogKey);
                  setHasNewUpdate(false);
                }
              }} style={{marginLeft:"auto",padding:"4px 10px",borderRadius:13,cursor:"pointer",fontSize:11,background:"transparent",border:showSettings?"1px solid #7fb9e0":"1px solid rgba(255,255,255,0.18)",color:showSettings?"#7fb9e0":"#888",position:"relative"}}>
              ⚙️ 設定
              {hasNewUpdate && !showSettings && (
                <span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:"#e74c3c",boxShadow:"0 0 6px #e74c3c",animation:"pulse 1s infinite"}}/>
              )}
            </button>
          </div>
        )}

        {/* 設定モーダル */}
        {showSettings && (
          <div style={{...S.card({background:"rgba(52,152,219,0.06)",border:"1px solid rgba(52,152,219,0.25)",marginBottom:10})}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#7fb9e0"}}>⚙️ 設定</div>
              <button onClick={()=>setShowSettings(false)} style={S.bs()}>✕</button>
            </div>

            {/* ロゴセクション */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0 20px",marginBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <img src="/icon-512.png" alt="T.LEAGUE" style={{width:110,height:110,objectFit:"contain",opacity:0.92,marginBottom:12}}/>
              <div style={{fontSize:9,letterSpacing:5,color:"#444",fontWeight:400,textTransform:"uppercase",marginBottom:6}}>Nerima Night Crew</div>
              <div style={{fontSize:11,color:"#555",letterSpacing:1,fontStyle:"italic",fontWeight:300}}>Waiting for the Flow.</div>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginTop:3}}>流れを待つ。</div>
            </div>

            {/* 当月MVP演出条件セクション */}
            <div style={{marginBottom:12}}>
              <div onClick={()=>setShowMvpSection(p=>!p)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"8px 10px",background:"rgba(241,196,15,0.07)",borderRadius:8,border:"1px solid rgba(241,196,15,0.18)",marginBottom:showMvpSection?8:0}}>
                <div style={{fontSize:12,fontWeight:500,color:"#f1c40f"}}>👑 当月成績優秀者の演出について</div>
                <span style={{fontSize:14,color:"#888"}}>{showMvpSection?"▲":"▼"}</span>
              </div>
              {showMvpSection && (
                <div style={{padding:"10px 12px",background:"rgba(241,196,15,0.04)",borderRadius:"0 0 8px 8px",border:"1px solid rgba(241,196,15,0.12)",borderTop:"none"}}>
                  <div style={{fontSize:10,color:"#aaa",lineHeight:1.8,marginBottom:8}}>
                    「今月」表示時、以下を<span style={{color:"#f1c40f",fontWeight:600}}>両方とも</span>満たすプレイヤーに特別演出が発生します。
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                    <div style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:10,color:"#ccc"}}>
                      <span>🔥</span>
                      <span><span style={{color:"#f1c40f",fontWeight:600}}>純粋な勝ち点 +3,000円以上</span>（場代を含まない清算額）</span>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:10,color:"#ccc"}}>
                      <span>🔥</span>
                      <span><span style={{color:"#f1c40f",fontWeight:600}}>3半荘以上参加</span></span>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:"#666",lineHeight:1.7,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:8}}>
                    演出：アバターに炎エフェクト・👑王冠・金バッジ表示<br/>
                    ページを開いた瞬間に紙吹雪（confetti）が降る
                  </div>
                </div>
              )}
            </div>

            {/* 更新履歴セクション */}
            <div style={{marginBottom:12}}>
              <div onClick={()=>setShowChangelogSection(p=>!p)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,marginBottom:showChangelogSection?8:0}}>
                <div style={{fontSize:12,fontWeight:500,color:"#ccc"}}>📋 更新履歴</div>
                <span style={{fontSize:14,color:"#888"}}>{showChangelogSection?"▲":"▼"}</span>
              </div>
              {showChangelogSection && (
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
              )}
            </div>

            {/* アプリにする方法セクション */}
            <div>
              <div onClick={()=>setShowAppGuideSection(p=>!p)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,marginBottom:showAppGuideSection?8:0}}>
                <div style={{fontSize:12,fontWeight:500,color:"#ccc"}}>📱 アプリにする方法</div>
                <span style={{fontSize:14,color:"#888"}}>{showAppGuideSection?"▲":"▼"}</span>
              </div>
              {showAppGuideSection && (
                <div style={{fontSize:11,color:"#ccc",lineHeight:1.6}}>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#7fb9e0",marginBottom:6}}>📱 iPhone（Safari）</div>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>
                      1. Safariでこのページを開く<br/>
                      2. 画面下部の <span style={{color:"#3498db",fontWeight:"bold"}}>共有ボタン □↑</span> をタップ<br/>
                      3. 「<span style={{color:"#3498db",fontWeight:"bold"}}>ホーム画面に追加</span>」を選択<br/>
                      4. 右上の「<span style={{color:"#3498db",fontWeight:"bold"}}>追加</span>」をタップ
                    </div>
                    <div style={{fontSize:9,color:"#666",marginTop:4}}>
                      ※ ホーム画面にアイコンが追加され、アプリのように使えます
                    </div>
                  </div>

                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#7fb9e0",marginBottom:6}}>🤖 Android（Chrome）</div>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>
                      1. Chromeでこのページを開く<br/>
                      2. 画面右上の <span style={{color:"#3498db",fontWeight:"bold"}}>メニュー ⋮</span> をタップ<br/>
                      3. 「<span style={{color:"#3498db",fontWeight:"bold"}}>ホーム画面に追加</span>」を選択<br/>
                      4. 「<span style={{color:"#3498db",fontWeight:"bold"}}>追加</span>」をタップ
                    </div>
                    <div style={{fontSize:9,color:"#666",marginTop:4}}>
                      ※ ホーム画面にアイコンが追加され、アプリのように使えます
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LINE共有セクション */}
            <div style={{marginTop:8,marginBottom:8}}>
              <div style={{padding:"10px 12px",background:"rgba(6,199,85,0.06)",borderRadius:8,border:"1px solid rgba(6,199,85,0.2)"}}>
                <div style={{fontSize:12,fontWeight:500,color:"#06c755",marginBottom:6}}>💬 LINEで共有する</div>
                <div style={{fontSize:10,color:"#888",marginBottom:10,lineHeight:1.7}}>
                  招待コードを知っている方にアプリのURLをLINEで送れます。<br/>
                  <span style={{color:"#555"}}>※ 送信先のLINEを知っている場合に限ります</span>
                </div>
                <button onClick={()=>{
                  const url = "https://tleague.nerima-night-crew.com";
                  const text = encodeURIComponent(`東武練馬Tリーグ 麻雀スコアアプリ\n${url}`);
                  window.open(`https://line.me/R/msg/text/?${text}`, "_blank");
                }} style={{
                  width:"100%", padding:"10px", borderRadius:8, border:"none",
                  background:"#06c755", color:"#fff", fontSize:13, fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>
                  <span style={{fontSize:16}}>💬</span> LINEで送る
                </button>
              </div>
            </div>

            {/* 操作ログセクション */}
            {auditLog.length > 0 && (
              <div style={{marginTop:8}}>
                <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:500,color:"#ccc",marginBottom:8}}>🔍 操作ログ</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:180,overflowY:"auto"}}>
                    {auditLog.map((log,i)=>{
                      const d = new Date(log.created_at);
                      const dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,padding:"4px 6px",background:"rgba(255,255,255,0.03)",borderRadius:5}}>
                          <span style={{color:"#555",flexShrink:0}}>{dateStr}</span>
                          <span style={{color:log.action==="削除"?"#e74c3c":"#7fb9e0",fontWeight:600,flexShrink:0}}>{log.action}</span>
                          <span style={{color:"#aaa",fontWeight:500,flexShrink:0}}>{log.member_name}</span>
                          <span style={{color:"#666"}}>{log.detail}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* データバックアップセクション */}
            <div style={{marginTop:8}}>
              <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:500,color:"#ccc",marginBottom:6}}>💾 データバックアップ</div>
                <div style={{fontSize:10,color:"#888",marginBottom:10,lineHeight:1.6}}>
                  全対戦データをJSONファイルで書き出します。<br/>
                  万が一のデータ消失に備えて、定期的にバックアップしてください。
                </div>
                <button onClick={async ()=>{
                  try {
                    const { data: sessionsData, error } = await supabase
                      .from("sessions")
                      .select("*")
                      .order("date", { ascending: false });
                    if (error) throw error;
                    const { data: membersData } = await supabase.from("members").select("*");
                    const backup = {
                      exported_at: new Date().toISOString(),
                      app: "東武練馬Tリーグ",
                      version: CHANGELOG[0]?.date || "",
                      members: membersData || [],
                      sessions: sessionsData || [],
                    };
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `tleague_backup_${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("success", "✅ バックアップを書き出しました");
                  } catch(e) {
                    showToast("error", "⚠️ バックアップの取得に失敗しました");
                  }
                }} style={{...S.bg({width:"100%",fontSize:12,padding:"10px",fontWeight:600})}}>
                  📥 JSONでバックアップを書き出す
                </button>
                <div style={{fontSize:9,color:"#555",marginTop:6,textAlign:"center"}}>
                  ※ ファイル名：tleague_backup_YYYY-MM-DD.json
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DASHBOARD ===== */}
        {tab==="dashboard" && (() => {
          // 期間フィルター
          const now = new Date();
          const thisYear = now.getFullYear();
          const thisMonth = `${thisYear}-${String(now.getMonth()+1).padStart(2,"0")}`;
          const filteredSessions = period==="year" ? sessions.filter(s=>s.date.startsWith(String(thisYear)))
            : period==="month" ? sessions.filter(s=>s.date.startsWith(thisMonth))
            : period==="pick" ? sessions.filter(s=>s.date.startsWith(selectedMonth))
            : sessions;

          const lifetimeStats = members.map(m=>{
            const sid = String(m.id);
            let sc=0,scY=0,chY=0,ba=0,games=0,r1=0,r2=0,r3=0,r4=0,yakuman=0,openRiichiCount=0,dealInCount=0;
            filteredSessions.forEach(s=>{
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
              ...m, sc:Math.round(sc), seisan, ba, kati, games, chY,
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
                {[["summary","📊 概要"],["lifetime","🏆 生涯成績"],["h2h","⚔️ 対人成績"],["yakuman","🀄 役満"],["highscore","👑 最高点"],["chip","💰 チップ王"]].map(([v,l])=>(
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
                        {sortedStats.filter(p=>p.games>0).map((p,i)=>{
                          const isMvp = mvpIds.includes(p.id);
                          return (
                          <div key={p.id} style={S.card({
                            background:isMvp?"linear-gradient(135deg,rgba(241,196,15,0.15),rgba(230,126,34,0.08))":i===0?"linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.12))":"rgba(255,255,255,0.05)",
                            border:`1px solid ${isMvp?"rgba(241,196,15,0.5)":i===0?"#e74c3c":"rgba(255,255,255,0.1)"}`,
                            textAlign:"center",padding:10,
                            animation:isMvp?"cardReveal 0.5s ease both":"none",
                          })}>
                            {isMvp ? <MvpAv m={gm(p.id)} sz={36}/> : <Av m={gm(p.id)} sz={36}/>}
                            <div style={{fontSize:12,fontWeight:500,marginTop:isMvp?8:4}}>
                              {p.name}
                              {isMvp && <span style={{display:"block",fontSize:9,background:"linear-gradient(90deg,#f1c40f,#e67e22)",color:"#000",fontWeight:"bold",padding:"1px 5px",borderRadius:6,animation:"badgeIn 0.4s ease both",marginTop:2}}>今月MVP</span>}
                            </div>
                            <div style={{fontSize:18,fontWeight:"bold",color:cc(p.sc),marginTop:2}}>{fw(p.sc)}</div>
                            <div style={{fontSize:10,color:cc(p.seisan)}}>清算 {fwy(p.seisan)}</div>
                            <div style={{fontSize:10,color:cc(p.kati),fontWeight:500}}>勝ち分 {fwy(p.kati)}</div>
                            <div style={{fontSize:10,color:"#666",marginTop:2}}>{p.games}半荘 {p.wr}%</div>
                          </div>
                          );
                        })}
                      </div>
                      <div style={S.card()}>
                        <div style={{fontSize:11,color:"#ccc",marginBottom:8}}>💰 収支内訳</div>
                        {sortedStats.filter(p=>p.games>0).map(p=>{
                          const isMvp = mvpIds.includes(p.id);
                          return (
                          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                            {isMvp ? <MvpAv m={gm(p.id)} sz={28}/> : <Av m={gm(p.id)} sz={28}/>}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:500}}>{p.name}{isMvp&&<span style={{fontSize:8,background:"linear-gradient(90deg,#f1c40f,#e67e22)",color:"#000",fontWeight:"bold",padding:"1px 4px",borderRadius:4,marginLeft:4}}>MVP</span>}</div>
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
                          );
                        })}
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
                  {/* 色凡例（折りたたみ式） */}
                  <div style={{marginBottom:8,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:8}}>
                    <div onClick={()=>setShowColorLegend(p=>!p)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontSize:10,color:"#888"}}>📊 基準値（色分け）※全国およびMリーグ基準に基づく</div>
                      <span style={{fontSize:12,color:"#888"}}>{showColorLegend?"▲":"▼"}</span>
                    </div>
                    {showColorLegend && (
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginTop:8}}>
                        <div>
                          <div style={{fontSize:9,color:"#666",marginBottom:3}}>平均順位</div>
                          <div style={{fontSize:8,display:"flex",flexDirection:"column",gap:1}}>
                            <div><span style={{color:"#ffd700"}}>🟡</span> 最高（<span style={{color:"#ffd700",fontWeight:"bold"}}>2.32以下</span>）</div>
                            <div><span style={{color:"#f39c12"}}>🟠</span> 良（<span style={{color:"#f39c12",fontWeight:"bold"}}>2.37以下</span>）</div>
                            <div><span style={{color:"#9b59b6"}}>🟣</span> 可（<span style={{color:"#9b59b6",fontWeight:"bold"}}>2.5以下</span>）</div>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:"#666",marginBottom:3}}>トップ率</div>
                          <div style={{fontSize:8,display:"flex",flexDirection:"column",gap:1}}>
                            <div><span style={{color:"#ffd700"}}>🟡</span> 最高（<span style={{color:"#ffd700",fontWeight:"bold"}}>30%以上</span>）</div>
                            <div><span style={{color:"#f39c12"}}>🟠</span> 良（<span style={{color:"#f39c12",fontWeight:"bold"}}>28%以上</span>）</div>
                            <div><span style={{color:"#9b59b6"}}>🟣</span> 可（<span style={{color:"#9b59b6",fontWeight:"bold"}}>25%以上</span>）</div>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:"#666",marginBottom:3}}>連対率</div>
                          <div style={{fontSize:8,display:"flex",flexDirection:"column",gap:1}}>
                            <div><span style={{color:"#ffd700"}}>🟡</span> 最高（<span style={{color:"#ffd700",fontWeight:"bold"}}>60%以上</span>）</div>
                            <div><span style={{color:"#f39c12"}}>🟠</span> 良（<span style={{color:"#f39c12",fontWeight:"bold"}}>55%以上</span>）</div>
                            <div><span style={{color:"#9b59b6"}}>🟣</span> 可（<span style={{color:"#9b59b6",fontWeight:"bold"}}>50%以上</span>）</div>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:"#666",marginBottom:3}}>ラスト率</div>
                          <div style={{fontSize:8,display:"flex",flexDirection:"column",gap:1}}>
                            <div><span style={{color:"#ffd700"}}>🟡</span> 最高（<span style={{color:"#ffd700",fontWeight:"bold"}}>16%以下</span>）</div>
                            <div><span style={{color:"#f39c12"}}>🟠</span> 良（<span style={{color:"#f39c12",fontWeight:"bold"}}>20%以下</span>）</div>
                            <div><span style={{color:"#9b59b6"}}>🟣</span> 可（<span style={{color:"#9b59b6",fontWeight:"bold"}}>23%以下</span>）</div>
                          </div>
                        </div>
                      </div>
                    )}
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
                            {sortTh("chY","チップ")}
                          </tr>
                        </thead>
                        <tbody>
                          {liSorted.map((p,i)=>{
                            const isMvp = mvpIds.includes(p.id);
                            return (
                            <tr key={p.id} onClick={()=>setLifeDetail(lifeDetail===p.id?null:p.id)}
                              style={{cursor:"pointer",
                                background:isMvp?"rgba(241,196,15,0.06)":lifeDetail===p.id?"rgba(231,76,60,0.08)":i%2===0?"transparent":"rgba(255,255,255,0.02)",
                                animation:isMvp?"cardReveal 0.5s ease both":"none",
                                animationDelay:isMvp?`${i*0.08}s`:"0s",
                                outline:isMvp?"1px solid rgba(241,196,15,0.35)":"none",
                              }}>
                              <td style={{padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:11}}>{RI[i]||"—"}</span>
                                  {isMvp ? <MvpAv m={gm(p.id)} sz={18}/> : <Av m={gm(p.id)} sz={18}/>}
                                  <span style={{fontSize:12,fontWeight:500}}>{p.name}</span>
                                  {isMvp && <span style={{fontSize:9,background:"linear-gradient(90deg,#f1c40f,#e67e22)",color:"#000",fontWeight:"bold",padding:"1px 5px",borderRadius:6,animation:"badgeIn 0.4s ease both",marginLeft:2}}>今月MVP</span>}
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
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:p.chY>=0?"#3498db":"#e74c3c",fontWeight:"bold"}}>{p.chY>=0?"+":""}{p.chY.toLocaleString()}</td>
                            </tr>
                          );})}
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
                        {/* チップ王ランキング */}
                        <div style={{marginTop:6,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.5)",borderRadius:7,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{fontSize:11,color:"#3498db",fontWeight:600}}>💰 チップ王</div>
                          <div style={{fontSize:13,fontWeight:"bold",color:p.chY>=0?"#3498db":"#e74c3c"}}>
                            {p.chY>=0?"+":""}{p.chY.toLocaleString()}円
                            <span style={{fontSize:11,color:"#aaa",marginLeft:6}}>
                              {[...liSorted].sort((a,b)=>b.chY-a.chY).findIndex(x=>x.id===p.id)+1}位 / {liSorted.length}人
                            </span>
                          </div>
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

              {/* 最高点ランキング サブタブ */}
              {dashSub==="highscore" && (() => {
                const records = [];
                sessions.forEach(s => {
                  s.rounds.forEach((r, ri) => {
                    if (!r.highScore) return;
                    const m = gm(r.highScore.playerId);
                    if (!m) return;
                    const sid = String(r.highScore.playerId);
                    const rankScore = N(r.scores[sid]??r.scores[r.highScore.playerId]);
                    records.push({
                      date: s.date,
                      ri,
                      m,
                      rankScore,
                      rawScore: r.highScore.rawScore,
                      photos: (r.photos?.[sid]??r.photos?.[r.highScore.playerId])||[]
                    });
                  });
                });
                records.sort((a,b)=>b.rawScore-a.rawScore);
                
                return (
                  <>
                    <div style={{fontSize:13,fontWeight:600,color:"#ffd700",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                      👑 最高点ランキング <span style={{fontSize:11,color:"#888",fontWeight:400}}>({records.length}件)</span>
                    </div>
                    {records.length === 0 ? (
                      <div style={{textAlign:"center",padding:40,color:"#555"}}>
                        <div style={{fontSize:36,marginBottom:10}}>👑</div>
                        <div style={{fontSize:13}}>まだ最高点の記録がありません</div>
                        <div style={{fontSize:11,color:"#666",marginTop:4}}>70以上でトップを取ると記録されます</div>
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {records.map((rec,i)=>(
                          <div key={i} style={{background:i<3?`linear-gradient(135deg,${i===0?"rgba(255,215,0,0.12)":i===1?"rgba(192,192,192,0.12)":"rgba(205,127,50,0.12)"},rgba(0,0,0,0.05))`:"rgba(255,255,255,0.04)",border:`1px solid ${i===0?"rgba(255,215,0,0.4)":i===1?"rgba(192,192,192,0.4)":i===2?"rgba(205,127,50,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:12,overflow:"hidden"}}>
                            {rec.photos.length>0 && (
                              <div style={{display:"flex",gap:2}}>
                                {rec.photos.map((p,pi)=><img key={pi} src={p} alt="" onClick={()=>setLb(p)} style={{flex:1,height:rec.photos.length===1?140:100,objectFit:"cover",cursor:"pointer"}}/>)}
                              </div>
                            )}
                            <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                              <div style={{fontSize:20,fontWeight:"bold",color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"#888",minWidth:30,textAlign:"center"}}>
                                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}位`}
                              </div>
                              <Av m={rec.m} sz={40}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{rec.m?.name}</div>
                                <div style={{fontSize:10,color:"#888",marginTop:1}}>{rec.date}　第{rec.ri+1}半荘</div>
                                <div style={{fontSize:11,color:"#aaa",marginTop:1}}>順位点: {fw(rec.rankScore)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:24,fontWeight:"bold",color:"#ffd700"}}>{rec.rawScore.toLocaleString()}</div>
                                <div style={{fontSize:10,color:"#888"}}>持ち点</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* チップ王 サブタブ */}
              {dashSub==="chip" && (() => {
                const chipStats = lifetimeStats.map(p => ({ 
                  ...p, 
                  chY: p.chY || 0 
                })).sort((a, b) => b.chY - a.chY);

                return (
                  <>
                    <div style={{fontSize:13,fontWeight:600,color:"#3498db",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                      💰 チップ王ランキング <span style={{fontSize:11,color:"#888",fontWeight:400}}>({chipStats.length}人)</span>
                    </div>
                    {chipStats.length === 0 ? (
                      <div style={{textAlign:"center",padding:40,color:"#555"}}>
                        <div style={{fontSize:36,marginBottom:10}}>💰</div>
                        <div style={{fontSize:13}}>まだチップの記録がありません</div>
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {chipStats.map((p, i) => (
                          <div key={p.id} style={{
                            background: i < 3 ? `linear-gradient(135deg,${i===0?"rgba(52,152,219,0.2)":i===1?"rgba(52,152,219,0.15)":"rgba(52,152,219,0.1)"},rgba(0,0,0,0.05))` : p.chY >= 0 ? "rgba(52,152,219,0.05)" : "rgba(231,76,60,0.05)",
                            border: `1px solid ${i===0?"rgba(52,152,219,0.5)":i===1?"rgba(52,152,219,0.4)":i===2?"rgba(52,152,219,0.3)":p.chY>=0?"rgba(52,152,219,0.2)":"rgba(231,76,60,0.2)"}`,
                            borderRadius: 12,
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12
                          }}>
                            <div style={{fontSize: 20, fontWeight: "bold", color: i===0?"#3498db":i===1?"#5dade2":i===2?"#85c1e9":"#888", minWidth: 36, textAlign: "center"}}>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}位`}
                            </div>
                            <Av m={p} sz={44} />
                            <div style={{flex: 1}}>
                              <div style={{fontSize: 14, fontWeight: 700, color: "#fff"}}>{p.name}</div>
                              <div style={{fontSize: 11, color: "#888", marginTop: 2}}>
                                {p.games}半荘
                                {p.games > 0 && (
                                  <span style={{marginLeft: 6}}>
                                    平均 {p.chY >= 0 ? "+" : ""}{Math.round(p.chY / p.games).toLocaleString()}円/半荘
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{textAlign: "right"}}>
                              <div style={{fontSize: 24, fontWeight: "bold", color: p.chY >= 0 ? "#3498db" : "#e74c3c"}}>
                                {p.chY >= 0 ? "+" : ""}{p.chY.toLocaleString()}
                              </div>
                              <div style={{fontSize: 10, color: "#888"}}>円</div>
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
                const excludeBashiro=bashiroExclude[s.id]||false;
                const hasBashiro=Object.values(s.bashiro||{}).some(v=>N(v)!==0);
                const sortedMems=[...mems].sort((a,b)=>(tot[b.id]?.sc||0)-(tot[a.id]?.sc||0));
                return (
                  <div key={s.id} style={S.card()}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isOpen?10:0}}>
                      <div onClick={()=>setHistOpen(prev=>({...prev,[s.id]:!isOpen}))} style={{cursor:"pointer",flex:1,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontWeight:500,fontSize:12,color:"#ccc"}}>📅 {s.date}（{s.rounds.length}半荘）</span>
                        <span style={{fontSize:10,color:"#555"}}>{rL}</span>
                        {hasBashiro && (
                          <span
                            onClick={e=>{e.stopPropagation();setBashiroExclude(prev=>({...prev,[s.id]:!excludeBashiro}));}}
                            style={{fontSize:9,cursor:"pointer",padding:"2px 6px",borderRadius:4,border:`1px solid ${excludeBashiro?"rgba(255,165,0,0.4)":"rgba(52,152,219,0.3)"}`,background:excludeBashiro?"rgba(255,165,0,0.12)":"rgba(52,152,219,0.15)",color:excludeBashiro?"#f39c12":"#7fb9e0",userSelect:"none"}}
                          >
                            {excludeBashiro?"場代抜き":"場代込み"}
                          </span>
                        )}
                        <span style={{fontSize:14,color:"#888",marginLeft:"auto"}}>{isOpen?"▲":"▼"}</span>
                      </div>
                      <div style={{display:"flex",gap:4,marginLeft:8}}>
                        <button onClick={e=>{e.stopPropagation();setEditSession(JSON.parse(JSON.stringify(s)));}} style={S.bs({fontSize:11,color:"#7fb9e0"})}>✏️ 編集</button>
                        <button onClick={e=>{e.stopPropagation();setAuditWho(null);setAuditModal({action:"delete",label:`${s.date}の対局`,onConfirm:(name)=>deleteSession(s.id,name)});}} style={S.bs({fontSize:11,color:"#e74c3c"})}>🗑️</button>
                      </div>
                    </div>
                    {!isOpen && (
                      <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:6}}>
                        {sortedMems.map((m,i)=>{
                          const playedRounds = s.rounds.filter(r=>r.players.map(Number).includes(m.id)).length;
                          const bashiroAmount = tot[m.id]?.ba || 0;
                          const displayAmount = excludeBashiro ? (tot[m.id]?.seisan||0) : (tot[m.id]?.kati||0);
                          return (
                            <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 7px",background:i===0?"rgba(231,76,60,0.08)":"rgba(255,255,255,0.03)",borderRadius:6}}>
                              <span style={{fontSize:12,width:20,textAlign:"center"}}>{RI[i]||`${i+1}位`}</span>
                              <Av m={m} sz={22}/>
                              <div style={{fontSize:12,fontWeight:500,flex:1}}>
                                {m.name}
                                <span style={{fontSize:10,color:"#666",marginLeft:4}}>({playedRounds}半荘)</span>
                              </div>
                              <div style={{fontSize:13,fontWeight:"bold",color:cc(tot[m.id]?.sc||0)}}>{fw(tot[m.id]?.sc||0)}</div>
                              <div style={{fontSize:11,color:"#888"}}>chip{fw(tot[m.id]?.chip||0)}</div>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
                                <div style={{fontSize:11,fontWeight:"bold",color:cc(displayAmount)}}>{fwy(displayAmount)}</div>
                                {hasBashiro && !excludeBashiro && bashiroAmount !== 0 && (
                                  <div style={{fontSize:9,color:"#666"}}>場代{bashiroAmount>=0?"+":""}{bashiroAmount.toLocaleString()}円</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
            {addStep>0 && addRounds.length>0 && (
              <div style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#7fb9e0",display:"flex",alignItems:"center",gap:6}}>
                💾 入力中のデータが復元されました（{addRounds.length}半荘入力済み）全員のスマホで共有中
              </div>
            )}
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
                
                {/* 対局中のメンバー追加 */}
                <div style={{marginBottom:8}}>
                  <button onClick={()=>setShowMemberAdd(p=>!p)} style={{...S.bs({width:"100%",fontSize:11,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.3)",color:"#7fb9e0"})}}>
                    {showMemberAdd?"✕ 閉じる":"➕ メンバー追加（途中参加）"}
                  </button>
                  {showMemberAdd && (
                    <div style={{marginTop:6,background:"rgba(52,152,219,0.06)",borderRadius:7,padding:8}}>
                      <div style={{fontSize:10,color:"#aaa",marginBottom:6}}>次の半荘から参加するメンバーを追加</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {members.filter(m=>!addSel.includes(m.id)).map(m=>(
                          <button key={m.id} onClick={()=>{
                            setAddSel(prev=>[...prev,m.id]);
                            setRpSc(prev=>({...prev,[m.id]:""}));
                            setShowMemberAdd(false);
                          }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:6,cursor:"pointer",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontSize:12}}>
                            <Av m={m} sz={24}/>
                            <span>{m.name}</span>
                          </button>
                        ))}
                        {members.filter(m=>!addSel.includes(m.id)).length===0 && (
                          <div style={{fontSize:10,color:"#666",textAlign:"center",padding:8}}>全メンバーが参加済みです</div>
                        )}
                      </div>
                    </div>
                  )}
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
                    <button style={{...S.br(),opacity:isSaving?0.5:1}} disabled={isSaving} onClick={saveSession}>{isSaving?"保存中...":"💾 保存する"}</button>
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
      {/* confetti */}
      {confettiShown && <Confetti/>}

      {/* 操作者確認モーダル */}
      {auditModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a2e",borderRadius:12,padding:20,width:"100%",maxWidth:340,border:"1px solid rgba(255,255,255,0.12)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>
              {auditModal.action==="delete"?"🗑️ 削除の確認":"✏️ 編集の確認"}
            </div>
            <div style={{fontSize:11,color:"#888",marginBottom:14}}>
              {auditModal.label} を{auditModal.action==="delete"?"削除":"保存"}します。<br/>操作者を選択してください。
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
              {members.map(m=>(
                <div key={m.id} onClick={()=>setAuditWho(m.id)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",borderRadius:8,cursor:"pointer",
                    border:`1px solid ${auditWho===m.id?"#3498db":"rgba(255,255,255,0.1)"}`,
                    background:auditWho===m.id?"rgba(52,152,219,0.2)":"rgba(255,255,255,0.03)"}}>
                  <Av m={m} sz={28}/>
                  <div style={{fontSize:10,color:"#ccc",textAlign:"center"}}>{m.name}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setAuditModal(null);setAuditWho(null);}} style={S.bs({flex:1,fontSize:12})}>キャンセル</button>
              <button
                disabled={!auditWho}
                onClick={()=>{
                  const name = members.find(m=>m.id===auditWho)?.name||"不明";
                  auditModal.onConfirm(name);
                  setAuditModal(null);
                  setAuditWho(null);
                }}
                style={{...S.br({flex:1,fontSize:12}),opacity:auditWho?1:0.4}}>
                {auditModal.action==="delete"?"削除する":"保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
          background: toast.type==="error" ? "rgba(231,76,60,0.95)" : "rgba(46,204,113,0.95)",
          color:"#fff", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:500,
          zIndex:9999, boxShadow:"0 4px 12px rgba(0,0,0,0.4)", maxWidth:"90%",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
