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
const VENUES = ["サクセス", "下赤塚麻雀カフェ", "下赤塚ポッチ", "池袋カクレマ", "池袋PSJ北口"];

// 更新履歴 - 新しい機能は必ず今日の日付で追加してください
// 今日: 2026-05-21
const CHANGELOG = [
  { date:"2026-06-01", features:[
    "バグ修正：観覧者が新規でページを開いたときLIVE状態・スコアが表示されない問題を修正（drafts取得の.single()エラーが原因）",
    "半荘入力中に「✕ 中止」ボタンを追加（確定ボタン隣・確認ダイアログ付き・入力リセットしてLIVE継続）",
    "設定タブのロゴ下に公式Tシャツ販売セクションを追加（画像・価格・購入リンク）",
  ]},
  { date:"2026-05-21", features:[
    "外馬：的中ランキングの名前タップで馬券詳細モーダルを表示（日付・ラウンド・馬券種・倍率・賭けチップ・収益を一覧表示、収支サマリーも表示）",
    "点数入力中に抜け番を変更できる「✏️ 抜け番を変更」ボタンを追加（5人以上の場合のみ表示・押すと抜け番選択に戻り入力点数をリセット）",
    "外馬：別端末から重複購入時に専用エラーメッセージを表示（UNIQUE制約違反error.code=23505を検知）",
    "ヘッダーバージョン表記をv1.6→v1.7に変更",
    "メインタブに「🎌 大会モード」を追加（🃏と➕の間に配置・大会前に実装予定の工事中ページ）",
    "Mリーグタブ内に「📋 規定達成状況を見る」折り畳みメニュー追加(前期・後期の規定打席進捗を棒グラフ表示・あと何回で達成かを表示)",
  ]},
  { date:"2026-05-20", features:[
    "Mリーグ個人タイトル：個人スコアの表示を「累積非表示・1半荘あたりの平均のみ」に変更(累積スコア表示による嫌味感を回避)",
    "Mリーグ個人タイトル：最多トップの表示を「規定打席換算回数」に変更(トップ率 × 規定半荘で算出、100%超え問題を解消)",
    "Mリーグ個人タイトル：折り畳みメニュー内の説明文に「ランキング順位の決定方法」セクションを追加(効率ベースのロジックを明示)",
    "Mリーグ個人タイトル：個人スコア・最多トップのランキング基準を「効率」に変更(1半荘あたりの平均で順位決定、累積スコア・トップ回数をメイン表示して実感性を両立)",
    "Mリーグ個人タイトル：個人スコア・最多トップを「前期・後期制」の規定打席システムで実装（規定打席=その期の全参加者半荘数合計÷参加人数、両方達成なら平均スコアが高い方の期を採用）",
    "Mリーグ個人タイトル：緩和打席（規定の85%）達成時のスコアペナルティ実装（段階係数：期前半1.0倍・中期0.6倍・後期0.25倍、後半に達成するほど有利）",
    "Mリーグ個人タイトル：説明を折り畳みメニュー化（規定打席制度・ノミネート条件・緩和打席・段階係数の表示）",
    "UI改善：Mリーグタブの王冠絵文字（🏆）を削除（生涯成績タブの王冠と被るため）",
    "UI改善：Mリーグタブの枠線・タイトル・ボタンの色を黄色から青に変更",
  ]},
  { date:"2026-05-19", features:[
    "UI改善：成績概要のアイコンをタップするとメンバー詳細モーダルを表示（拡大アイコン・成績一覧・生涯成績ページへのリンク）",
    "バグ修正：Mリーグの最高スコアを正しい仕様に修正（70点以上叩いた時の生持ち点ベースに）",
    "バグ修正：Mリーグタブを開くと白い画面になる問題を修正（scoresのデータ構造誤りを修正）",
    "Mリーグ部門名をMリーグ準拠に変更（最高得点賞→最高スコア、4着回避賞→4着回避率、個人スコア賞→個人スコア、最多トップ賞→最多トップ）",
    "UI改善：設定ボタンを月選択行からメインメニュー（メンバー管理の右隣）に移動",
    "Mリーグ指標 個人タイトル機能を追加（💥最高スコア・🛡️4着回避率の2部門・年間20半荘以上参加者対象）",
    "個人スコア・最多トップは実装中表示（参加数による有利不利を調整中）",
    "外馬機能：現在の半荘の全員予想一覧をトラック下部に表示（配当チップ多い順・自分の予想をハイライト）",
    "抜け番情報のリアルタイム同期：抜け番選択が全端末に即時反映されるよう改善",
    "重大バグ修正：抜け番選択がSupabaseに保存されず、アプリ再起動で外馬機能が使えなくなる問題を修正(drafts.skenbansカラム追加)",
    "バグ修正：対局開始後にルール設定画面で項目を編集すると開始時刻が上書きされる問題を修正",
    "外馬レースの表記統一（旧：競馬レース）・ルール説明追加",
    "期間フィルターの初期値を「今月」に変更（従来は全期間）",
    "ハイ&ローをメインメニューに移動（ダッシュボードのサブタブから削除）",
    "MVP紙吹雪を1日1回だけに修正（毎回発火から1日1回に変更）",
    "バグ修正：履歴タブで期間フィルター（全期間・今年・今月）が効かない問題を修正",
    "バグ修正：MVP紙吹雪が1日1回ではなく毎回発火していた問題を修正(UTC基準を日本時間に変更)",
    "v1.6（安定版）表記をヘッダーに追加",
  ]},
  { date:"2026-05-18", features:[
    "外馬機能：5人以上参加時に対応（各半荘開始時に抜け番をタップして複数選択）",
    "抜け番複数選択UI追加（4人が確定するまで選択可能、6人以上時は2人以上の抜け番選択に対応）",
    "競馬場背景のイラスト化（スタンド・観客・太陽・雲・フェンス等をSVGで実装）",
    "ゴール板：縦の市松模様をコース中央下から上に表示するよう修正",
    "馬の着順リアルタイム表示（レース中に1着〜4着の順位を表示）",
    "外馬参加者の修正：全メンバーが馬券購入可能に（対局者・抜け番・外馬すべて対応）",
    "チップ自由入力：賭けチップ枚数を1〜保有数の範囲でスライダー入力可能に",
    "チップリアルタイム減算：馬券購入時に即時チップ消費",
    "払い戻し即時反映：半荘保存時に的中チップを即時加算",
    "削除時チップ返却：対局削除時に消費チップを自動返却・馬券無効化",
    "個人外馬履歴：メンバータップで獲得・消費チップ履歴を表示",
    "外馬タブ白画面バグ修正（render中setState禁止）",
    "投票時間制限：参加メンバー全員（対局者+抜け番）= 10分制限、外馬 = 無制限",
    "外馬ルール表記追加",
    "🏇 外馬タブを独立タブ化（💀の右側に配置、ダッシュボードから分離）",
    "外馬ルールに「1半荘1馬券のみ」「生涯参加数でチップ蓄積」を明記",
    "Supabase Realtimeに drafts/race_bets を追加 → LIVE状態・馬券が即時同期",
    "抜け番選択(rpSkenbans)と外馬選択(raceSelf)をlocalStorageに永続化",
    "対局を「✖破棄」した時もrace_betsを削除してチップ・ランキング無効化",
  ]},
  { date:"2026-05-14", features:[
    "バグ修正：アプリを閉じてもLIVEモードが復元されるように修正（ドラフト保存にステップ情報を追加）",
    "バグ修正：LIVE中に外馬モードが表示されない問題を修正",
    "馬券購入受付時間を変更（外馬は結果確定まで、対局メンバーは10分以内）",
    "LIVEバッジのバグ修正（保存後も消えない問題を解消）",
    "外馬レースが対局中に表示されないバグ修正（LIVE判定を緩和）",
    "外馬レース機能：フィニッシュ掲示板・写真判定演出・馬券的中ランキング実装",
    "外馬レース機能：レースを「BGM的に流れる演出」に調整（1周120秒、ゴール意識を排除）",
    "外馬レース機能：楕円トラックの周回アニメ実装（強さベース＋出遅れ・大逃げ・追い上げ）",
    "外馬レース機能：馬券購入UI実装（単勝・馬連・三連単・四連単、5分間の購入受付）",
    "外馬レース機能：オッズ計算ロジック実装（強さスコア・単勝・馬連・三連単・四連単）",
    "外馬レース機能の準備（既存の1位・最下位予想を撤去、race_betsテーブル接続）",
    "ゴミ箱機能追加（削除した対局・メンバーを30日間保管、復活・完全削除が可能）",
    "闘牌場所のデフォルトをサクセスに変更",
    "終了予定時間に✕クリアボタンを追加（iOSのブラウザ標準ボタンが動作しない問題を解消）",
  ]},
  { date:"2026-05-13", features:[
    "ルール設定に闘牌場所プルダウンを追加（LIVE・履歴に表示）",
    "ルール設定に終了予定時間を追加（LIVE画面に表示）",
    "対局開始時に開始時間を自動記録、保存時に終了時間を自動記録",
    "対戦履歴に開始・終了時間を表示",
    "設定タブのアプリにする方法にURLコピーボタンを追加",
  ]},
  { date:"2026-05-12", features:[
    "生涯成績テーブルに月間MVP1位回数を追加（👑月MVP列・ソート対応）",
    "外馬モードに1位・4位のオッズ表示追加（直近10半荘の成績から自動計算）",
    "ハイ&ローのカードを絶対値表示に変更・遊び方をタブ内に移動・設定タブから削除",
    "ハイ&ローをタブ内で完結化（2人選択UI内蔵）",
    "ハイ&ローを独立タブ化（外馬の隣）",
    "外馬モード追加（LIVE中に1位・最下位を予想、精度ランキング表示）",
    "MVP条件変更（スコア+100pt以上 かつ 10半荘以上参加）",
    "月別プルダウンフィルター追加（全期間〜今月の間に月を選んで表示）",
    "操作ログ機能追加（対局の削除・編集時に操作者を記録）",
    "設定画面にJSONバックアップ書き出し機能追加（全対戦データをファイルで保存可能）",
    "LINEシェア機能追加（設定タブからアプリURLをLINEで送信可能）",
    "ESLintエラー修正・バグ修正多数",
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
      totals[id].seisan += (tot[id]?.sc || 0); // 純粋なスコアポイント
      totals[id].rounds += sess.rounds.filter(r => r.players.map(Number).includes(Number(id))).length;
    });
  });
  return members
    .filter(m => {
      const t = totals[m.id];
      if (!t || t.rounds === 0) return false;
      return t.seisan >= 100 && t.rounds >= 10; // 両方満たす場合のみ
    })
    .map(m => m.id);
}

// MVP条件を満たした中で最上位（seisan最大）の1人のIDを返す
function calcTopMvpId(sessions, members, targetMonth) {
  const ids = calcMvpIds(sessions, members, targetMonth);
  if (ids.length === 0) return null;
  const filtered = sessions.filter(s => s.date.startsWith(targetMonth));
  const seisanMap = {};
  ids.forEach(id => { seisanMap[id] = 0; });
  filtered.forEach(sess => {
    const tot = calcTotals(sess);
    ids.forEach(id => { seisanMap[id] = (seisanMap[id]||0) + (tot[id]?.seisan||0); });
  });
  return ids.reduce((best, id) => seisanMap[id] > (seisanMap[best]||0) ? id : best, ids[0]);
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

// ========================================================
// 外馬レース機能：強さスコア・オッズ計算
// ========================================================

// 各プレイヤーの強さスコアを算出（指定された4人の対局相手リストに対する相対値）
function calcHorseStrength(sessions, members, playerIds) {
  // playerIds: その半荘の参加者4人のID配列
  const result = {};

  playerIds.forEach(targetId => {
    const sid = String(targetId);
    let games = 0, r1 = 0;
    let rankSum = 0;

    // 直近10半荘の集計用
    const recentRounds = [];

    // 対戦相手との直接対決
    const vsRecords = {}; // { opponentId: { wins, total } }
    playerIds.forEach(opId => {
      if (opId !== targetId) vsRecords[opId] = { wins: 0, total: 0 };
    });

    [...sessions].reverse().forEach(s => {
      if (!s.members.map(Number).includes(targetId)) return;
      s.rounds.forEach(r => {
        const rPlayers = r.players.map(Number);
        if (!rPlayers.includes(targetId)) return;
        const sorted = [...rPlayers].sort((a, b) =>
          N(r.scores[String(b)] ?? r.scores[b]) - N(r.scores[String(a)] ?? r.scores[a])
        );
        const rank = sorted.indexOf(targetId) + 1;
        games++;
        rankSum += rank;
        if (rank === 1) r1++;

        // 直近10半荘
        if (recentRounds.length < 10) recentRounds.push(rank);

        // 対戦相手との直接対決
        const targetScore = N(r.scores[sid] ?? r.scores[targetId]);
        rPlayers.forEach(opId => {
          if (opId === targetId) return;
          if (!vsRecords[opId]) return;
          const opScore = N(r.scores[String(opId)] ?? r.scores[opId]);
          vsRecords[opId].total++;
          if (targetScore > opScore) vsRecords[opId].wins++;
        });
      });
    });

    const topRate = games > 0 ? (r1 / games) * 100 : 0;
    const avgRank = games > 0 ? rankSum / games : 2.5;
    const recentTopRate = recentRounds.length > 0
      ? (recentRounds.filter(r => r === 1).length / recentRounds.length) * 100
      : 0;
    let vsWinRateAvg = 0;
    let vsCount = 0;
    Object.values(vsRecords).forEach(v => {
      if (v.total > 0) {
        vsWinRateAvg += (v.wins / v.total) * 100;
        vsCount++;
      }
    });
    if (vsCount > 0) vsWinRateAvg /= vsCount;

    // 強さスコア（経験値が浅い人もある程度は出走できるよう最低保証あり）
    const strength = Math.max(
      10, // 最低保証
      topRate * 1.0
      + (4.0 - avgRank) * 10
      + recentTopRate * 0.5
      + vsWinRateAvg * 0.3
    );

    result[targetId] = {
      strength,
      games,
      topRate,
      avgRank,
      recentTopRate,
      vsWinRateAvg
    };
  });

  return result;
}

// 単勝オッズを計算（4人の強さ比から）
function calcTanshoOdds(strengthMap) {
  const total = Object.values(strengthMap).reduce((s, v) => s + v.strength, 0);
  const result = {};
  Object.keys(strengthMap).forEach(id => {
    const share = strengthMap[id].strength / total; // この馬が勝つ「確率」近似
    // 100% / 確率 = オッズ。最低1.1倍、最高99.9倍
    const raw = 1 / share;
    result[id] = Math.max(1.1, Math.min(99.9, Math.round(raw * 10) / 10));
  });
  return result;
}

// 馬連オッズ：単勝オッズの幾何平均ベース、上限15倍
function calcUmarenOdds(idA, idB, tanshoOdds) {
  // 幾何平均で単勝オッズを合成（積よりも抑えられる）
  const avgOdds = Math.sqrt(tanshoOdds[idA] * tanshoOdds[idB]);
  const raw = avgOdds * 2.0;
  return Math.max(2.0, Math.min(15.0, Math.round(raw * 10) / 10));
}

// 三連単オッズ：単勝オッズの幾何平均ベース、上限25倍
function calcSanrentanOdds(id1, id2, id3, tanshoOdds) {
  const avgOdds = Math.pow(tanshoOdds[id1] * tanshoOdds[id2] * tanshoOdds[id3], 1/3);
  const raw = avgOdds * 3.5;
  return Math.max(5.0, Math.min(25.0, Math.round(raw * 10) / 10));
}

// 四連単オッズ：単勝オッズの幾何平均ベース、上限35倍
function calcYonrentanOdds(id1, id2, id3, id4, tanshoOdds) {
  const avgOdds = Math.pow(tanshoOdds[id1] * tanshoOdds[id2] * tanshoOdds[id3] * tanshoOdds[id4], 1/4);
  const raw = avgOdds * 5.0;
  return Math.max(10.0, Math.min(35.0, Math.round(raw * 10) / 10));
}

function Av({ m, sz, onClick }) {
  if (!m) return <div style={{ width:sz, height:sz, borderRadius:"50%", background:"#333", margin:"0 auto" }} />;
  const style = { width:sz, height:sz, borderRadius:"50%", margin:"0 auto", cursor: onClick ? "pointer" : "default" };
  if (m.photo) return (
    <div style={{ ...style, overflow:"hidden" }} onClick={onClick}>
      <img src={m.photo} alt={m.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
    </div>
  );
  const c = mc(m);
  return (
    <div style={{ ...style, background:c, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:600, fontSize:Math.round(sz*.4) }} onClick={onClick}>
      {m.name.slice(0,1)}
    </div>
  );
}

// Confetti紙吹雪コンポーネント
// ========================================================
// 外馬レース：楕円トラックアニメーション
// ========================================================
function RaceTrack({ playingMembers, strengthMap, mySelection, betType }) {
  // 各馬の位置（0〜1の周回進度、1で1周）
  const [positions, setPositions] = useState(() =>
    playingMembers.map(() => 0)
  );
  // 各馬の現在の速度倍率（基本ペース + ランダム変動）
  const speedRefs = useRef(playingMembers.map(() => 1.0));
  // 各馬の「ドラマイベント」状態
  const eventRefs = useRef(playingMembers.map(() => ({type:"normal", until:0})));

  // 基本速度：強さに応じた倍率（強い馬ほど速い）
  // 1周120秒 → 毎フレーム16ms で 1/(120*60) ずつ進む基本進度
  const baseProgressPerFrame = 1 / (120 * 60);

  useEffect(() => {
    let raf;
    let lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      setPositions(prev => prev.map((p, i) => {
        const m = playingMembers[i];
        const strength = strengthMap?.[m?.id]?.strength || 30;
        // 強さに応じた基本速度倍率（50を基準、強いほど速い）
        const baseSpd = 0.85 + (strength / 100) * 0.3; // 0.85〜1.15程度

        // ドラマイベント管理
        const ev = eventRefs.current[i];
        if (now > ev.until) {
          // 5%の確率でドラマイベント発生
          const r = Math.random();
          if (r < 0.01) {
            // 出遅れ・スタミナ切れ（5秒間 速度0.4倍）
            eventRefs.current[i] = {type:"slow", until: now + 5000};
          } else if (r < 0.02) {
            // 大逃げ（4秒間 速度1.6倍）
            eventRefs.current[i] = {type:"dash", until: now + 4000};
          } else if (r < 0.03) {
            // 追い上げ（3秒間 速度1.4倍）
            eventRefs.current[i] = {type:"chase", until: now + 3000};
          } else {
            eventRefs.current[i] = {type:"normal", until: now + 1000};
          }
        }

        // 速度修飾
        let evMod = 1.0;
        if (ev.type === "slow") evMod = 0.4;
        else if (ev.type === "dash") evMod = 1.6;
        else if (ev.type === "chase") evMod = 1.4;

        // 小さな揺らぎ
        const jitter = 0.92 + Math.random() * 0.16;

        const totalSpd = baseSpd * evMod * jitter;
        speedRefs.current[i] = totalSpd;

        // 進度更新（dtを考慮、16msあたり1フレーム基準）
        const advance = baseProgressPerFrame * totalSpd * (dt / 16);
        return (p + advance) % 1;
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playingMembers, strengthMap, baseProgressPerFrame]);

  // 楕円トラック：cx=140, cy=70, rx=110, ry=45
  const cx = 140, cy = 70, rx = 110, ry = 45;
  // 馬を異なる半径のレーン上に配置（内側〜外側 4レーン）
  const laneOffsets = [0, 7, 14, 21];

  // 自分が賭けた馬のID
  const myHorseIds = betType ? mySelection : [];

  return (
    <div style={{
      background:"linear-gradient(180deg, #87CEEB 0%, #90EE90 40%, #228B22 100%)",
      border:"1px solid rgba(255,255,255,0.15)", borderRadius:10,
      padding:"8px", marginBottom:10, position:"relative", overflow:"hidden"
    }}>
      {/* 競馬場背景イラスト */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:0}} viewBox="0 0 280 140" preserveAspectRatio="none">
        {/* 太陽 */}
        <circle cx="240" cy="20" r="15" fill="#FFD700" opacity="0.8"/>
        
        {/* 雲 */}
        <ellipse cx="50" cy="15" rx="20" ry="8" fill="#FFF" opacity="0.6"/>
        <ellipse cx="65" cy="12" rx="15" ry="6" fill="#FFF" opacity="0.6"/>
        <ellipse cx="210" cy="25" rx="18" ry="7" fill="#FFF" opacity="0.5"/>
        <ellipse cx="225" cy="22" rx="14" ry="5" fill="#FFF" opacity="0.5"/>
        
        {/* スタンド（観客席） */}
        <g opacity="0.5">
          {/* 左スタンド */}
          <polygon points="10,80 20,50 35,55 25,85" fill="#6B4423"/>
          <polygon points="20,80 32,48 45,54 35,85" fill="#8B5A3C"/>
          <polygon points="32,80 43,48 56,54 46,85" fill="#6B4423"/>
          
          {/* 右スタンド */}
          <polygon points="245,80 255,50 270,55 260,85" fill="#6B4423"/>
          <polygon points="235,80 248,48 260,54 248,85" fill="#8B5A3C"/>
          <polygon points="223,80 236,48 248,54 237,85" fill="#6B4423"/>
        </g>
        
        {/* 観客シルエット */}
        <g fill="#000" opacity="0.15">
          <circle cx="15" cy="65" r="2"/>
          <circle cx="25" cy="70" r="2"/>
          <circle cx="35" cy="68" r="2"/>
          <circle cx="42" cy="72" r="2"/>
          <circle cx="250" cy="65" r="2"/>
          <circle cx="260" cy="70" r="2"/>
          <circle cx="270" cy="68" r="2"/>
          <circle cx="235" cy="72" r="2"/>
        </g>
        
        {/* フェンス */}
        <rect x="0" y="115" width="280" height="2" fill="#8B4513" opacity="0.7"/>
        <line x1="0" y1="110" x2="280" y2="110" stroke="#A0522D" strokeWidth="1" opacity="0.5"/>
      </svg>
      
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"0 4px",position:"relative",zIndex:1}}>
        <div style={{fontSize:10,color:"#aaa"}}>🏇 レース実況中継</div>
        <div style={{fontSize:9,color:"#888",display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:"#e74c3c",animation:"pulse 1.5s infinite"}}/>
          LIVE
        </div>
      </div>
      <svg viewBox="0 0 280 140" style={{width:"100%",height:"auto",display:"block",position:"relative",zIndex:1}}>
        {/* 楕円トラック（外） */}
        <ellipse cx={cx} cy={cy} rx={rx+24} ry={ry+24}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        {/* 楕円トラック（内） */}
        <ellipse cx={cx} cy={cy} rx={rx-4} ry={ry-4}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        {/* レーン線（4本） */}
        {laneOffsets.map((o, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx+o} ry={ry+o}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="2,2"/>
        ))}

        {/* ゴールライン（楕円コース中央下を縦に貫く） */}
        {(() => {
          const gx = cx;                    // x=140 中央
          // cy=70, ry=45 → 楕円の最下端=115、外側レーン(offset=21)の最下端=136
          const gTop = cy + ry + 2;         // コース内側下端より少し下
          const gBot = cy + ry + 30;        // 外側レーンを確実に越える
          const lineH = 6;
          const lineW = 5;
          const squares = Math.ceil((gBot - gTop) / lineH);
          return (
            <g>
              {Array.from({length: squares}).map((_, i) => (
                <rect key={i}
                  x={gx - lineW / 2} y={gTop + i * lineH}
                  width={lineW} height={lineH}
                  fill={i % 2 === 0 ? "#fff" : "#222"}
                  opacity="0.95"/>
              ))}
            </g>
          );
        })()}

        {/* 現在の着順表示（進捗順に着番を計算） */}
        {playingMembers.map((m, i) => {
          const angle = positions[i] * Math.PI * 2 - Math.PI/2;
          const horseRx = rx + laneOffsets[i];
          const horseRy = ry + laneOffsets[i];
          const x = cx + horseRx * Math.cos(angle);
          const y = cy + horseRy * Math.sin(angle);
          
          // 現在の周回進度でソートして着順を算出
          const positionsArray = positions.map((p, idx) => ({ idx, pos: p }));
          const sorted = [...positionsArray].sort((a, b) => b.pos - a.pos); // 進捗が大きい順
          const currentRank = sorted.findIndex(s => s.idx === i) + 1;
          
          return (
            <text key={`rank-${m.id}`} x={x} y={y-12} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold"
              style={{background:"rgba(0,0,0,0.5)",textShadow:"0 0 3px rgba(0,0,0,0.8)"}}>
              {currentRank}着
            </text>
          );
        })}

        {/* 馬 */}
        {playingMembers.map((m, i) => {
          // 0=スタートライン（楕円の右端）から時計回り風（実は反時計回り）
          const angle = positions[i] * Math.PI * 2 - Math.PI/2; // 上から開始
          const horseRx = rx + laneOffsets[i];
          const horseRy = ry + laneOffsets[i];
          const x = cx + horseRx * Math.cos(angle);
          const y = cy + horseRy * Math.sin(angle);
          const colors = ["#e74c3c","#3498db","#2ecc71","#f1c40f"];
          const isMine = myHorseIds.includes(m.id);
          const ev = eventRefs.current[i];
          return (
            <g key={m.id} transform={`translate(${x},${y})`}>
              {/* 自分の馬は光るリング */}
              {isMine && (
                <circle cx="0" cy="0" r="9"
                  fill="none" stroke="#ffd700" strokeWidth="1.2"
                  opacity="0.8">
                  <animate attributeName="r" values="9;12;9" dur="1.2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite"/>
                </circle>
              )}
              <circle cx="0" cy="0" r="7" fill={colors[i]} stroke="#fff" strokeWidth="1"/>
              <text x="0" y="2.5" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="bold">{i+1}</text>
              {/* イベント表示 */}
              {ev.type === "dash" && (
                <text x="0" y="-9" fontSize="6" fill="#f39c12" textAnchor="middle">💨</text>
              )}
              {ev.type === "chase" && (
                <text x="0" y="-9" fontSize="6" fill="#3498db" textAnchor="middle">⚡</text>
              )}
              {ev.type === "slow" && (
                <text x="0" y="-9" fontSize="6" fill="#888" textAnchor="middle">💤</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
function MvpAv({ m, sz, onClick }) {
  return (
    <div style={{position:"relative", display:"inline-block", cursor: onClick ? "pointer" : "default"}} onClick={onClick}>
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
      if (!value) return;
      if (value === "0") { onChange("-0"); return; } // 0から負の入力を可能にする
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

// MVP順位別スタイル
const MVP_STYLE = {
  1: { border:"rgba(241,196,15,0.6)",  bg:"rgba(241,196,15,0.13)",  badge:"linear-gradient(90deg,#f1c40f,#e67e22)", badgeColor:"#000", label:"今月MVP" },
  2: { border:"rgba(192,192,192,0.6)", bg:"rgba(192,192,192,0.09)", badge:"linear-gradient(90deg,#c0c0c0,#909090)", badgeColor:"#000", label:"今月MVP" },
  3: { border:"rgba(205,127,50,0.6)",  bg:"rgba(205,127,50,0.09)",  badge:"linear-gradient(90deg,#cd7f32,#a0522d)", badgeColor:"#fff", label:"今月MVP" },
};

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
  const [period, setPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(""); // "YYYY-MM" or ""
  const [confettiShown, setConfettiShown] = useState(false);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lr, setLr] = useState({ kaeshi:30000, starting:25000, uma:[20,10,-10,-20], scoreRate:30, chipRate:50, venue:"サクセス" });
  const [lb, setLb] = useState(null);
  const [calY, setCalY] = useState(new Date().getFullYear());
  const [calM, setCalM] = useState(new Date().getMonth());
  const [calSel, setCalSel] = useState(null);
  const [mfShow, setMfShow] = useState(false);
  const [mfName, setMfName] = useState("");
  const [mfPhoto, setMfPhoto] = useState(null);

  const [addStep, setAddStep] = useState(0);
  const [rpSkenbans, setRpSkenbans] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tleague_rp_skenbans") || "[]"); } catch { return []; }
  });
  const [addEndTimePlan, setAddEndTimePlan] = useState(""); // 終了予定時間（表示のみ・DB保存なし）
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const [addDate, setAddDate] = useState(today());
  const [addRules, setAddRules] = useState({ kaeshi:30000, starting:25000, uma:[20,10,-10,-20], scoreRate:30, chipRate:50, venue:"サクセス" });
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
  const [trashSessions, setTrashSessions] = useState([]);
  const [trashMembers, setTrashMembers] = useState([]);
  const [auditModal, setAuditModal] = useState(null); // {action:"delete"|"edit", label, onConfirm}
  const [memberDetailModal, setMemberDetailModal] = useState(null); // {m: member, stats: {...}}
  const [auditWho, setAuditWho] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [memberEditId, setMemberEditId] = useState(null);
  const [memberEditName, setMemberEditName] = useState("");
  const [editKeypadActive, setEditKeypadActive] = useState(null); // "ri-pid"
  const [editChipKeypadActive, setEditChipKeypadActive] = useState(null); // チップ編集用テンキー
  const [dashSub, setDashSub] = useState("summary");
  const [showMLeague, setShowMLeague] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [raceBets, setRaceBets] = useState([]);
  const [raceSelf, setRaceSelf] = useState(() => {
    try { const v = localStorage.getItem("tleague_race_self"); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const [raceBetType, setRaceBetType] = useState(null);
  const [raceSelection, setRaceSelection] = useState([]);
  const [raceBetSubmitting, setRaceBetSubmitting] = useState(false);
  const [raceBetAmount, setRaceBetAmount] = useState(1); // 賭けチップ枚数
  const [racePersonHistory, setRacePersonHistory] = useState(null); // 個人履歴表示対象ID
  const [raceBetDetailId, setRaceBetDetailId] = useState(null); // 的中ランキング詳細モーダル
  const [raceStartTimes, setRaceStartTimes] = useState({}); // { [round_index]: timestamp_ms }
  const [, setRaceNowTick] = useState(0); // 5分タイマー更新用ダミーstate
  // raceBetsRef：採点useEffect内でクロージャ問題を防ぐため、常に最新のraceBetsを参照
  const raceBetsRef = useRef([]);
  // iAmEditorRef：このデバイスが実際に下書き保存した編集者かどうかを管理
  const iAmEditorRef = useRef(false);
  const [showGoalScene, setShowGoalScene] = useState(false); // 写真判定ゴールシーン展開
  const [sortKey, setSortKey] = useState("sc");
  const [sortAsc, setSortAsc] = useState(false);
  const [h2hA, setH2hA] = useState(null);
  const [h2hB, setH2hB] = useState(null);
  const [hiloSelA, setHiloSelA] = useState(null);
  const [hiloSelB, setHiloSelB] = useState(null);
  const [lifeDetail, setLifeDetail] = useState(null);
  const [hiloMode, setHiloMode] = useState(false);
  const [hiloCards, setHiloCards] = useState([]); // カード値の配列
  const [hiloCardIdx, setHiloCardIdx] = useState(0); // 現在のカードindex
  const [hiloSenko, setHiloSenko] = useState(null); // 先攻 "a" or "b"
  const [hiloRound, setHiloRound] = useState(0); // 0-4
  const [hiloSubTurn, setHiloSubTurn] = useState("senko"); // "senko" or "koko"
  const [hiloScoreA, setHiloScoreA] = useState(0);
  const [hiloScoreB, setHiloScoreB] = useState(0);
  const [hiloLog, setHiloLog] = useState([]); // [{round, who, pred, result, prev, next}]
  const [hiloPhase, setHiloPhase] = useState("idle"); // idle|decide|playing|result
  const [hiloReveal, setHiloReveal] = useState(null); // 直前の予想結果表示用
  const [, ] = useState(0); // legacy placeholder
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

  // MVP内での順位マップ {id: 1|2|3|4} — seisan降順
  const mvpRanks = (() => {
    if (mvpIds.length === 0) return {};
    const targetMonth = period === "pick" ? selectedMonth : currentMonth;
    const filtered = sessions.filter(s => s.date.startsWith(targetMonth));
    const seisanMap = {};
    mvpIds.forEach(id => { seisanMap[id] = 0; });
    filtered.forEach(sess => {
      const tot = calcTotals(sess);
      mvpIds.forEach(id => { seisanMap[id] = (seisanMap[id]||0) + (tot[id]?.seisan||0); });
    });
    const sorted = [...mvpIds].sort((a,b) => seisanMap[b] - seisanMap[a]);
    const ranks = {};
    sorted.forEach((id, i) => { ranks[id] = i + 1; });
    return ranks;
  })();
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

  // race_bets 読み込み
  useEffect(()=>{
    supabase.from("race_bets").select("*").order("created_at",{ascending:false})
      .then(({data})=>{ if(data) { setRaceBets(data); raceBetsRef.current = data; } });
  },[]);

  // raceBetsRefを常に最新に保つ
  useEffect(()=>{ raceBetsRef.current = raceBets; },[raceBets]);

  // 古いlocalStorageキーをクリーンアップ（過去の絶対値データを除去）
  useEffect(()=>{
    localStorage.removeItem("tleague_race_chips");
    localStorage.removeItem("tleague_race_chips_delta");
  },[]);

  // 抜け番選択をlocalStorageに永続化（アプリを閉じても抜け番選択を復元）
  useEffect(()=>{
    localStorage.setItem("tleague_rp_skenbans", JSON.stringify(rpSkenbans));
  },[rpSkenbans]);

  // 外馬の選択ユーザーを永続化
  useEffect(()=>{
    if (raceSelf === null) localStorage.removeItem("tleague_race_self");
    else localStorage.setItem("tleague_race_self", JSON.stringify(raceSelf));
  },[raceSelf]);

  // 対局が初期化された(addStep=0)らrpSkenbansもクリア
  useEffect(()=>{
    if (addStep === 0 && rpSkenbans.length > 0) setRpSkenbans([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[addStep]);

  // 半荘ごとにレース開始時刻を記録（外馬タブを開いた瞬間に半荘が始まればその時刻を起点に5分カウント）
  useEffect(()=>{
    if(addStep !== 2) return;
    const ri = addRounds.length;
    setRaceStartTimes(prev => prev[ri] ? prev : {...prev, [ri]: Date.now()});
  },[addStep, addRounds.length]);

  // 5分カウントダウン更新用（1秒ごと再レンダリング）
  useEffect(()=>{
    if(addStep !== 2) return;
    const t = setInterval(()=>setRaceNowTick(n=>n+1), 1000);
    return ()=>clearInterval(t);
  },[addStep]);

  // 半荘が確定されたとき馬券を自動採点＋購入状態をリセット
  useEffect(()=>{
    if(addRounds.length === 0) return;
    setRaceBetType(null); setRaceSelection([]); setRaceBetAmount(1);
    const lastRound = addRounds[addRounds.length - 1];
    const roundIndex = addRounds.length - 1;
    const sorted = [...lastRound.players].sort((a,b)=>N(lastRound.scores[String(b)]??lastRound.scores[b])-N(lastRound.scores[String(a)]??lastRound.scores[a]));
    if(sorted.length < 2) return;
    const actualResult = sorted.map(Number);
    // 常に最新のraceBetsをrefから取得（クロージャ問題を回避）
    const currentBets = raceBetsRef.current;
    const toScore = currentBets.filter(b=>
      b.session_date === addDate &&
      b.round_index === roundIndex &&
      b.is_hit === null
    );
    if(toScore.length === 0) return;

    const scored = toScore.map(b => {
      const sel = b.bet_selection;
      let isHit = false;
      if(b.bet_type === "tansho") isHit = sel[0] === actualResult[0];
      else if(b.bet_type === "umaren") isHit = (sel[0]===actualResult[0]&&sel[1]===actualResult[1])||(sel[0]===actualResult[1]&&sel[1]===actualResult[0]);
      else if(b.bet_type === "sanrentan") isHit = sel[0]===actualResult[0]&&sel[1]===actualResult[1]&&sel[2]===actualResult[2];
      else if(b.bet_type === "yonrentan") isHit = sel[0]===actualResult[0]&&sel[1]===actualResult[1]&&sel[2]===actualResult[2]&&sel[3]===actualResult[3];
      const payout = isHit ? Number(b.odds) : 0;
      return {...b, actual_result: actualResult, is_hit: isHit, payout};
    });

    // ローカル即時反映（raceBetsが更新されればチップもランキングも自動計算される）
    setRaceBets(prev => prev.map(b => {
      const s = scored.find(x=>x.id===b.id);
      return s ? s : b;
    }));

    // Supabase非同期更新（エラーがあれば通知）
    scored.forEach(async b => {
      const {error} = await supabase.from("race_bets").update({
        actual_result: b.actual_result, is_hit: b.is_hit, payout: b.payout
      }).eq("id", b.id);
      if (error) {
        console.error("race_bets update error:", error);
        showToast("error", `⚠️ 採点保存失敗: ${error.message}`);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[addRounds.length]);
  useEffect(()=>{
    supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(50)
      .then(({data})=>{ if(data) setAuditLog(data); });
  },[]);

  // ゴミ箱ロード＋30日超の自動完全削除
  useEffect(()=>{
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    supabase.from("sessions").delete().lt("deleted_at", thirtyDaysAgo).not("deleted_at","is",null);
    supabase.from("members").delete().lt("deleted_at", thirtyDaysAgo).not("deleted_at","is",null);
    supabase.from("sessions").select("*").not("deleted_at","is",null).order("deleted_at",{ascending:false})
      .then(({data})=>{ if(data) setTrashSessions(data); });
    supabase.from("members").select("*").not("deleted_at","is",null).order("deleted_at",{ascending:false})
      .then(({data})=>{ if(data) setTrashMembers(data); });
  },[]);

  // 今月表示時にconfettiを1日1回だけ発火
  useEffect(()=>{
    if (period === "month" && mvpIds.length > 0 && !confettiShown) {
      // 日本時間のYYYY-MM-DD（toISOStringはUTCなのでローカルで作る）
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const lastConfetti = localStorage.getItem("tleague_lastConfetti");
      if (lastConfetti !== today) {
        localStorage.setItem("tleague_lastConfetti", today);
        setConfettiShown(true);
        setTimeout(()=>setConfettiShown(false), 4500);
      }
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
        const { data } = await supabase.from("drafts").select("*").order("updated_at",{ascending:false}).limit(1);
        const row = data?.[0];
        if(row && row.date === today){
          setDraftId(row.id);
          setAddDate(row.date);
          setAddRules(row.rules);
          setAddSel(row.members);
          setAddRounds(row.rounds);
          setRpSkenbans(Array.isArray(row.skenbans) ? row.skenbans : []);
          // 保存されたstepを使う。なければ従来ロジックで推定
          setAddStep(row.step ?? (row.rounds.length>0 ? 2 : (row.members?.length>0 ? 2 : 0)));
          return;
        } else if(row) {
          await supabase.from("drafts").delete().eq("id",row.id);
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
            setRpSkenbans(Array.isArray(draft.skenbans) ? draft.skenbans : []);
            setAddStep(draft.step ?? (draft.rounds.length>0 ? 2 : (draft.members?.length>0 ? 2 : 0)));
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

  // 対局状態が変化するたびにSupabaseに下書き保存
  // skenbansは省略可能（省略時は現在のrpSkenbansを使う）
  async function saveDraft(date, rules, sel, step, rounds, skenbans){
    if(sel.length === 0) return; // メンバー未選択は保存しない
    iAmEditorRef.current = true; // このデバイスが編集者
    const skenbansToSave = Array.isArray(skenbans) ? skenbans : rpSkenbans;
    const payload = { date, rules, members:sel, rounds, step, skenbans: skenbansToSave, updated_at: new Date().toISOString() };
    
    // localStorage にバックアップ（オフライン時の保険）
    try {
      localStorage.setItem("tleague_draft_backup", JSON.stringify(payload));
    } catch (e) {
      console.error("localStorage backup failed:", e);
    }
    
    // Supabase に保存
    try {
      if(draftId){
        const { error } = await supabase.from("drafts").update(payload).eq("id",draftId);
        if(error) throw error;
      } else {
        const { data, error } = await supabase.from("drafts").insert(payload).select();
        if(error) throw error;
        if(data?.[0]) setDraftId(data[0].id);
      }
    } catch (error) {
      console.error("Error saving draft to Supabase:", error);
      showToast("error", "⚠️ 保存失敗: " + (error?.message || JSON.stringify(error)));
    }
  }

  // 下書き削除
  async function deleteDraft(){
    try {
      if(draftId){ 
        await supabase.from("drafts").delete().eq("id",draftId); 
        setDraftId(null); 
      }
      iAmEditorRef.current = false; // 編集者フラグをリセット
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
        supabase.from("members").select("*").is("deleted_at", null).order("id"),
        supabase.from("sessions").select("*").is("deleted_at", null).order("created_at"),
      ]);
      if (mData) setMembers(mData);
      if (sData) setSessions(sData);
      setLoading(false);
    }
    fetchData();

    // リアルタイム購読
    const channel = supabase.channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        supabase.from("members").select("*").is("deleted_at", null).order("id").then(({ data }) => { if (data) setMembers(data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        supabase.from("sessions").select("*").is("deleted_at", null).order("created_at").then(({ data }) => { if (data) setSessions(data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "drafts" }, () => {
        // LIVE状態の即時同期：他デバイスでLIVE開始/終了/進行が即時反映
        supabase.from("drafts").select("*").order("updated_at",{ascending:false}).limit(1).then(({data}) => {
          const row = data?.[0];
          if (row) {
            // このデバイスが編集者でない場合のみ反映（観覧者は常に最新を受信）
            if (!iAmEditorRef.current) {
              setAddDate(row.date);
              setAddRules(row.rules);
              setAddSel(row.members);
              setAddStep(row.step);
              setAddRounds(row.rounds || []);
              setRpSkenbans(Array.isArray(row.skenbans) ? row.skenbans : []);
              setDraftId(row.id);
            }
          }
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "race_bets" }, () => {
        // 外馬投票の即時同期
        supabase.from("race_bets").select("*").order("created_at",{ascending:false}).then(({data}) => {
          if (data) { setRaceBets(data); raceBetsRef.current = data; }
        });
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
          saveDraft(addDate, addRules, addSel, addStep, addRounds.map((rr,idx)=>idx!==ri?rr:{
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
    
    saveDraft(addDate, addRules, addSel, addStep, newRounds);

    // 役満演出
    if (rpYakuman.length > 0) {
      const pid = rpYakuman[0];
      const m = gm(pid);
      setYakumanCelebration({ name: m?.name||"", type: rpYakumanTypes[pid]||"" });
      setTimeout(() => setYakumanCelebration(null), 4000);
    }
    setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
    setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null); setRpSkenbans([]); setAddErr(""); setShowGoalScene(false);
  }

  function startAdd() {
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const newRules = {...addRules, startTime};
    setAddRules(newRules);
    setAddStep(2);
    setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
    setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes([]); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null); setRpSkenbans([]);
    setAddRounds([]); setAddChips({}); setAddBashiro({}); setAddErr("");
    // 対局開始時点でドラフト保存（アプリを閉じても復元できるように）
    saveDraft(addDate, newRules, addSel, 2, []);
  }

  async function saveSession() {
    if (isSaving) return; // 二重送信防止
    setIsSaving(true);
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const chips={}, bashiro={};
    addSel.forEach(id => { chips[id]=N(addChips[id]); bashiro[id]=N(addBashiro[id]); });
    const newSess = {
      date: addDate,
      rules: {...addRules, uma: addRules.uma.map(Number), endTime},
      members: [...addSel],
      rounds: addRounds,
      chips,
      bashiro,
    };
    try {
      const { data, error } = await supabase.from("sessions").insert(newSess).select().single();
      if (error) throw error;
      if (data) setSessions(p => [...p, data]);

      // saveSession時に全半荘の未採点馬券を確実に採点してランキング反映
      const currentBetsSnap = raceBetsRef.current;
      const allScored = [];
      addRounds.forEach((round, roundIndex) => {
        const sorted = [...round.players].sort((a,b)=>N(round.scores[String(b)]??round.scores[b])-N(round.scores[String(a)]??round.scores[a]));
        if(sorted.length < 2) return;
        const actualResult = sorted.map(Number);
        const toScore = currentBetsSnap.filter(b =>
          b.session_date === addDate &&
          b.round_index === roundIndex &&
          b.is_hit === null
        );
        toScore.forEach(b => {
          const sel = b.bet_selection;
          let isHit = false;
          if(b.bet_type==="tansho") isHit = sel[0]===actualResult[0];
          else if(b.bet_type==="umaren") isHit=(sel[0]===actualResult[0]&&sel[1]===actualResult[1])||(sel[0]===actualResult[1]&&sel[1]===actualResult[0]);
          else if(b.bet_type==="sanrentan") isHit=sel[0]===actualResult[0]&&sel[1]===actualResult[1]&&sel[2]===actualResult[2];
          else if(b.bet_type==="yonrentan") isHit=sel[0]===actualResult[0]&&sel[1]===actualResult[1]&&sel[2]===actualResult[2]&&sel[3]===actualResult[3];
          const payout = isHit ? Number(b.odds) : 0;
          allScored.push({...b, actual_result: actualResult, is_hit: isHit, payout});
          supabase.from("race_bets").update({actual_result:actualResult,is_hit:isHit,payout}).eq("id",b.id);
        });
      });
      if(allScored.length > 0) {
        setRaceBets(prev => prev.map(b => { const s=allScored.find(x=>x.id===b.id); return s?s:b; }));
        // raceBetsが更新されればチップ・ランキング全て自動計算される
      }

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
      const now = new Date().toISOString();
      const { error } = await supabase.from("sessions").update({deleted_at: now}).eq("id", id);
      if (error) throw error;
      const s = sessions.find(s=>s.id===id);

      // 削除された対局の馬券をrace_betsから完全削除
      // → currentChips計算から除外され、消費・配当が自動的に無効化される
      const deletedBets = raceBetsRef.current.filter(b => b.session_date === s?.date);
      if (deletedBets.length > 0) {
        await supabase.from("race_bets").delete().eq("session_date", s?.date);
        setRaceBets(prev => prev.filter(b => b.session_date !== s?.date));
        raceBetsRef.current = raceBetsRef.current.filter(b => b.session_date !== s?.date);
      }

      await writeAuditLog(memberName, "削除", `${s?.date||id} の対局をゴミ箱へ移動`);
      setTrashSessions(prev=>[{...s, deleted_at:now}, ...prev]);
      setSessions(p => p.filter(s => s.id !== id));
      setHistOpen(prev => { const n={...prev}; delete n[id]; return n; });
      showToast("success", "🗑 ゴミ箱に移動しました（30日後に自動削除）");
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
    // 破棄時に当日の馬券を削除（保存削除と同じ扱い → チップ・ランキングが無効化）
    try {
      const targetDate = addDate;
      const discardedBets = raceBetsRef.current.filter(b => b.session_date === targetDate);
      if (discardedBets.length > 0) {
        const { error } = await supabase.from("race_bets").delete().eq("session_date", targetDate);
        if (error) {
          console.error("race_bets delete error:", error);
          showToast("error", `⚠️ 馬券破棄失敗: ${error.message}`);
        } else {
          setRaceBets(prev => prev.filter(b => b.session_date !== targetDate));
          raceBetsRef.current = raceBetsRef.current.filter(b => b.session_date !== targetDate);
          if (discardedBets.length > 0) {
            showToast("success", `🗑 馬券${discardedBets.length}件を無効化（チップ返却）`);
          }
        }
      }
    } catch (e) {
      console.error("Failed to discard race_bets:", e);
    }

    await deleteDraft();
    setAddStep(0); setAddRules({...lr}); setAddSel([]); setAddRounds([]);
    setAddDate(today());
    setAddEndTimePlan("");
    setRpSc({}); setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setAddChips({}); setAddBashiro({});
    setRpActive(null); setChipActive(null); setAddErr(""); setBashiroTotal("");
    setRpSkenbans([]); setRaceSelf(null); setRaceBetType(null); setRaceSelection([]); setRaceBetAmount(1);
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
        <div style={{ color:"#e74c3c", fontSize:15, marginBottom:14, fontWeight:500 }}>麻雀スコア表</div>
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
              saveDraft(addDate,addRules,addSel,addStep,updated);
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
              saveDraft(addDate, addRules, addSel, addStep, addRounds);
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
                  saveDraft(addDate,addRules,addSel,addStep,updated);
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
                  saveDraft(addDate,addRules,addSel,addStep,addRounds);
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
                  const chipVal = String(editSession.chips[id] ?? 0);
                  const isChipActive = editChipKeypadActive === id;
                  return (
                    <div key={id}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:isChipActive?4:0}}>
                        <Av m={m} sz={20}/>
                        <div style={{fontSize:11,flex:1}}>{m.name}</div>
                        <div onClick={()=>setEditChipKeypadActive(isChipActive?null:id)}
                          style={{background:isChipActive?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.1)",border:isChipActive?"1px solid rgba(231,76,60,0.4)":"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:13,fontWeight:"bold",width:60,textAlign:"center",cursor:"pointer"}}>
                          {chipVal}
                        </div>
                      </div>
                      {isChipActive && (
                        <Keypad value={chipVal} onChange={val=>{
                          setEditSession(prev=>({...prev,chips:{...prev.chips,[id]:val===""||val==="-"?0:Number(val)}}));
                        }}/>
                      )}
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
          <div style={{fontSize:12,fontWeight:500,lineHeight:1.2}}>麻雀スコア表 <span style={{fontSize:9,color:"#666",fontWeight:400}}>v1.7</span></div>
        </div>
        {/* LIVE バッジ：実際にLIVE対局中(addStep===2)のみ表示 */}
        {addStep === 2 && (
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:16,background:"rgba(231,76,60,0.25)",border:"2px solid rgba(231,76,60,0.7)",cursor:addStep===2?"pointer":"default",boxShadow:"0 0 12px rgba(231,76,60,0.4)"}}
            onClick={()=>{ if(addStep===2) setShowLivePanel(p=>!p); }}>
            <span style={{width:10,height:10,borderRadius:"50%",background:"#e74c3c",display:"inline-block",animation:"pulse 1s infinite",boxShadow:"0 0 6px #e74c3c"}}/>
            <span style={{fontSize:15,fontWeight:800,color:"#e74c3c",letterSpacing:2}}>LIVE</span>
            {addStep===2&&<span style={{fontSize:11,color:"#e74c3c"}}>{showLivePanel?"▲":"▼"}</span>}
          </div>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {[["dashboard","📊"],["calendar","🗓"],["history","📅"],["skull","💀"],["sotoba","🏇"],["hilo","🃏"],["taikai","🎌"],["add","➕"],["members","👥"]].map(([t,l])=>{
            const isActive = t==="sotoba"
              ? (tab==="dashboard" && dashSub==="sotoba")
              : t==="hilo"
              ? (tab==="dashboard" && dashSub==="hilo")
              : (tab===t && !(t==="dashboard" && (dashSub==="sotoba" || dashSub==="hilo")));
            return (
              <button key={t} onClick={()=>{
                if(t==="sotoba"){ setTab("dashboard"); setDashSub("sotoba"); }
                else if(t==="hilo"){ setTab("dashboard"); setDashSub("hilo"); }
                else { setTab(t); if(t==="dashboard" && (dashSub==="sotoba" || dashSub==="hilo")) setDashSub("summary"); }
              }} style={S.nav(isActive)}>
                {t==="sotoba" && addStep===2 && <span style={{position:"absolute",marginLeft:14,marginTop:-8,width:7,height:7,borderRadius:"50%",background:"#e74c3c",animation:"pulse 1s infinite",display:"inline-block"}}/>}
                {l}
              </button>
            );
          })}
          {/* ⚙️ 設定ボタン（メンバー管理の右隣） */}
          <button onClick={()=>{
              setShowSettings(p=>!p);
              if(hasNewUpdate){
                localStorage.setItem("tleague_settings_seen", latestChangelogKey);
                setHasNewUpdate(false);
              }
            }} style={{...S.nav(showSettings),position:"relative"}}>
            ⚙️
            {hasNewUpdate && !showSettings && (
              <span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#e74c3c",boxShadow:"0 0 6px #e74c3c",animation:"pulse 1s infinite"}}/>
            )}
          </button>
        </div>
      </div>

      {/* LIVE途中経過パネル */}
      {addStep===2 && showLivePanel && (
        <div style={{background:"linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.15))",border:"2px solid rgba(231,76,60,0.6)",borderBottom:"3px solid #e74c3c",padding:"14px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:"#e74c3c",display:"inline-block",animation:"pulse 1s infinite",boxShadow:"0 0 6px #e74c3c"}}/>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:"#e74c3c",letterSpacing:2}}>LIVE 途中経過</div>
                {addRules.venue && <div style={{fontSize:10,color:"#888",marginTop:1}}>📍 {addRules.venue}</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
              <div style={{fontSize:12,color:"#aaa",background:"rgba(0,0,0,0.3)",padding:"2px 10px",borderRadius:10}}>{addRounds.length}半荘終了</div>
              <div style={{display:"flex",gap:6}}>
                {addRules.startTime && <div style={{fontSize:10,color:"#888"}}>🕐 {addRules.startTime}〜</div>}
                {addEndTimePlan && <div style={{fontSize:10,color:"#f39c12"}}>予定 {addEndTimePlan}終了</div>}
              </div>
            </div>
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
            {/* Mリーグタイトル画面 */}
            {tab==="dashboard" && (
              <button onClick={()=>setShowMLeague(true)} style={{
                padding:"4px 10px",borderRadius:13,cursor:"pointer",fontSize:11,
                background:"rgba(52,152,219,0.15)",
                border:"1px solid rgba(52,152,219,0.5)",
                color:"#3498db",fontWeight:600,
              }}>
                Mリーグ
              </button>
            )}
          </div>
        )}

        {/* Mリーグ指標 個人タイトル */}
        {showMLeague && (() => {
          const currentYear = new Date().getFullYear();
          const yearSessions = sessions.filter(s => s.date.startsWith(String(currentYear)));

          // 月の取得ヘルパー
          const getMonth = (date) => parseInt(date.slice(5,7), 10);
          const isFirstHalf = (date) => { const m = getMonth(date); return m >= 1 && m <= 6; };
          const isSecondHalf = (date) => { const m = getMonth(date); return m >= 7 && m <= 12; };

          // 段階係数(緩和達成時に使用)
          const getStageCoef = (month) => {
            if (month === 1 || month === 2 || month === 7 || month === 8) return 1.0;
            if (month === 3 || month === 4 || month === 9 || month === 10) return 0.6;
            return 0.25; // 5,6,11,12
          };
          const stageLabel = (coef) => coef === 1.0 ? "期前半" : coef === 0.6 ? "中期" : "後期";

          // 現在の月・係数
          const today = new Date();
          const todayMonth = today.getMonth() + 1;
          const isNowFirstHalf = todayMonth >= 1 && todayMonth <= 6;
          const todayCoef = getStageCoef(todayMonth);

          // 期ごとのセッション
          const firstHalfSessions = yearSessions.filter(s => isFirstHalf(s.date));
          const secondHalfSessions = yearSessions.filter(s => isSecondHalf(s.date));

          // 期ごとの統計を計算する関数
          const calcPeriodStats = (periodSessions, isCurrentPeriod) => {
            const pstats = {};
            members.forEach(m => {
              pstats[m.id] = {
                id: m.id, name: m.name, photo: m.photo,
                total: 0, totalScore: 0, ranks: [0,0,0,0]
              };
            });
            periodSessions.forEach(s => {
              (s.rounds || []).forEach(r => {
                if (!r.players || !r.scores) return;
                const sorted = [...r.players].map(pid => ({
                  pid: Number(pid),
                  sc: N(r.scores[String(pid)] ?? r.scores[pid])
                })).sort((a, b) => b.sc - a.sc);
                sorted.forEach((entry, idx) => {
                  const id = entry.pid;
                  if (!pstats[id]) return;
                  pstats[id].total++;
                  pstats[id].totalScore += entry.sc;
                  if (idx >= 0 && idx <= 3) pstats[id].ranks[idx]++;
                });
              });
            });
            // 規定打席の計算
            const participantsCount = Object.values(pstats).filter(s => s.total > 0).length;
            const totalPlayHalves = Object.values(pstats).reduce((acc, s) => acc + s.total, 0);
            const standardRounds = participantsCount > 0 ? Math.floor(totalPlayHalves / participantsCount) : 0;
            const easeRounds = Math.floor(standardRounds * 0.85);
            // 期外なら段階係数は0.25(最終段階)、期中なら今日の係数
            const coef = isCurrentPeriod ? todayCoef : 0.25;
            return { stats: pstats, standardRounds, easeRounds, participantsCount, coef };
          };

          const firstHalf = calcPeriodStats(firstHalfSessions, isNowFirstHalf);
          const secondHalf = calcPeriodStats(secondHalfSessions, !isNowFirstHalf);

          // 規定/緩和判定とペナルティ計算
          const calcQual = (s, std, ease, coef, label) => {
            if (!s || s.total === 0 || std === 0) return null;
            const avg = s.totalScore / s.total;
            const topRate = s.ranks[0] / s.total;
            if (s.total >= std) {
              return {
                ...s, period: label, qualified: true, isEase: false,
                avgScore: avg, topRate,
                adoptedTotalScore: s.totalScore,
                adoptedTopCount: s.ranks[0],
                penaltyScore: 0, penaltyTop: 0,
                standardRounds: std, easeRounds: ease, coef,
              };
            } else if (s.total >= ease) {
              const shortage = std - s.total;
              // ペナルティ = (規定 - 実績) × 平均スコア × 段階係数
              const penaltyScore = shortage * avg * coef;
              const penaltyTop = shortage * topRate * coef;
              return {
                ...s, period: label, qualified: true, isEase: true,
                avgScore: avg, topRate,
                adoptedTotalScore: s.totalScore - penaltyScore,
                adoptedTopCount: s.ranks[0] - penaltyTop,
                penaltyScore, penaltyTop,
                standardRounds: std, easeRounds: ease, coef,
              };
            }
            return null;
          };

          // メンバーごとに前期・後期を判定し、採用期を決定
          const buildMemberMLeague = (memberId) => {
            const fhQual = calcQual(firstHalf.stats[memberId], firstHalf.standardRounds, firstHalf.easeRounds, firstHalf.coef, "前期");
            const shQual = calcQual(secondHalf.stats[memberId], secondHalf.standardRounds, secondHalf.easeRounds, secondHalf.coef, "後期");
            if (!fhQual && !shQual) return null;
            // 両方達成 → 平均スコアが高い方
            if (fhQual && shQual) {
              return fhQual.avgScore >= shQual.avgScore ? fhQual : shQual;
            }
            return fhQual || shQual;
          };

          const mleagueData = members.map(m => buildMemberMLeague(m.id)).filter(Boolean);

          // 個人スコア(平均)ランキング - 1半荘あたりの平均スコアで順位決定
          const personalScoreRanking = [...mleagueData]
            .sort((a, b) => (b.adoptedTotalScore / b.total) - (a.adoptedTotalScore / a.total))
            .slice(0, 6);

          // 最多トップ(規定換算)ランキング - 1半荘あたりのトップ率 × 規定半荘 = 換算回数
          const mostTopRanking = [...mleagueData]
            .sort((a, b) => ((b.adoptedTopCount / b.total) * b.standardRounds) - ((a.adoptedTopCount / a.total) * a.standardRounds))
            .slice(0, 6);

          // ━━━ 最高スコアと4着回避率は年間ベース(現状維持) ━━━
          const yearStats = {};
          members.forEach(m => {
            yearStats[m.id] = { id: m.id, name: m.name, photo: m.photo, total: 0, maxRaw: null, ranks: [0,0,0,0] };
          });
          yearSessions.forEach(s => {
            (s.rounds || []).forEach(r => {
              if (!r.players || !r.scores) return;
              const sorted = [...r.players].map(pid => ({
                pid: Number(pid),
                sc: N(r.scores[String(pid)] ?? r.scores[pid])
              })).sort((a, b) => b.sc - a.sc);
              sorted.forEach((entry, idx) => {
                const id = entry.pid;
                if (!yearStats[id]) return;
                yearStats[id].total++;
                if (idx >= 0 && idx <= 3) yearStats[id].ranks[idx]++;
              });
              if (r.highScore && r.highScore.playerId != null && r.highScore.rawScore != null) {
                const hid = Number(r.highScore.playerId);
                const raw = Number(r.highScore.rawScore);
                if (yearStats[hid]) {
                  if (yearStats[hid].maxRaw == null || raw > yearStats[hid].maxRaw) {
                    yearStats[hid].maxRaw = raw;
                  }
                }
              }
            });
          });
          const yearQualified = Object.values(yearStats).filter(s => s.total >= 20);
          const maxRanking = [...yearQualified]
            .filter(s => s.maxRaw != null)
            .sort((a, b) => b.maxRaw - a.maxRaw)
            .slice(0, 6);
          const avoidLastRanking = [...yearQualified]
            .map(s => ({ ...s, avoidRate: 1 - (s.ranks[3] / s.total) }))
            .sort((a, b) => b.avoidRate - a.avoidRate)
            .slice(0, 6);

          const rankColor = (i) => ["#f1c40f","#c0c0c0","#cd7f32","#888","#888","#888"][i] || "#888";
          const rankBg = (i) => ["rgba(241,196,15,0.12)","rgba(192,192,192,0.10)","rgba(205,127,50,0.10)","rgba(255,255,255,0.04)","rgba(255,255,255,0.04)","rgba(255,255,255,0.04)"][i] || "rgba(255,255,255,0.04)";

          const RankList = ({ items, formatter, noItemsLabel, showPeriod }) => (
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {items.length === 0 ? (
                <div style={{textAlign:"center",color:"#666",fontSize:11,padding:"12px 0"}}>
                  {noItemsLabel || "対象者なし"}
                </div>
              ) : items.map((s, i) => (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:rankBg(i),borderRadius:6,border:`1px solid ${i<3?rankColor(i):"rgba(255,255,255,0.04)"}33`}}>
                  <div style={{fontSize:13,fontWeight:700,color:rankColor(i),minWidth:24,textAlign:"center"}}>{i+1}位</div>
                  <Av m={s} sz={24}/>
                  <div style={{flex:1,minWidth:0,fontSize:12,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {s.name}
                    {showPeriod && s.period && (
                      <span style={{fontSize:9,color:s.isEase?"#e67e22":"#3498db",marginLeft:4,fontWeight:600}}>
                        [{s.period}{s.isEase?"★":""}]
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:rankColor(i),whiteSpace:"nowrap"}}>{formatter(s)}</div>
                </div>
              ))}
            </div>
          );

          return (
            <div style={{...S.card({background:"rgba(52,152,219,0.04)",border:"1px solid rgba(52,152,219,0.3)",marginBottom:10})}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:14,fontWeight:700,color:"#3498db"}}>Mリーグ指標 個人タイトル</div>
                <button onClick={()=>setShowMLeague(false)} style={S.bs()}>✕</button>
              </div>

              {/* 折り畳みメニュー(説明) */}
              <details style={{
                marginBottom:10,
                background:"rgba(0,0,0,0.2)",borderRadius:8,
                border:"1px solid rgba(255,255,255,0.05)",
                padding:"8px 12px",
              }}>
                <summary style={{
                  cursor:"pointer",fontSize:11,
                  color:"#3498db",fontWeight:600,
                }}>
                  📖 Mリーグ指標とは(タップで詳細)
                </summary>
                <div style={{marginTop:10,fontSize:10,color:"#ccc",lineHeight:1.7}}>
                  プロ麻雀リーグ「Mリーグ」の年間個人タイトルを参考にしたランキングです。
                  自分の成績がMリーガーと比べてどれくらいなのか、楽しみながら振り返れる指標として設けました。

                  <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{color:"#3498db",fontWeight:600,marginBottom:4}}>● 規定打席制度(個人スコア・最多トップ)</div>
                    前期(1〜6月)・後期(7〜12月)で集計します。
                    <br/>
                    規定打席 = その期の全参加者の半荘数合計 ÷ 参加人数(小数点切り捨て)
                    <br/>
                    例：前期に14人が合計360半荘消化 → 規定 = 360÷14 = 25半荘
                  </div>

                  <div style={{marginTop:8}}>
                    <div style={{color:"#3498db",fontWeight:600,marginBottom:4}}>● ノミネート条件</div>
                    前期または後期のどちらか一方で規定打席達成でランキング入り。
                    <br/>
                    両方達成の場合は、平均スコアが高い方の期を採用します。
                  </div>

                  <div style={{marginTop:8}}>
                    <div style={{color:"#2ecc71",fontWeight:600,marginBottom:4}}>● ランキング順位の決定方法</div>
                    順位は<span style={{color:"#fff",fontWeight:600}}>「1半荘あたりの効率」</span>で決定します。
                    <br/>
                    ・個人スコア → <span style={{color:"#fff"}}>1半荘あたりの平均スコア</span>(採用スコア ÷ 実績半荘数)
                    <br/>
                    ・最多トップ → <span style={{color:"#fff"}}>規定打席換算のトップ回数</span>(1半荘あたりのトップ率 × 規定半荘数)
                    <br/>
                    <span style={{color:"#888",fontSize:9}}>※累積スコアやトップ回数の絶対値ではなく、「効率」で純粋に比較するため、参加数による有利不利がなくなります。</span>
                    <br/>
                    例：A(実績25・累積+500pt) = +20.0/半、B(実績50・累積+1000pt) = +20.0/半 → 同率
                    <br/>
                    例：C(実績25・トップ8回) = 換算8.0回、D(実績50・トップ20回) = 換算10.0回 → D上位
                  </div>

                  <div style={{marginTop:8}}>
                    <div style={{color:"#e67e22",fontWeight:600,marginBottom:4}}>● 緩和打席(チャンス枠) ★マーク</div>
                    規定打席の85%まで打席数を緩和。ただしスコアにペナルティが入ります。
                    <br/>
                    例：規定25 → 21半荘以上で緩和達成
                    <br/>
                    ペナルティ = (規定半荘数 − 実績半荘数) × 平均スコア × 段階係数
                  </div>

                  <div style={{marginTop:8}}>
                    <div style={{color:"#e67e22",fontWeight:600,marginBottom:4}}>● 段階係数(期末ギリギリでお得)</div>
                    <table style={{fontSize:10,borderCollapse:"collapse",marginTop:4}}>
                      <tbody>
                        <tr>
                          <td style={{padding:"2px 6px",color:"#888"}}>期前半(1-2月／7-8月)</td>
                          <td style={{padding:"2px 6px",color:"#e74c3c",fontWeight:600}}>×1.0</td>
                          <td style={{padding:"2px 6px",color:"#888"}}>ペナルティ全額</td>
                        </tr>
                        <tr>
                          <td style={{padding:"2px 6px",color:"#888"}}>中期(3-4月／9-10月)</td>
                          <td style={{padding:"2px 6px",color:"#f39c12",fontWeight:600}}>×0.6</td>
                          <td style={{padding:"2px 6px",color:"#888"}}>40%緩和</td>
                        </tr>
                        <tr>
                          <td style={{padding:"2px 6px",color:"#888"}}>後期(5-6月／11-12月)</td>
                          <td style={{padding:"2px 6px",color:"#2ecc71",fontWeight:600}}>×0.25</td>
                          <td style={{padding:"2px 6px",color:"#888"}}>75%緩和</td>
                        </tr>
                      </tbody>
                    </table>
                    後半に達成するほど有利になる仕組みです。
                  </div>

                  <div style={{marginTop:8}}>
                    <div style={{color:"#3498db",fontWeight:600,marginBottom:4}}>● 表示マーク</div>
                    <span style={{color:"#3498db",fontWeight:600}}>[前期]</span> <span style={{color:"#3498db",fontWeight:600}}>[後期]</span> → 採用期(規定達成)
                    <br/>
                    <span style={{color:"#e67e22",fontWeight:600}}>[前期★]</span> <span style={{color:"#e67e22",fontWeight:600}}>[後期★]</span> → 緩和達成(ペナルティ適用)
                  </div>

                  <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)",color:"#888",fontSize:9}}>
                    ※ 最高スコア・4着回避率は年間ベース(20半荘以上参加者対象)
                  </div>
                </div>
              </details>

              {/* 現時点の規定打席情報 */}
              <div style={{
                padding:"8px 10px",marginBottom:12,
                background:"rgba(52,152,219,0.06)",borderRadius:6,
                border:"1px solid rgba(52,152,219,0.15)",
                fontSize:10,color:"#ccc",lineHeight:1.6
              }}>
                <div style={{color:"#3498db",fontWeight:600,marginBottom:4,fontSize:11}}>📊 現時点の規定打席</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>前期(1〜6月)</span>
                  <span>
                    規定 <span style={{color:"#fff",fontWeight:700,fontSize:11}}>{firstHalf.standardRounds}</span>半荘
                    ／緩和 <span style={{color:"#e67e22",fontWeight:600}}>{firstHalf.easeRounds}</span>半荘
                  </span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                  <span>後期(7〜12月)</span>
                  <span>
                    規定 <span style={{color:"#fff",fontWeight:700,fontSize:11}}>{secondHalf.standardRounds}</span>半荘
                    ／緩和 <span style={{color:"#e67e22",fontWeight:600}}>{secondHalf.easeRounds}</span>半荘
                  </span>
                </div>
                {((isNowFirstHalf && firstHalf.standardRounds > 0) || (!isNowFirstHalf && secondHalf.standardRounds > 0)) && (
                  <div style={{marginTop:4,paddingTop:4,borderTop:"1px solid rgba(255,255,255,0.05)",color:"#888",fontSize:9}}>
                    現在の段階：<span style={{color:todayCoef===1.0?"#e74c3c":todayCoef===0.6?"#f39c12":"#2ecc71",fontWeight:600}}>{stageLabel(todayCoef)}(×{todayCoef})</span>
                  </div>
                )}
              </div>

              {/* 規定達成状況（折り畳みメニュー） */}
              <details style={{marginBottom:12,background:"rgba(46,204,113,0.06)",border:"1px solid rgba(46,204,113,0.2)",borderRadius:6,padding:"8px 10px"}}>
                <summary style={{cursor:"pointer",color:"#2ecc71",fontWeight:600,fontSize:11,userSelect:"none"}}>
                  📋 規定達成状況を見る
                </summary>
                <div style={{marginTop:10}}>
                  {/* 後期 */}
                  {(() => {
                    const progress = members
                      .filter(m => secondHalf.stats[m.id] && secondHalf.stats[m.id].total > 0)
                      .map(m => {
                        const s = secondHalf.stats[m.id];
                        const remaining = Math.max(0, secondHalf.standardRounds - s.total);
                        const easeRemaining = Math.max(0, secondHalf.easeRounds - s.total);
                        const percentage = secondHalf.standardRounds > 0 ? Math.min(100, (s.total / secondHalf.standardRounds) * 100) : 0;
                        return {
                          ...m, actual: s.total, remaining, easeRemaining, percentage,
                          achieved: s.total >= secondHalf.standardRounds,
                          easeAchieved: s.total >= secondHalf.easeRounds && s.total < secondHalf.standardRounds
                        };
                      })
                      .sort((a, b) => b.actual - a.actual);
                    return (
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#fff",marginBottom:8,paddingBottom:4,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
                          後期 (7-12月) 規定:{secondHalf.standardRounds} / 緩和:{secondHalf.easeRounds}
                        </div>
                        {progress.length === 0 ? (
                          <div style={{textAlign:"center",padding:10,color:"#555",fontSize:10}}>データなし</div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:6}}>
                            {progress.map(p => (
                              <div key={p.id}>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <Av m={p} sz={20} />
                                    <div style={{fontSize:11,fontWeight:600,color:"#fff"}}>{p.name}</div>
                                  </div>
                                  <div style={{fontSize:10,fontWeight:600,color:p.achieved?"#2ecc71":p.easeAchieved?"#f39c12":"#888"}}>
                                    {p.actual}/{secondHalf.standardRounds}
                                    {p.achieved ? " ✅" : p.easeAchieved ? " ⭐" : p.remaining > 0 && ` (あと${p.remaining}回)`}
                                  </div>
                                </div>
                                <div style={{background:"rgba(0,0,0,0.3)",borderRadius:4,height:10,overflow:"hidden",position:"relative"}}>
                                  <div style={{
                                    width:`${p.percentage}%`,
                                    height:"100%",
                                    background: p.achieved ? "linear-gradient(90deg,#2ecc71,#27ae60)" : p.easeAchieved ? "linear-gradient(90deg,#f39c12,#e67e22)" : "linear-gradient(90deg,#3498db,#2980b9)",
                                    transition:"width 0.3s"
                                  }}/>
                                  {secondHalf.easeRounds < secondHalf.standardRounds && secondHalf.standardRounds > 0 && (
                                    <div style={{
                                      position:"absolute",
                                      left:`${(secondHalf.easeRounds / secondHalf.standardRounds) * 100}%`,
                                      top:0,height:"100%",width:1,
                                      background:"rgba(255,255,255,0.5)"
                                    }}/>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 前期 */}
                  {(() => {
                    const progress = members
                      .filter(m => firstHalf.stats[m.id] && firstHalf.stats[m.id].total > 0)
                      .map(m => {
                        const s = firstHalf.stats[m.id];
                        const remaining = Math.max(0, firstHalf.standardRounds - s.total);
                        const easeRemaining = Math.max(0, firstHalf.easeRounds - s.total);
                        const percentage = firstHalf.standardRounds > 0 ? Math.min(100, (s.total / firstHalf.standardRounds) * 100) : 0;
                        return {
                          ...m, actual: s.total, remaining, easeRemaining, percentage,
                          achieved: s.total >= firstHalf.standardRounds,
                          easeAchieved: s.total >= firstHalf.easeRounds && s.total < firstHalf.standardRounds
                        };
                      })
                      .sort((a, b) => b.actual - a.actual);
                    return (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:"#fff",marginBottom:8,paddingBottom:4,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
                          前期 (1-6月) 規定:{firstHalf.standardRounds} / 緩和:{firstHalf.easeRounds}
                        </div>
                        {progress.length === 0 ? (
                          <div style={{textAlign:"center",padding:10,color:"#555",fontSize:10}}>データなし</div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:6}}>
                            {progress.map(p => (
                              <div key={p.id}>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <Av m={p} sz={20} />
                                    <div style={{fontSize:11,fontWeight:600,color:"#fff"}}>{p.name}</div>
                                  </div>
                                  <div style={{fontSize:10,fontWeight:600,color:p.achieved?"#2ecc71":p.easeAchieved?"#f39c12":"#888"}}>
                                    {p.actual}/{firstHalf.standardRounds}
                                    {p.achieved ? " ✅" : p.easeAchieved ? " ⭐" : p.remaining > 0 && ` (あと${p.remaining}回)`}
                                  </div>
                                </div>
                                <div style={{background:"rgba(0,0,0,0.3)",borderRadius:4,height:10,overflow:"hidden",position:"relative"}}>
                                  <div style={{
                                    width:`${p.percentage}%`,
                                    height:"100%",
                                    background: p.achieved ? "linear-gradient(90deg,#2ecc71,#27ae60)" : p.easeAchieved ? "linear-gradient(90deg,#f39c12,#e67e22)" : "linear-gradient(90deg,#3498db,#2980b9)",
                                    transition:"width 0.3s"
                                  }}/>
                                  {firstHalf.easeRounds < firstHalf.standardRounds && firstHalf.standardRounds > 0 && (
                                    <div style={{
                                      position:"absolute",
                                      left:`${(firstHalf.easeRounds / firstHalf.standardRounds) * 100}%`,
                                      top:0,height:"100%",width:1,
                                      background:"rgba(255,255,255,0.5)"
                                    }}/>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 凡例 */}
                  <div style={{marginTop:12,padding:8,background:"rgba(46,204,113,0.05)",borderRadius:4,fontSize:9,color:"#888",lineHeight:1.6}}>
                    ✅=規定達成 / ⭐=緩和達成(規定85%) / 白い線=緩和打席ライン
                  </div>
                </div>
              </details>

              {/* 個人スコア */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#3498db",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  🏆 個人スコア
                  <span style={{fontSize:9,color:"#888",fontWeight:400}}>(1半荘あたりの平均スコア)</span>
                </div>
                <RankList
                  items={personalScoreRanking}
                  showPeriod={true}
                  formatter={(s) => {
                    const avg = s.adoptedTotalScore / s.total;
                    return `${avg >= 0 ? "+" : ""}${avg.toFixed(1)}pt/半`;
                  }}
                  noItemsLabel="対象者なし(規定打席または緩和打席を達成した人がいません)"
                />
              </div>

              {/* 最多トップ */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#3498db",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  👑 最多トップ
                  <span style={{fontSize:9,color:"#888",fontWeight:400}}>(規定打席換算のトップ回数)</span>
                </div>
                <RankList
                  items={mostTopRanking}
                  showPeriod={true}
                  formatter={(s) => {
                    const converted = (s.adoptedTopCount / s.total) * s.standardRounds;
                    return `${converted.toFixed(1)}回`;
                  }}
                  noItemsLabel="対象者なし(規定打席または緩和打席を達成した人がいません)"
                />
              </div>

              {/* 最高スコア */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#e74c3c",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  💥 最高スコア
                  <span style={{fontSize:9,color:"#888",fontWeight:400}}>(70点以上叩いた個人別の最高持ち点・年間)</span>
                </div>
                <RankList
                  items={maxRanking}
                  formatter={(s) => `${Math.round(s.maxRaw).toLocaleString()}点`}
                  noItemsLabel="対象者なし(20半荘以上参加者がいません)"
                />
              </div>

              {/* 4着回避率 */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#3498db",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  🛡️ 4着回避率
                  <span style={{fontSize:9,color:"#888",fontWeight:400}}>(4着を避ける安定感・年間)</span>
                </div>
                <RankList
                  items={avoidLastRanking}
                  formatter={(s) => s.avoidRate.toFixed(2)}
                  noItemsLabel="対象者なし(20半荘以上参加者がいません)"
                />
              </div>
            </div>
          );
        })()}

        {/* 👤 メンバー詳細モーダル */}
        {memberDetailModal && (() => {
          const { m, p } = memberDetailModal;
          if (!m) return null;
          return (
            <div
              onClick={()=>setMemberDetailModal(null)}
              style={{
                position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",
                display:"flex",alignItems:"center",justifyContent:"center",
                zIndex:9999,padding:20
              }}
            >
              <div
                onClick={e=>e.stopPropagation()}
                style={{
                  background:"linear-gradient(135deg,#1a1a2e,#16213e)",
                  border:"1px solid rgba(255,255,255,0.15)",
                  borderRadius:16,padding:24,width:"100%",maxWidth:340,
                  position:"relative"
                }}
              >
                {/* 閉じるボタン */}
                <button
                  onClick={()=>setMemberDetailModal(null)}
                  style={{position:"absolute",top:12,right:12,...S.bs()}}
                >✕</button>

                {/* アイコン（拡大表示） */}
                <div style={{textAlign:"center",marginBottom:12}}>
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} style={{
                      width:100,height:100,borderRadius:"50%",objectFit:"cover",
                      border:"3px solid rgba(255,255,255,0.2)",
                      boxShadow:"0 4px 20px rgba(0,0,0,0.5)"
                    }}/>
                  ) : (
                    <div style={{
                      width:100,height:100,borderRadius:"50%",background:mc(m),
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:40,fontWeight:700,color:"#fff",margin:"0 auto",
                      border:"3px solid rgba(255,255,255,0.2)",
                      boxShadow:"0 4px 20px rgba(0,0,0,0.5)"
                    }}>{m.name.slice(0,1)}</div>
                  )}
                  <div style={{fontSize:18,fontWeight:700,color:"#fff",marginTop:10}}>{m.name}</div>
                </div>

                {/* 成績データ */}
                {p && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                    {[
                      ["🎯 スコア", fw(p.sc), cc(p.sc)],
                      ["💰 勝ち分", fwy(p.kati), cc(p.kati)],
                      ["🧾 清算", fwy(p.seisan), cc(p.seisan)],
                      ["🎮 半荘数", `${p.games}回`, "#ccc"],
                      ["🏆 トップ率", `${p.wr}%`, p.wr>=30?"#f1c40f":p.wr>=25?"#f39c12":"#ccc"],
                      ["📊 平均順位", p.avgRank ? p.avgRank.toFixed(2)+"位" : "-", "#ccc"],
                    ].map(([label, val, col])=>(
                      <div key={label} style={{
                        background:"rgba(255,255,255,0.05)",borderRadius:8,
                        padding:"8px 10px",textAlign:"center"
                      }}>
                        <div style={{fontSize:9,color:"#666",marginBottom:3}}>{label}</div>
                        <div style={{fontSize:14,fontWeight:700,color:col}}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 詳細ページへのボタン */}
                <button
                  onClick={()=>{ setMemberDetailModal(null); setDashSub("lifetime"); }}
                  style={{
                    width:"100%",marginTop:14,padding:"10px 0",
                    background:"rgba(231,76,60,0.2)",border:"1px solid rgba(231,76,60,0.4)",
                    borderRadius:8,color:"#e74c3c",fontSize:12,fontWeight:600,cursor:"pointer"
                  }}
                >
                  📊 生涯成績を見る →
                </button>
              </div>
            </div>
          );
        })()}

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

            {/* 公式Tシャツセクション */}
            <div style={{marginBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:"#eee",textAlign:"center",marginBottom:4}}>🛍 公式Tシャツ販売中！</div>
              <div style={{fontSize:10,color:"#555",textAlign:"center",marginBottom:10}}>¥4,200（税込・送料無料）</div>
              <a href="https://tounericrew.base.shop/items/145842656" target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none"}}>
                <img src="data:image/png;base64,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" alt="公式Tシャツ" style={{width:"100%",borderRadius:10,objectFit:"cover",display:"block",marginBottom:8}}/>
                <div style={{textAlign:"center",fontSize:11,color:"#3498db",fontWeight:600,letterSpacing:1}}>購入はこちら →</div>
              </a>
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
                      <span><span style={{color:"#f1c40f",fontWeight:600}}>スコア +100ポイント以上</span>（純粋な得点）</span>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:10,color:"#ccc"}}>
                      <span>🔥</span>
                      <span><span style={{color:"#f1c40f",fontWeight:600}}>10半荘以上参加</span></span>
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
                    <div style={{fontSize:10,color:"#aaa",marginBottom:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span>1. Safariでこのページを開く</span>
                      <button onClick={()=>{
                        navigator.clipboard.writeText("https://tleague.nerima-night-crew.com").then(()=>showToast("success","✅ URLをコピーしました"));
                      }} style={{fontSize:9,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(52,152,219,0.4)",background:"rgba(52,152,219,0.12)",color:"#7fb9e0",cursor:"pointer",whiteSpace:"nowrap"}}>
                        🔗 URLコピー
                      </button>
                    </div>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>
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
                    <div style={{fontSize:10,color:"#aaa",marginBottom:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span>1. Chromeでこのページを開く</span>
                      <button onClick={()=>{
                        navigator.clipboard.writeText("https://tleague.nerima-night-crew.com").then(()=>showToast("success","✅ URLをコピーしました"));
                      }} style={{fontSize:9,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(52,152,219,0.4)",background:"rgba(52,152,219,0.12)",color:"#7fb9e0",cursor:"pointer",whiteSpace:"nowrap"}}>
                        🔗 URLコピー
                      </button>
                    </div>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>
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

            {/* ゴミ箱セクション */}
            {(trashSessions.length > 0 || trashMembers.length > 0) && (
              <div style={{marginTop:8,marginBottom:8}}>
                <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:500,color:"#ccc",marginBottom:8}}>🗑 ゴミ箱</div>
                  <div style={{fontSize:9,color:"#555",marginBottom:10}}>削除から30日後に自動完全削除されます</div>

                  {/* 削除済みセッション */}
                  {trashSessions.map(s=>{
                    const daysLeft = Math.max(0, 30 - Math.floor((Date.now()-new Date(s.deleted_at).getTime())/(1000*60*60*24)));
                    return (
                      <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:"#aaa"}}>📅 {s.date}（{s.rounds?.length||0}半荘）</div>
                          <div style={{fontSize:9,color:"#555"}}>残り{daysLeft}日で完全削除</div>
                        </div>
                        <button onClick={async()=>{
                          await supabase.from("sessions").update({deleted_at:null}).eq("id",s.id);
                          setSessions(prev=>[...prev,{...s,deleted_at:null}].sort((a,b)=>a.created_at>b.created_at?1:-1));
                          setTrashSessions(prev=>prev.filter(x=>x.id!==s.id));
                          showToast("success","✅ 対局データを復活しました");
                        }} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(46,204,113,0.4)",background:"rgba(46,204,113,0.1)",color:"#2ecc71",cursor:"pointer",whiteSpace:"nowrap"}}>
                          ↩ 復活
                        </button>
                        <button onClick={async()=>{
                          if(!window.confirm(`${s.date}の対局を完全削除しますか？\n元に戻せません。`)) return;
                          await supabase.from("sessions").delete().eq("id",s.id);
                          setTrashSessions(prev=>prev.filter(x=>x.id!==s.id));
                          showToast("success","🗑 完全削除しました");
                        }} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(231,76,60,0.4)",background:"rgba(231,76,60,0.1)",color:"#e74c3c",cursor:"pointer",whiteSpace:"nowrap"}}>
                          完全削除
                        </button>
                      </div>
                    );
                  })}

                  {/* 削除済みメンバー */}
                  {trashMembers.map(m=>{
                    const daysLeft = Math.max(0, 30 - Math.floor((Date.now()-new Date(m.deleted_at).getTime())/(1000*60*60*24)));
                    return (
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <Av m={m} sz={22}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:"#aaa"}}>{m.name}</div>
                          <div style={{fontSize:9,color:"#555"}}>残り{daysLeft}日で完全削除</div>
                        </div>
                        <button onClick={async()=>{
                          await supabase.from("members").update({deleted_at:null}).eq("id",m.id);
                          setMembers(prev=>[...prev,{...m,deleted_at:null}].sort((a,b)=>a.id-b.id));
                          setTrashMembers(prev=>prev.filter(x=>x.id!==m.id));
                          showToast("success","✅ メンバーを復活しました");
                        }} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(46,204,113,0.4)",background:"rgba(46,204,113,0.1)",color:"#2ecc71",cursor:"pointer",whiteSpace:"nowrap"}}>
                          ↩ 復活
                        </button>
                        <button onClick={async()=>{
                          if(!window.confirm(`${m.name}を完全削除しますか？\n元に戻せません。`)) return;
                          await supabase.from("members").delete().eq("id",m.id);
                          setTrashMembers(prev=>prev.filter(x=>x.id!==m.id));
                          showToast("success","🗑 完全削除しました");
                        }} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(231,76,60,0.4)",background:"rgba(231,76,60,0.1)",color:"#e74c3c",cursor:"pointer",whiteSpace:"nowrap"}}>
                          完全削除
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

            // 生涯MVP1位回数（全sessions・月ごとに1位のみカウント）
            const mvpMonths = new Set(sessions.map(s=>s.date.slice(0,7)));
            let mvpCount = 0;
            mvpMonths.forEach(month=>{
              const topId = calcTopMvpId(sessions, members, month);
              if(topId === m.id) mvpCount++;
            });

            return{
              ...m, sc:Math.round(sc), seisan, ba, kati, games, chY,
              r1,r2,r3,r4,yakuman,openRiichiCount,dealInCount,mvpCount,
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

          // 対人成績計算（ハイ&ローでも使用するためダッシュボードレベルで計算）
          let h2hStats = null;
          if (h2hA && h2hB) {
            const mA = gm(h2hA), mB = gm(h2hB);
            const sidA = String(h2hA), sidB = String(h2hB);
            let togames=0, aWins=0, bWins=0, aSc=0, bSc=0;
            let aR1=0,aR2=0,aR3=0,aR4=0, bR1=0,bR2=0,bR3=0,bR4=0;
            const h2hHistory = [];
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
                const sorted = [...rPlayers].sort((x,y)=>N(r.scores[String(y)]??r.scores[y])-N(r.scores[String(x)]??r.scores[x]));
                const rankA = sorted.indexOf(h2hA)+1, rankB = sorted.indexOf(h2hB)+1;
                if(rankA===1)aR1++; else if(rankA===2)aR2++; else if(rankA===3)aR3++; else aR4++;
                if(rankB===1)bR1++; else if(rankB===2)bR2++; else if(rankB===3)bR3++; else bR4++;
                h2hHistory.push({ date:s.date, va, vb, rankA, rankB });
              });
            });
            h2hStats = { mA, mB, togames, aWins, bWins, aSc, bSc, aR1,aR2,aR3,aR4, bR1,bR2,bR3,bR4, history:h2hHistory };
          }
          const sortTh = (k, label) => (
            <th key={k} onClick={()=>handleSort(k)} style={{color:sortKey===k?"#e74c3c":"#666",fontWeight:400,padding:"5px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",whiteSpace:"nowrap",userSelect:"none",fontSize:10}}>
              {label}{sortKey===k?(sortAsc?"↑":"↓"):""}
            </th>
          );

          return (
            <>
              <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                {[["summary","📊 概要"],["lifetime","🏆 生涯成績"],["h2h","⚔️ 対人成績"],["yakuman","🀄 役満"],["highscore","👑 最高点"],["chip","💰 チップ王"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setDashSub(v)} style={{padding:"5px 12px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,
                    background:dashSub===v?"#e74c3c":"rgba(255,255,255,0.1)",
                    color:"#fff",position:"relative"}}>
                    {l}
                  </button>
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
                          const rank = mvpRanks[p.id];
                          const ms = MVP_STYLE[rank];
                          return (
                          <div key={p.id} style={S.card({
                            background: ms ? ms.bg : i===0 ? "linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.12))" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${ms ? ms.border : i===0 ? "#e74c3c" : "rgba(255,255,255,0.1)"}`,
                            textAlign:"center", padding:10,
                            animation: isMvp ? "cardReveal 0.5s ease both" : "none",
                          })}>
                            {isMvp ? <MvpAv m={gm(p.id)} sz={36} onClick={()=>setMemberDetailModal({m: gm(p.id), p})}/> : <Av m={gm(p.id)} sz={36} onClick={()=>setMemberDetailModal({m: gm(p.id), p})}/>}
                            <div style={{fontSize:12,fontWeight:500,marginTop:isMvp?8:4}}>
                              {p.name}
                              {ms && <span style={{display:"block",fontSize:9,background:ms.badge,color:ms.badgeColor,fontWeight:"bold",padding:"1px 5px",borderRadius:6,animation:"badgeIn 0.4s ease both",marginTop:2}}>{ms.label}</span>}
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
                          const ms = MVP_STYLE[mvpRanks[p.id]];
                          return (
                          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                            {isMvp ? <MvpAv m={gm(p.id)} sz={28}/> : <Av m={gm(p.id)} sz={28}/>}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:500}}>
                                {p.name}
                                {ms && <span style={{fontSize:8,background:ms.badge,color:ms.badgeColor,fontWeight:"bold",padding:"1px 4px",borderRadius:4,marginLeft:4}}>MVP</span>}
                              </div>
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
                            {sortTh("mvpCount","👑月MVP")}
                          </tr>
                        </thead>
                        <tbody>
                          {liSorted.map((p,i)=>{
                            const isMvp = mvpIds.includes(p.id);
                            const rank = mvpRanks[p.id];
                            const ms = MVP_STYLE[rank];
                            return (
                            <tr key={p.id} onClick={()=>setLifeDetail(lifeDetail===p.id?null:p.id)}
                              style={{cursor:"pointer",
                                background: ms ? ms.bg : lifeDetail===p.id ? "rgba(231,76,60,0.08)" : i%2===0 ? "transparent" : "rgba(255,255,255,0.02)",
                                animation: isMvp ? "cardReveal 0.5s ease both" : "none",
                                animationDelay: isMvp ? `${i*0.08}s` : "0s",
                                outline: ms ? `1px solid ${ms.border}` : "none",
                              }}>
                              <td style={{padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:11}}>{RI[i]||"—"}</span>
                                  {isMvp ? <MvpAv m={gm(p.id)} sz={18}/> : <Av m={gm(p.id)} sz={18}/>}
                                  <span style={{fontSize:12,fontWeight:500}}>{p.name}</span>
                                  {ms && <span style={{fontSize:9,background:ms.badge,color:ms.badgeColor,fontWeight:"bold",padding:"1px 5px",borderRadius:6,animation:"badgeIn 0.4s ease both",marginLeft:2}}>{ms.label}</span>}
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
                              <td style={{padding:"6px 4px",textAlign:"right",borderBottom:"1px solid rgba(255,255,255,0.05)",color:p.mvpCount>0?"#f1c40f":"#555",fontWeight:p.mvpCount>0?"bold":"normal"}}>{p.mvpCount>0?`👑${p.mvpCount}`:"-"}</td>
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
                          <div key={m.id} onClick={()=>{setter(on?null:m.id);setHiloMode(false);setHiloPhase("idle");setHiloCards([]);setHiloLog([]);setHiloReveal(null);}}
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

              {/* ハイ&ロー サブタブ */}
              {dashSub==="hilo" && (()=>{
                const mA = gm(hiloSelA), mB = gm(hiloSelB);
                const hasPlayers = hiloSelA && hiloSelB;

                // 選んだ2人の対戦履歴を独立計算
                const hiloHistory = [];
                if (hasPlayers) {
                  const sidA = String(hiloSelA), sidB = String(hiloSelB);
                  sessions.forEach(s => {
                    const sMembers = s.members.map(Number);
                    if (!sMembers.includes(hiloSelA) || !sMembers.includes(hiloSelB)) return;
                    s.rounds.forEach(r => {
                      const rPlayers = r.players.map(Number);
                      if (!rPlayers.includes(hiloSelA) || !rPlayers.includes(hiloSelB)) return;
                      const va = N(r.scores[sidA] ?? r.scores[hiloSelA]);
                      const vb = N(r.scores[sidB] ?? r.scores[hiloSelB]);
                      hiloHistory.push({ va, vb, diff: va - vb });
                    });
                  });
                }
                const hasHistory = hiloHistory.length >= 2;

                const startGame = () => {
                  const shuffled = [...hiloHistory].sort(()=>Math.random()-0.5).slice(0,11);
                  const cards = shuffled.map(h=>Math.abs(h.diff)); // スコア差の絶対値
                  setHiloCards(cards);
                  setHiloCardIdx(0);
                  setHiloScoreA(0); setHiloScoreB(0);
                  setHiloLog([]); setHiloReveal(null);
                  setHiloRound(0); setHiloSubTurn("senko");
                  setHiloMode(true); setHiloPhase("decide");
                };

                const resetGame = () => {
                  setHiloMode(false); setHiloPhase("idle");
                  setHiloCards([]); setHiloCardIdx(0);
                  setHiloScoreA(0); setHiloScoreB(0);
                  setHiloLog([]); setHiloReveal(null);
                };

                const totalRounds = Math.min(5, Math.floor((hiloCards.length-1)/2));
                const isDone = hiloRound >= totalRounds;
                const curCard = hiloCards[hiloCardIdx];

                const handlePred = (pred) => {
                  const nextIdx = hiloCardIdx + 1;
                  if(nextIdx >= hiloCards.length) return;
                  const nextCard = hiloCards[nextIdx];
                  const isHigh = nextCard > curCard;
                  const isLow  = nextCard < curCard;
                  const isSame = nextCard === curCard;
                  const correct = isSame ? false : (pred==="high" ? isHigh : isLow);
                  const who = hiloSubTurn==="senko" ? hiloSenko : (hiloSenko==="a"?"b":"a");
                  const newLog = [...hiloLog, {round:hiloRound, who, pred, correct, prev:curCard, next:nextCard}];
                  let newScoreA = hiloScoreA, newScoreB = hiloScoreB;
                  if(correct){ if(who==="a") newScoreA++; else newScoreB++; }
                  setHiloLog(newLog);
                  setHiloScoreA(newScoreA); setHiloScoreB(newScoreB);
                  setHiloReveal({pred, correct, prev:curCard, next:nextCard, isSame});
                  setTimeout(()=>{
                    setHiloReveal(null);
                    setHiloCardIdx(nextIdx);
                    if(hiloSubTurn==="senko"){
                      setHiloSubTurn("koko");
                    } else {
                      const nextRound = hiloRound+1;
                      if(nextRound >= totalRounds) setHiloPhase("result");
                      else { setHiloRound(nextRound); setHiloSubTurn("senko"); }
                    }
                  }, 1400);
                };

                const currentWho = hiloSubTurn==="senko" ? hiloSenko : (hiloSenko==="a"?"b":"a");
                const currentMem = currentWho==="a" ? mA : mB;

                return (
                  <>
                    <div style={{fontSize:13,fontWeight:600,color:"#f39c12",marginBottom:6}}>🃏 T.LEAGUEハイ＆ロー</div>
                    <div style={{fontSize:10,color:"#666",marginBottom:10,lineHeight:1.7}}>
                      2人を選んでSTART。過去の対戦スコア差をカードに見立て、次のカードが HIGH（大きい）か LOW（小さい）かを交互に予想。5ラウンド制、正解数が多い方の勝ち。
                      <span style={{color:"#555"}}> ※対戦履歴2件以上必要</span>
                    </div>

                    {/* メンバー選択 */}
                    {!hiloMode && (
                      <div style={{...S.card({background:"rgba(255,255,255,0.04)"}),marginBottom:10}}>
                        <div style={{fontSize:11,color:"#888",marginBottom:8}}>対戦する2人を選んでください</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                          {members.map(m=>{
                            const isA = hiloSelA===m.id;
                            const isB = hiloSelB===m.id;
                            const sel = isA?"A":isB?"B":null;
                            return (
                              <div key={m.id} onClick={()=>{
                                if(isA){ setHiloSelA(null); }
                                else if(isB){ setHiloSelB(null); }
                                else if(!hiloSelA){ setHiloSelA(m.id); }
                                else if(!hiloSelB && m.id!==hiloSelA){ setHiloSelB(m.id); }
                              }} style={{borderRadius:8,padding:"6px 4px",textAlign:"center",cursor:"pointer",position:"relative",
                                border:isA?"2px solid #e74c3c":isB?"2px solid #3498db":"1px solid rgba(255,255,255,0.12)",
                                background:isA?"rgba(231,76,60,0.15)":isB?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.03)"}}>
                                <Av m={m} sz={28}/>
                                <div style={{fontSize:10,marginTop:3,color:sel?"#fff":"#aaa"}}>{m.name}</div>
                                {sel && <div style={{position:"absolute",top:3,right:5,fontSize:9,fontWeight:"bold",color:isA?"#e74c3c":"#3498db"}}>{sel}</div>}
                              </div>
                            );
                          })}
                        </div>
                        {hasPlayers && (
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginTop:10,fontSize:11,color:"#ccc"}}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}><Av m={mA} sz={18}/>{mA?.name}</div>
                            <span style={{color:"#555"}}>vs</span>
                            <div style={{display:"flex",alignItems:"center",gap:4}}><Av m={mB} sz={18}/>{mB?.name}</div>
                            {hasHistory && <span style={{fontSize:9,color:"#666",marginLeft:4}}>{hiloHistory.length}戦のデータ</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 未選択・履歴不足 */}
                    {!hasPlayers && <div style={{textAlign:"center",padding:12,color:"#555",fontSize:11}}>上から2人選んでください</div>}
                    {hasPlayers && !hasHistory && <div style={{textAlign:"center",padding:12,color:"#555",fontSize:11}}>この2人の対戦履歴が2件以上ないと遊べません</div>}

                    {/* START */}
                    {hasPlayers && hasHistory && !hiloMode && (
                      <button onClick={startGame} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",
                        background:"linear-gradient(135deg,#e74c3c,#f39c12)",color:"#fff",fontWeight:"bold",fontSize:15}}>
                        🃏 START ▶
                      </button>
                    )}

                    {/* 先攻後攻決め */}
                    {hiloMode && hiloPhase==="decide" && (
                      <div style={{...S.card({background:"linear-gradient(135deg,rgba(231,76,60,0.06),rgba(243,156,18,0.06))",border:"1px solid rgba(243,156,18,0.3)"}),textAlign:"center",padding:"14px 10px"}}>
                        <div style={{fontSize:12,color:"#888",marginBottom:14}}>先攻・後攻をランダムで決めます</div>
                        <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:16}}>
                          <div style={{textAlign:"center"}}><Av m={mA} sz={40}/><div style={{fontSize:11,marginTop:4,color:"#e74c3c"}}>{mA?.name}</div></div>
                          <div style={{fontSize:20,color:"#555",alignSelf:"center"}}>vs</div>
                          <div style={{textAlign:"center"}}><Av m={mB} sz={40}/><div style={{fontSize:11,marginTop:4,color:"#3498db"}}>{mB?.name}</div></div>
                        </div>
                        <button onClick={()=>{ setHiloSenko(Math.random()<0.5?"a":"b"); setHiloPhase("playing"); }}
                          style={{padding:"12px 28px",borderRadius:10,border:"none",cursor:"pointer",
                            background:"linear-gradient(135deg,#e74c3c,#f39c12)",color:"#fff",fontWeight:"bold",fontSize:14}}>
                          🎲 ランダム決定
                        </button>
                      </div>
                    )}

                    {/* ゲーム中 */}
                    {hiloMode && hiloPhase==="playing" && !isDone && (
                      <div style={S.card({background:"linear-gradient(135deg,rgba(231,76,60,0.06),rgba(243,156,18,0.06))",border:"1px solid rgba(243,156,18,0.3)"})}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"6px 10px",background:"rgba(0,0,0,0.2)",borderRadius:8}}>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#888",marginBottom:2}}>{mA?.name}{hiloSenko==="a"?" 👑先攻":""}</div>
                            <div style={{fontSize:22,fontWeight:"bold",color:hiloScoreA>=hiloScoreB?"#2ecc71":"#e74c3c"}}>{hiloScoreA}pt</div>
                          </div>
                          <div style={{fontSize:10,color:"#555"}}>第{hiloRound+1}ラウンド / {totalRounds}</div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#888",marginBottom:2}}>{mB?.name}{hiloSenko==="b"?" 👑先攻":""}</div>
                            <div style={{fontSize:22,fontWeight:"bold",color:hiloScoreB>=hiloScoreA?"#2ecc71":"#e74c3c"}}>{hiloScoreB}pt</div>
                          </div>
                        </div>

                        <div style={{textAlign:"center",marginBottom:14}}>
                          <div style={{fontSize:10,color:"#888",marginBottom:6}}>現在のカード（2人のスコア差）</div>
                          <div style={{display:"inline-block",background:"rgba(255,255,255,0.1)",border:"2px solid rgba(243,156,18,0.6)",borderRadius:12,padding:"12px 28px"}}>
                            <div style={{fontSize:32,fontWeight:"bold",color:"#f39c12"}}>{curCard}</div>
                          </div>
                        </div>

                        {hiloReveal && (
                          <div style={{textAlign:"center",marginBottom:12,padding:"10px",borderRadius:8,
                            background:hiloReveal.correct?"rgba(46,204,113,0.15)":"rgba(231,76,60,0.15)",
                            border:`1px solid ${hiloReveal.correct?"rgba(46,204,113,0.4)":"rgba(231,76,60,0.4)"}`}}>
                            <div style={{fontSize:20}}>{hiloReveal.correct?"✅":"❌"}</div>
                            <div style={{fontSize:13,fontWeight:"bold",color:hiloReveal.correct?"#2ecc71":"#e74c3c"}}>
                              {hiloReveal.isSame?"引き分け（同値）":hiloReveal.correct?"正解！":"ハズレ"}
                            </div>
                            <div style={{fontSize:11,color:"#888",marginTop:2}}>
                              次：<span style={{color:hiloReveal.next>hiloReveal.prev?"#2ecc71":"#e74c3c",fontWeight:"bold"}}>{hiloReveal.next}</span>
                              <span style={{marginLeft:6}}>{hiloReveal.next>hiloReveal.prev?"▲HIGH":hiloReveal.next<hiloReveal.prev?"▼LOW":"→SAME"}</span>
                            </div>
                          </div>
                        )}

                        {!hiloReveal && (
                          <>
                            <div style={{textAlign:"center",marginBottom:10}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:4}}>
                                <Av m={currentMem} sz={22}/>
                                <span style={{fontSize:12,color:"#ccc"}}>{currentMem?.name}</span>
                                <span style={{fontSize:10,color:"#888"}}>（{hiloSubTurn==="senko"?"先攻":"後攻"}）</span>
                              </div>
                              <div style={{fontSize:11,color:"#888"}}>次のカードは？</div>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                              <button onClick={()=>handlePred("high")}
                                style={{padding:"18px 0",borderRadius:10,border:"2px solid rgba(46,204,113,0.5)",background:"rgba(46,204,113,0.15)",color:"#2ecc71",fontWeight:"bold",fontSize:20,cursor:"pointer"}}>
                                ▲ HIGH
                              </button>
                              <button onClick={()=>handlePred("low")}
                                style={{padding:"18px 0",borderRadius:10,border:"2px solid rgba(231,76,60,0.5)",background:"rgba(231,76,60,0.15)",color:"#e74c3c",fontWeight:"bold",fontSize:20,cursor:"pointer"}}>
                                ▼ LOW
                              </button>
                            </div>
                          </>
                        )}
                        <button onClick={resetGame} style={{marginTop:10,width:"100%",padding:"6px",borderRadius:6,border:"none",background:"rgba(255,255,255,0.06)",color:"#555",cursor:"pointer",fontSize:10}}>🃏 やめる</button>
                      </div>
                    )}

                    {/* 結果発表 */}
                    {hiloMode && (hiloPhase==="result"||isDone) && (
                      <div style={S.card({background:"linear-gradient(135deg,rgba(231,76,60,0.06),rgba(243,156,18,0.06))",border:"1px solid rgba(243,156,18,0.3)"})}>
                        <div style={{textAlign:"center",marginBottom:14,fontSize:13,color:"#ccc"}}>🏁 ゲーム終了！</div>
                        <div style={{display:"flex",justifyContent:"space-around",marginBottom:16}}>
                          <div style={{textAlign:"center"}}>
                            <Av m={mA} sz={44}/>
                            <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{mA?.name}</div>
                            <div style={{fontSize:11,color:"#888"}}>{hiloSenko==="a"?"👑先攻":"後攻"}</div>
                            <div style={{fontSize:30,fontWeight:"bold",color:hiloScoreA>hiloScoreB?"#2ecc71":"#e74c3c",marginTop:4}}>{hiloScoreA}pt</div>
                          </div>
                          <div style={{fontSize:18,color:"#555",alignSelf:"center"}}>vs</div>
                          <div style={{textAlign:"center"}}>
                            <Av m={mB} sz={44}/>
                            <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{mB?.name}</div>
                            <div style={{fontSize:11,color:"#888"}}>{hiloSenko==="b"?"👑先攻":"後攻"}</div>
                            <div style={{fontSize:30,fontWeight:"bold",color:hiloScoreB>hiloScoreA?"#2ecc71":"#e74c3c",marginTop:4}}>{hiloScoreB}pt</div>
                          </div>
                        </div>
                        {hiloScoreA!==hiloScoreB && <div style={{textAlign:"center",fontSize:18,fontWeight:700,color:"#ffd700",marginBottom:12}}>🏆 {hiloScoreA>hiloScoreB?mA?.name:mB?.name} の勝ち！</div>}
                        {hiloScoreA===hiloScoreB && <div style={{textAlign:"center",fontSize:16,fontWeight:700,color:"#aaa",marginBottom:12}}>🤝 引き分け！</div>}
                        <div style={{marginBottom:12}}>
                          {hiloLog.map((l,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:10}}>
                              <span style={{color:"#555",width:52}}>R{l.round+1} {l.who==="a"?mA?.name:mB?.name}</span>
                              <span style={{color:l.pred==="high"?"#2ecc71":"#e74c3c",fontWeight:"bold",width:36}}>{l.pred==="high"?"▲HIGH":"▼LOW"}</span>
                              <span style={{color:"#555"}}>{l.prev}→{l.next}</span>
                              <span style={{marginLeft:"auto"}}>{l.correct?"✅":"❌"}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={startGame} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#e74c3c,#f39c12)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>もう一度</button>
                          <button onClick={resetGame} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.1)",color:"#aaa",cursor:"pointer",fontSize:12}}>閉じる</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* 外馬モード サブタブ - 外馬レース機能 */}
              {dashSub==="sotoba" && (()=>{
                // 対局中（メンバー選択後〜確認画面まで）はLIVE扱い
                const isLive = (addStep === 2 || addStep === 3) && addSel.length > 0;
                const currentRoundIndex = addRounds.length;
                const playingMembers = rpSkenbans.length > 0
                  ? addSel.filter(id => !rpSkenbans.includes(id)).map(id => gm(id)).filter(Boolean)
                  : addSel.map(id => gm(id)).filter(Boolean);

                // 馬券種類の定義
                const BET_TYPES = [
                  { key:"tansho",    label:"単勝",    desc:"1位を当てる", picks:1 },
                  { key:"umaren",    label:"馬連",    desc:"1・2位（順不同）", picks:2 },
                  { key:"sanrentan", label:"三連単",  desc:"1〜3位を順番通り", picks:3 },
                  { key:"yonrentan", label:"四連単",  desc:"全順位を順番通り", picks:4 },
                ];

                // 強さスコア・単勝オッズを計算（参加者がいるときだけ）
                let strengthMap = null, tanshoOdds = null;
                if(isLive && playingMembers.length === 4) {
                  strengthMap = calcHorseStrength(sessions, members, addSel.map(Number));
                  tanshoOdds = calcTanshoOdds(strengthMap);
                }

                // 馬券購入の締切判定
                // その日の参加メンバー（対局メンバー＋抜け番）: 10分以内
                // その日に参加していない人（外馬）: 半荘結果が保存されるまで購入可能（時間制限なし）
                const raceStarted = raceStartTimes[currentRoundIndex] || null;
                const elapsedMs = raceStarted ? (Date.now() - raceStarted) : 0;
                const isSelfInAttendance = raceSelf && addSel.map(Number).includes(Number(raceSelf)); // その日参加者か
                const limitSec = isSelfInAttendance ? 600 : null; // 参加者は600秒(10分)、外馬は制限なし
                const remainSec = limitSec !== null
                  ? (raceStarted ? Math.max(0, limitSec - Math.floor(elapsedMs/1000)) : limitSec)
                  : 999;
                const bettingOpen = remainSec > 0;
                const remainMin = Math.floor(remainSec/60);
                const remainSecMod = remainSec % 60;

                // 自分が今の半荘に対してすでに購入済みか
                const myBet = raceSelf
                  ? raceBets.find(b=>b.session_date===addDate&&b.round_index===currentRoundIndex&&Number(b.bettor_id)===Number(raceSelf))
                  : null;

                // 現在選択中の馬券種類に対する選択数チェック
                const currentBetTypeDef = BET_TYPES.find(t=>t.key===raceBetType);
                const requiredPicks = currentBetTypeDef?.picks || 0;
                const selectionsValid = raceSelection.length === requiredPicks;

                // 選択中のオッズ計算
                let currentOdds = null;
                if(selectionsValid && tanshoOdds) {
                  if(raceBetType==="tansho")   currentOdds = tanshoOdds[raceSelection[0]];
                  else if(raceBetType==="umaren")    currentOdds = calcUmarenOdds(raceSelection[0], raceSelection[1], tanshoOdds);
                  else if(raceBetType==="sanrentan") currentOdds = calcSanrentanOdds(raceSelection[0], raceSelection[1], raceSelection[2], tanshoOdds);
                  else if(raceBetType==="yonrentan") currentOdds = calcYonrentanOdds(raceSelection[0], raceSelection[1], raceSelection[2], raceSelection[3], tanshoOdds);
                }

                // 馬の追加・削除
                const toggleHorse = (id) => {
                  if(!currentBetTypeDef) return;
                  if(raceSelection.includes(id)) {
                    setRaceSelection(raceSelection.filter(x=>x!==id));
                  } else if(raceSelection.length < requiredPicks) {
                    setRaceSelection([...raceSelection, id]);
                  }
                };

                // 購入処理
                const submitBet = async () => {
                  if(!raceSelf || !raceBetType || !selectionsValid || !currentOdds) {
                    showToast("error", `⚠️ 購入できません (raceSelf:${!!raceSelf} betType:${!!raceBetType} valid:${selectionsValid} odds:${!!currentOdds})`);
                    return;
                  }
                  // 同一人物が同一半荘で2回以上賭けるのを防止
                  const alreadyBet = raceBets.find(b =>
                    b.session_date === addDate &&
                    b.round_index === currentRoundIndex &&
                    Number(b.bettor_id) === Number(raceSelf)
                  );
                  if (alreadyBet) { showToast("error", "⚠️ この半荘ではすでに馬券を購入済みです"); return; }
                  const myChips = currentChips(raceSelf);
                  if (raceBetAmount < 1 || raceBetAmount > myChips) {
                    showToast("error", `⚠️ 賭けチップは1〜${myChips}枚で入力してください`); return;
                  }
                  setRaceBetSubmitting(true);
                  const {data, error} = await supabase.from("race_bets").insert({
                    session_date: addDate,
                    round_index: currentRoundIndex,
                    bettor_id: Number(raceSelf),
                    bet_type: raceBetType,
                    bet_selection: raceSelection,
                    odds: currentOdds,
                    bet_amount: raceBetAmount,
                    actual_result: null,
                    is_hit: null,
                    payout: null,
                  }).select().single();
                  if (error) {
                    console.error("race_bets insert error:", error);
                    if (error.code === "23505") {
                      showToast("error", "⚠️ この半荘ではすでに馬券を購入済みです（別端末からの購入が確認されました）");
                    } else {
                      showToast("error", `⚠️ 馬券購入失敗: ${error.message || error.code || "原因不明"}`);
                    }
                    setRaceBetSubmitting(false);
                    return;
                  }
                  if(data) {
                    setRaceBets(prev=>[data, ...prev]);
                    raceBetsRef.current = [data, ...raceBetsRef.current];
                  } else {
                    showToast("error", "⚠️ DBから保存データが返ってきませんでした");
                    setRaceBetSubmitting(false);
                    return;
                  }
                  setRaceBetType(null); setRaceSelection([]); setRaceBetAmount(1);
                  setRaceBetSubmitting(false);
                  showToast("success", `🎫 馬券購入！ ${raceBetAmount}チップ消費`);
                };

                // ===========================================
                // フィニッシュ掲示板：直前の半荘結果
                // ===========================================
                let finishBoard = null;
                if (addRounds.length > 0) {
                  const lastRound = addRounds[addRounds.length - 1];
                  const lastIdx = addRounds.length - 1;
                  const sorted = [...lastRound.players].sort((a,b)=>N(lastRound.scores[String(b)]??lastRound.scores[b])-N(lastRound.scores[String(a)]??lastRound.scores[a]));
                  const finishResults = sorted.map((pid, idx) => ({
                    rank: idx+1,
                    member: gm(Number(pid)),
                    score: N(lastRound.scores[String(pid)]??lastRound.scores[pid]),
                    horseNum: addSel.map(Number).indexOf(Number(pid)) + 1,
                  }));
                  // 1-2位の差
                  const gap12 = finishResults.length >= 2 ? Math.abs(finishResults[0].score - finishResults[1].score) : 9999;
                  const photoFinish = gap12 <= 1000;
                  // この半荘の馬券（自分の）
                  const lastBet = raceSelf
                    ? raceBets.find(b=>b.session_date===addDate && b.round_index===lastIdx && Number(b.bettor_id)===Number(raceSelf))
                    : null;
                  finishBoard = { finishResults, photoFinish, gap12, lastBet, lastIdx };
                }

                // ===========================================
                // 馬券的中ランキング（全データ）
                // ===========================================
                const betRanking = {};
                members.forEach(m => { betRanking[m.id] = { name:m.name, total:0, hits:0, sumPayout:0 }; });
                raceBets.forEach(b => {
                  if (b.is_hit === null) return;
                  const bid = Number(b.bettor_id);
                  if (!betRanking[bid]) return;
                  betRanking[bid].total++;
                  if (b.is_hit) {
                    betRanking[bid].hits++;
                    betRanking[bid].sumPayout += Number(b.payout || 0) * (b.bet_amount || 1);
                  }
                });
                const rankingList = Object.entries(betRanking)
                  .map(([id, v]) => ({ id: Number(id), ...v }))
                  .filter(v => v.total > 0)
                  .sort((a, b) => b.sumPayout - a.sumPayout);

                // チップ計算：ダッシュボードと完全に同じ計算式
                // = その人が実際に対局した半荘数（r.scoresにその人のスコアがあるもの）
                const memberChips = {};
                members.forEach(m => {
                  const sid = String(m.id);
                  let games = 0;
                  sessions.forEach(s => {
                    if (!(s.members || []).map(Number).includes(Number(m.id))) return;
                    (s.rounds || []).forEach(r => {
                      const v = r.scores?.[sid] ?? r.scores?.[m.id];
                      if (v != null) games++;
                    });
                  });
                  memberChips[m.id] = games;
                });

                // 保有コイン = 生涯半荘数 - 消費 + 払い戻し
                // race_bets から動的に計算（localStorage 不使用 / 二重加算なし）
                const currentChips = (id) => {
                  const base = memberChips[id] || 0;
                  const myBets = raceBets.filter(b => Number(b.bettor_id) === Number(id));
                  let delta = 0;
                  myBets.forEach(b => {
                    const amount = b.bet_amount || 1;
                    delta -= amount; // 賭けたら必ず消費
                    if (b.is_hit && b.payout > 0) {
                      // 払い戻し = odds倍率 × 賭け額（小数0.5以上繰り上げ）
                      delta += Math.round(Number(b.payout) * amount);
                    }
                  });
                  return base + delta;
                };


                return (
                  <>
                    <div style={{fontSize:13,fontWeight:600,color:"#e74c3c",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                      🏇 外馬レース
                      {isLive && <span style={{fontSize:10,background:"rgba(231,76,60,0.2)",color:"#e74c3c",padding:"2px 7px",borderRadius:6,border:"1px solid rgba(231,76,60,0.4)"}}>LIVE</span>}
                    </div>

                    {/* 外馬ルール表記 */}
                    <div style={{fontSize:10,color:"#888",marginBottom:10,background:"rgba(52,152,219,0.08)",borderRadius:6,padding:8,lineHeight:"1.6"}}>
                      <div style={{fontWeight:600,marginBottom:4,color:"#3498db"}}>🏇 外馬レースのルール</div>
                      <div style={{marginBottom:6,fontSize:11,color:"#aaa",lineHeight:"1.5"}}>対局している4人の成績を予想して馬券を購入。単勝・馬連・3連単・4連単で、持ちチップ（生涯参加半荘数で貯蓄）を賭けてランキングで遊ぶ</div>
                      <div>
                        ✓ 対局メンバー（その日参加 + 対局）= <span style={{color:"#f39c12",fontWeight:600}}>10分制限</span><br/>
                        ✓ 抜け番メンバー（その日参加 + 非対局）= <span style={{color:"#f39c12",fontWeight:600}}>10分制限</span><br/>
                        ✓ 外馬（参加していない人）= <span style={{color:"#2ecc71",fontWeight:600}}>時間無制限</span><br/>
                        ✓ <span style={{color:"#e74c3c",fontWeight:600}}>1半荘につき1種類の馬券のみ購入可能</span><br/>
                        <span style={{marginTop:4,display:"block",fontSize:9,color:"#999"}}>💡 <span style={{color:"#f1c40f"}}>チップは生涯の半荘参加数で貯まる</span>（参加するほど増える）</span>
                        <span style={{display:"block",fontSize:9,color:"#999"}}>💡 的中で配当倍率分のチップ払い戻し、ハズレで賭けチップ消費</span>
                      </div>
                    </div>

                    {/* LIVE中でない場合 */}
                    {!isLive && (
                      <div style={{textAlign:"center",padding:40,color:"#555"}}>
                        <div style={{fontSize:36,marginBottom:10}}>🏇</div>
                        <div style={{fontSize:13,color:"#666"}}>LIVE中のみ馬券を購入できます</div>
                        <div style={{fontSize:11,color:"#444",marginTop:6}}>対局が始まるとここにレースが表示されます</div>
                      </div>
                    )}

                    {/* LIVE中：4人参加していない場合 */}
                    {isLive && playingMembers.length !== 4 && (
                      <div style={{textAlign:"center",padding:24,color:"#555",fontSize:12}}>
                        4人対局のみ外馬レースが楽しめます（現在{playingMembers.length}人）
                      </div>
                    )}

                    {/* LIVE中・4人参加・馬券UI */}
                    {isLive && playingMembers.length === 4 && (
                      <>
                        {/* レーストラック */}
                        <RaceTrack
                          playingMembers={playingMembers}
                          strengthMap={strengthMap}
                          mySelection={myBet?.bet_selection || raceSelection}
                          betType={myBet?.bet_type || raceBetType}
                        />

                        {/* 🏁 前回半荘のフィニッシュ掲示板 */}
                        {finishBoard && (
                          <div style={{...S.card({background:"linear-gradient(135deg,rgba(241,196,15,0.1),rgba(231,76,60,0.08))",border:"1px solid rgba(241,196,15,0.4)"}),padding:"12px",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
                              <span style={{fontSize:18}}>🏁</span>
                              <span style={{fontSize:13,fontWeight:"bold",color:"#f1c40f"}}>第{finishBoard.lastIdx+1}レース 結果</span>
                              {/* 写真判定バッジ：毎回表示、差額に応じてラベル変更 */}
                              <span
                                onClick={()=>setShowGoalScene(v=>!v)}
                                style={{fontSize:9,padding:"2px 6px",
                                  background: finishBoard.gap12 <= 1000 ? "rgba(231,76,60,0.3)" : finishBoard.gap12 <= 5000 ? "rgba(243,156,18,0.3)" : "rgba(52,152,219,0.3)",
                                  color:"#fff",borderRadius:6,
                                  border: `1px solid ${finishBoard.gap12 <= 1000 ? "rgba(231,76,60,0.6)" : finishBoard.gap12 <= 5000 ? "rgba(243,156,18,0.6)" : "rgba(52,152,219,0.6)"}`,
                                  fontWeight:"bold",cursor:"pointer",
                                  animation: finishBoard.gap12 <= 1000 ? "pulse 1s infinite" : "none"}}>
                                {finishBoard.gap12 <= 1000 ? "📸 写真判定" : finishBoard.gap12 <= 5000 ? "⚡ 接戦" : "🏆 圧勝"}
                                {showGoalScene ? " ▲" : " ▼"}
                              </span>
                            </div>

                            {/* ゴールシーン：タップで展開、差額に応じた距離感 */}
                            {showGoalScene && (()=>{
                              const maxScore = finishBoard.finishResults[0]?.score ?? 0;
                              const lastScore = finishBoard.finishResults[finishBoard.finishResults.length-1]?.score ?? 0;
                              // 1位と最下位の差でスケール（差が大きいほど各馬が広がる）
                              const maxGap = Math.max(maxScore - lastScore, 500);
                              const trackW = 260, goalX = 240;
                              const horseColors = ["#e74c3c","#3498db","#2ecc71","#f1c40f"];
                              return (
                                <div style={{marginBottom:10,background:"rgba(0,0,0,0.3)",borderRadius:8,padding:8}}>
                                  <div style={{fontSize:9,color:"#888",textAlign:"center",marginBottom:4}}>
                                    ゴール前の距離感（1-2着差：{finishBoard.gap12}点）
                                  </div>
                                  <svg viewBox={`0 0 ${trackW} 80`} style={{width:"100%",height:"auto",display:"block"}}>
                                    {/* 芝生背景 */}
                                    <rect x="0" y="0" width={trackW} height="80" fill="#1a4a1a" rx="6"/>
                                    <rect x="0" y="55" width={trackW} height="25" fill="#236b23" rx="0"/>
                                    {/* ゴールライン */}
                                    <line x1={goalX} y1="0" x2={goalX} y2="80" stroke="#FFD700" strokeWidth="2"/>
                                    {/* 市松ゴール板 */}
                                    {[0,1,2,3].map(i=>(
                                      <rect key={i} x={goalX} y={i*8} width={8} height={8}
                                        fill={i%2===0?"#fff":"#111"} opacity="0.9"/>
                                    ))}
                                    {[0,1,2,3].map(i=>(
                                      <rect key={i} x={goalX+8} y={i*8} width={8} height={8}
                                        fill={i%2===0?"#111":"#fff"} opacity="0.9"/>
                                    ))}
                                    {/* 各馬の位置 */}
                                    {finishBoard.finishResults.map((r, i) => {
                                      const gap = maxScore - r.score;
                                      const pxBack = Math.min(180, (gap / maxGap) * 180);
                                      const hx = goalX - pxBack - 8;
                                      const hy = 18 + i * 14;
                                      const col = horseColors[r.horseNum-1] || "#888";
                                      return (
                                        <g key={r.member?.id}>
                                          <circle cx={hx} cy={hy} r="7" fill={col} stroke="#fff" strokeWidth="0.8"/>
                                          <text x={hx} y={hy+2.5} fontSize="6" fill="#fff" textAnchor="middle" fontWeight="bold">{r.horseNum}</text>
                                          <text x={hx-10} y={hy+2.5} fontSize="6" fill="#ccc" textAnchor="end">{r.member?.name?.slice(0,3)}</text>
                                        </g>
                                      );
                                    })}
                                    {/* GOAL文字 */}
                                    <text x={goalX+4} y={76} fontSize="7" fill="#FFD700" fontWeight="bold">GOAL</text>
                                  </svg>
                                </div>
                              );
                            })()}

                            <div style={{fontSize:9,color: finishBoard.gap12<=1000?"#e74c3c":finishBoard.gap12<=5000?"#f39c12":"#3498db", textAlign:"center",marginBottom:6}}>
                              1-2着の差：{finishBoard.gap12}点
                            </div>
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              {finishBoard.finishResults.map((r, i) => {
                                const rankEmoji = ["🥇","🥈","🥉","4️⃣"][i];
                                const colors = ["#f1c40f","#bdc3c7","#cd7f32","#888"];
                                const horseColors = ["#e74c3c","#3498db","#2ecc71","#f1c40f"];
                                return (
                                  <div key={r.member?.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:i===0?"rgba(241,196,15,0.12)":"rgba(255,255,255,0.04)",borderRadius:6,border:i===0?"1px solid rgba(241,196,15,0.4)":"1px solid rgba(255,255,255,0.05)"}}>
                                    <span style={{fontSize:16}}>{rankEmoji}</span>
                                    <div style={{width:20,height:20,borderRadius:"50%",background:horseColors[r.horseNum-1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:"bold",color:"#fff"}}>{r.horseNum}</div>
                                    <Av m={r.member} sz={20}/>
                                    <div style={{flex:1,minWidth:0,fontSize:11,color:colors[i],fontWeight:i<3?"bold":"normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.member?.name}</div>
                                    <div style={{fontSize:11,color:r.score>=0?"#2ecc71":"#e74c3c",fontWeight:"bold"}}>{r.score>=0?"+":""}{r.score}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* 自分の馬券結果 */}
                            {finishBoard.lastBet && finishBoard.lastBet.is_hit !== null && (
                              <div style={{marginTop:10,padding:"10px",background:finishBoard.lastBet.is_hit?"rgba(46,204,113,0.15)":"rgba(231,76,60,0.1)",borderRadius:8,border:`1px solid ${finishBoard.lastBet.is_hit?"rgba(46,204,113,0.4)":"rgba(231,76,60,0.3)"}`,textAlign:"center"}}>
                                <div style={{fontSize:18,marginBottom:4}}>{finishBoard.lastBet.is_hit?"🎉":"😢"}</div>
                                <div style={{fontSize:13,fontWeight:"bold",color:finishBoard.lastBet.is_hit?"#2ecc71":"#e74c3c"}}>
                                  {finishBoard.lastBet.is_hit?`🎯 的中！ 配当 ${finishBoard.lastBet.payout}倍`:"❌ ハズレ"}
                                </div>
                                <div style={{fontSize:10,color:"#888",marginTop:4}}>
                                  あなたの馬券：{BET_TYPES.find(t=>t.key===finishBoard.lastBet.bet_type)?.label} / {finishBoard.lastBet.bet_selection.map(id=>gm(id)?.name).join(finishBoard.lastBet.bet_type==="umaren"?" / ":" → ")}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* レース情報ヘッダー */}
                        <div style={{...S.card({background:"linear-gradient(135deg,rgba(231,76,60,0.08),rgba(243,156,18,0.08))",border:"1px solid rgba(231,76,60,0.3)"}),padding:"10px 12px",marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div style={{fontSize:12,fontWeight:700,color:"#f39c12"}}>第{currentRoundIndex+1}レース</div>
                            {bettingOpen ? (
                              <div style={{fontSize:10,color:"#2ecc71"}}>
                                🟢 受付中
                                {isSelfInAttendance
                                  ? `（残り${remainMin}:${String(remainSecMod).padStart(2,"0")}）`
                                  : "（結果確定まで）"}
                              </div>
                            ) : (
                              <div style={{fontSize:10,color:"#e74c3c",fontWeight:700}}>🔴 締切</div>
                            )}
                          </div>
                          {/* 出走馬一覧（強さスコア表示は無し、オッズだけ） */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4,marginTop:8}}>
                            {playingMembers.map((m,i)=>{
                              const horseNum = i+1;
                              const od = tanshoOdds?.[m.id];
                              return (
                                <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:"rgba(0,0,0,0.2)",borderRadius:6}}>
                                  <div style={{width:22,height:22,borderRadius:"50%",background:["#e74c3c","#3498db","#2ecc71","#f1c40f"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:"bold",color:"#fff"}}>{horseNum}</div>
                                  <Av m={m} sz={20}/>
                                  <div style={{flex:1,minWidth:0,fontSize:11,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                                  {od && <div style={{fontSize:11,color:"#f1c40f",fontWeight:"bold"}}>{od}倍</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ★ 現在の半荘の全員予想一覧（配当チップ多い順） */}
                        {(()=>{
                          const currentRoundBets = raceBets.filter(b =>
                            b.session_date === addDate && b.round_index === currentRoundIndex
                          );
                          const sortedCurrentBets = [...currentRoundBets].sort((a, b) => {
                            const aPayout = Number(a.bet_amount || 1) * Number(a.odds || 1);
                            const bPayout = Number(b.bet_amount || 1) * Number(b.odds || 1);
                            return bPayout - aPayout;
                          });
                          const betTypeLabel = (k) => ({tansho:"単勝",umaren:"馬連",sanrentan:"三連単",yonrentan:"四連単"})[k] || k;
                          const joinSep = (k) => k === "umaren" ? "," : "→";
                          return (
                            <div style={{...S.card({background:"rgba(52,152,219,0.06)",border:"1px solid rgba(52,152,219,0.25)"}),padding:"10px 12px",marginBottom:10}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#3498db",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                                🎯 第{currentRoundIndex+1}レース - 現在の予想
                                <span style={{fontSize:9,color:"#888",fontWeight:400}}>（配当チップ多い順）</span>
                              </div>
                              {sortedCurrentBets.length === 0 ? (
                                <div style={{fontSize:10,color:"#666",textAlign:"center",padding:"8px 0"}}>
                                  まだ誰も予想していません
                                </div>
                              ) : (
                                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                  {sortedCurrentBets.map((b, i) => {
                                    const bettor = gm(b.bettor_id);
                                    const isMine = raceSelf && Number(b.bettor_id) === Number(raceSelf);
                                    const betAmt = Number(b.bet_amount || 1);
                                    const odds = Number(b.odds || 1);
                                    const expectedPayout = Math.round(betAmt * odds);
                                    const selectionNames = (b.bet_selection || []).map(id => gm(id)?.name || "?").join(joinSep(b.bet_type));
                                    return (
                                      <div key={b.id || i} style={{
                                        display:"flex",alignItems:"center",gap:6,padding:"6px 8px",
                                        background: isMine ? "rgba(52,152,219,0.18)" : "rgba(0,0,0,0.2)",
                                        border: isMine ? "1.5px solid rgba(52,152,219,0.7)" : "1px solid rgba(255,255,255,0.05)",
                                        borderRadius:6,fontSize:10
                                      }}>
                                        <Av m={bettor} sz={18}/>
                                        <div style={{fontSize:10,color:"#fff",fontWeight:600,minWidth:50,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                          {bettor?.name || "?"}
                                          {isMine && <span style={{fontSize:8,color:"#3498db",marginLeft:4}}>(あなた)</span>}
                                        </div>
                                        <div style={{flex:1,minWidth:0,fontSize:9,color:"#ccc",lineHeight:1.4}}>
                                          <div>予想：<span style={{color:"#fff",fontWeight:600}}>{selectionNames}</span></div>
                                          <div style={{color:"#888"}}>
                                            <span style={{color:"#f39c12"}}>{betTypeLabel(b.bet_type)}</span>
                                            {" / "}チップ：<span style={{color:"#f1c40f"}}>{betAmt}枚</span>
                                            {" / "}オッズ：<span style={{color:"#f1c40f"}}>{odds}倍</span>
                                          </div>
                                        </div>
                                        <div style={{fontSize:11,color:"#2ecc71",fontWeight:700,whiteSpace:"nowrap"}}>
                                          🪙{expectedPayout}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* あなたは？ */}
                        {!raceSelf && bettingOpen && (
                          <div style={{...S.card({background:"rgba(255,255,255,0.04)"}),marginBottom:10}}>
                            <div style={{fontSize:11,color:"#888",marginBottom:8}}>外馬をするのはあなたですか？</div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                              {members.map(m=>{
                                const isAttendee = addSel.map(Number).includes(Number(m.id));
                                const myCurrentChips = currentChips(m.id);
                                const myBets = raceBets.filter(b => Number(b.bettor_id) === Number(m.id));
                                const myHits = myBets.filter(b => b.is_hit);
                                return (
                                  <div key={m.id}
                                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",borderRadius:8,cursor:"pointer",
                                      background: racePersonHistory===m.id ? "rgba(52,152,219,0.2)" : isAttendee?"rgba(243,156,18,0.08)":"rgba(255,255,255,0.04)",
                                      border:`1px solid ${racePersonHistory===m.id?"rgba(52,152,219,0.6)":isAttendee?"rgba(243,156,18,0.5)":"rgba(255,255,255,0.1)"}`}}>
                                    <div onClick={()=>setRaceSelf(m.id)} style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                                      <Av m={m} sz={28}/>
                                      <div style={{fontSize:10,color:"#ccc"}}>{m.name}</div>
                                      <div style={{fontSize:9,color:"#f1c40f"}}>🪙{myCurrentChips}</div>
                                      {isAttendee && <div style={{fontSize:8,color:"#f39c12"}}>⏱10分制限</div>}
                                    </div>
                                    <div onClick={e=>{e.stopPropagation(); setRacePersonHistory(prev=>prev===m.id?null:m.id);}}
                                      style={{fontSize:8,color:"#3498db",padding:"2px 6px",borderRadius:4,background:"rgba(52,152,219,0.1)",cursor:"pointer",marginTop:2}}>
                                      {racePersonHistory===m.id?"▲ 閉じる":"📋 履歴"}
                                    </div>
                                    {/* 個人履歴パネル */}
                                    {racePersonHistory===m.id && (
                                      <div style={{width:"100%",marginTop:4,background:"rgba(0,0,0,0.3)",borderRadius:6,padding:"6px 4px",maxHeight:120,overflowY:"auto"}}>
                                        <div style={{fontSize:8,color:"#3498db",fontWeight:600,marginBottom:4}}>
                                          {m.name}の外馬履歴
                                        </div>
                                        {myBets.length===0 && <div style={{fontSize:8,color:"#555",textAlign:"center"}}>履歴なし</div>}
                                        {myBets.filter(b=>b.is_hit!==null).slice(0,10).map((b,i)=>(
                                          <div key={i} style={{fontSize:7,padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",color:b.is_hit?"#2ecc71":"#e74c3c"}}>
                                            {b.is_hit?"✅":"❌"} {b.session_date} R{b.round_index+1}
                                            <span style={{color:"#f1c40f"}}> -{b.bet_amount||1}🪙</span>
                                            {b.is_hit && <span style={{color:"#2ecc71"}}> +{Math.round((b.payout-1)*(b.bet_amount||1))}🪙</span>}
                                          </div>
                                        ))}
                                        <div style={{fontSize:8,color:"#888",marginTop:4,textAlign:"center"}}>
                                          的中率: {myBets.filter(b=>b.is_hit!==null).length>0
                                            ? `${myHits.length}/${myBets.filter(b=>b.is_hit!==null).length}回`
                                            : "-"}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 馬券購入UI */}
                        {raceSelf && !myBet && bettingOpen && (
                          <div style={{...S.card({background:"rgba(255,255,255,0.04)"}),marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                              <Av m={gm(raceSelf)} sz={22}/>
                              <div style={{flex:1}}>
                                <span style={{fontSize:12,color:"#ccc"}}>{gm(raceSelf)?.name}として購入</span>
                                <div style={{fontSize:10,color:"#f1c40f",marginTop:2}}>
                                  🪙 保有チップ：{currentChips(raceSelf)}
                                </div>
                              </div>
                              <button onClick={()=>{setRaceSelf(null);setRaceBetType(null);setRaceSelection([]);}} style={{fontSize:10,color:"#666",background:"none",border:"none",cursor:"pointer"}}>変更</button>
                            </div>

                            {/* 賭けチップ枚数入力 */}
                            <div style={{marginBottom:12,background:"rgba(241,196,15,0.06)",borderRadius:8,padding:"8px 10px"}}>
                              <div style={{fontSize:11,color:"#888",marginBottom:6}}>賭けるチップ枚数（保有: <span style={{color:"#f1c40f",fontWeight:600}}>{currentChips(raceSelf)}🪙</span>）</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <button onClick={()=>setRaceBetAmount(v=>Math.max(1,v-1))}
                                  style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>－</button>
                                <div style={{flex:1,textAlign:"center",fontSize:18,fontWeight:"bold",color:"#f1c40f"}}>{raceBetAmount}🪙</div>
                                <button onClick={()=>setRaceBetAmount(v=>Math.min(currentChips(raceSelf),v+1))}
                                  style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>＋</button>
                              </div>
                              <input type="range" min={1} max={currentChips(raceSelf)} value={raceBetAmount}
                                onChange={e=>setRaceBetAmount(Number(e.target.value))}
                                style={{width:"100%",marginTop:6,accentColor:"#f1c40f"}}/>
                            </div>

                            {/* 馬券種類選択 */}
                            <div style={{fontSize:11,color:"#888",marginBottom:6}}>馬券の種類</div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:12}}>
                              {BET_TYPES.map(t=>(
                                <div key={t.key} onClick={()=>{setRaceBetType(t.key);setRaceSelection([]);}}
                                  style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",textAlign:"center",
                                    border:`1px solid ${raceBetType===t.key?"#f1c40f":"rgba(255,255,255,0.1)"}`,
                                    background:raceBetType===t.key?"rgba(241,196,15,0.15)":"rgba(255,255,255,0.03)"}}>
                                  <div style={{fontSize:13,fontWeight:"bold",color:raceBetType===t.key?"#f1c40f":"#ccc"}}>{t.label}</div>
                                  <div style={{fontSize:9,color:"#666",marginTop:2}}>{t.desc}</div>
                                </div>
                              ))}
                            </div>

                            {/* 馬選択 */}
                            {raceBetType && (
                              <>
                                <div style={{fontSize:11,color:"#888",marginBottom:6}}>
                                  {currentBetTypeDef.label}：{requiredPicks}頭選択
                                  {raceBetType !== "umaren" && requiredPicks > 1 && <span style={{color:"#f39c12",marginLeft:4}}>※順番通り</span>}
                                  {raceBetType === "umaren" && <span style={{color:"#666",marginLeft:4}}>※順不同</span>}
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:12}}>
                                  {playingMembers.map((m,i)=>{
                                    const horseNum = i+1;
                                    const selIdx = raceSelection.indexOf(m.id);
                                    const isSelected = selIdx !== -1;
                                    return (
                                      <div key={m.id} onClick={()=>toggleHorse(m.id)}
                                        style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:8,cursor:"pointer",position:"relative",
                                          border:`1px solid ${isSelected?"#f1c40f":"rgba(255,255,255,0.1)"}`,
                                          background:isSelected?"rgba(241,196,15,0.15)":"rgba(255,255,255,0.03)"}}>
                                        <div style={{width:22,height:22,borderRadius:"50%",background:["#e74c3c","#3498db","#2ecc71","#f1c40f"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:"bold",color:"#fff"}}>{horseNum}</div>
                                        <Av m={m} sz={20}/>
                                        <div style={{flex:1,minWidth:0,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                                        {isSelected && raceBetType !== "umaren" && (
                                          <div style={{fontSize:10,color:"#f1c40f",fontWeight:"bold"}}>{selIdx+1}着</div>
                                        )}
                                        {isSelected && raceBetType === "umaren" && (
                                          <div style={{fontSize:13,color:"#f1c40f"}}>✓</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* オッズ表示と購入ボタン */}
                                {selectionsValid && currentOdds && (
                                  <div style={{textAlign:"center",marginBottom:8,padding:"8px",background:"rgba(241,196,15,0.1)",borderRadius:8,border:"1px solid rgba(241,196,15,0.3)"}}>
                                    <div style={{fontSize:10,color:"#888"}}>予想配当</div>
                                    <div style={{fontSize:20,fontWeight:"bold",color:"#f1c40f"}}>{currentOdds}倍</div>
                                  </div>
                                )}
                                <button
                                  disabled={!selectionsValid || raceBetSubmitting}
                                  onClick={submitBet}
                                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",
                                    background:(!selectionsValid)?"rgba(255,255,255,0.08)":"linear-gradient(135deg,#e74c3c,#f39c12)",
                                    color:"#fff",fontWeight:"bold",fontSize:13,cursor:(!selectionsValid)?"not-allowed":"pointer",
                                    opacity:raceBetSubmitting?0.5:1}}>
                                  {raceBetSubmitting?"購入中...":"🎫 馬券を購入"}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* 締切後・購入なし */}
                        {raceSelf && !myBet && !bettingOpen && (
                          <div style={{textAlign:"center",padding:14,color:"#e74c3c",fontSize:12,background:"rgba(231,76,60,0.08)",borderRadius:8,marginBottom:10}}>
                            🔴 馬券の購入受付は締め切られました
                          </div>
                        )}

                        {/* 購入済み表示 */}
                        {raceSelf && myBet && (
                          <div style={{...S.card({background:"rgba(241,196,15,0.08)",border:"1px solid rgba(241,196,15,0.3)"}),marginBottom:10}}>
                            {/* チップ残高 */}
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <div style={{fontSize:11,color:"#ccc"}}>
                                <Av m={gm(raceSelf)} sz={20}/> <span style={{marginLeft:4}}>{gm(raceSelf)?.name}</span>
                              </div>
                              <div style={{fontSize:11,color:"#f1c40f",background:"rgba(241,196,15,0.15)",borderRadius:6,padding:"3px 10px",fontWeight:600}}>
                                🪙 保有チップ：{currentChips(raceSelf)}
                              </div>
                            </div>
                            <div style={{textAlign:"center",fontSize:12,color:"#f1c40f",marginBottom:8}}>🎫 購入内容</div>

                            {/* 購入内容詳細 */}
                            <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4}}>
                                <span>馬券種</span>
                                <span style={{color:"#fff",fontWeight:600}}>{BET_TYPES.find(t=>t.key===myBet.bet_type)?.label}</span>
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4}}>
                                <span>選択</span>
                                <span style={{color:"#fff"}}>{myBet.bet_selection.map(id=>gm(id)?.name).join(myBet.bet_type==="umaren"?" / ":" → ")}</span>
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4}}>
                                <span>賭けチップ</span>
                                <span style={{color:"#f1c40f",fontWeight:600}}>🪙 {myBet.bet_amount || 1} 枚</span>
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4}}>
                                <span>オッズ</span>
                                <span style={{color:"#f1c40f",fontWeight:600}}>{myBet.odds} 倍</span>
                              </div>
                              {/* 当たった時の配当予測 */}
                              {myBet.is_hit === null && (
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6,paddingTop:6,borderTop:"1px dashed rgba(255,255,255,0.15)"}}>
                                  <span style={{color:"#2ecc71"}}>🎯 的中時の払い戻し</span>
                                  <span style={{color:"#2ecc71",fontWeight:"bold"}}>🪙 {Math.round(Number(myBet.odds) * (myBet.bet_amount || 1))} 枚</span>
                                </div>
                              )}
                            </div>

                            {/* 結果演出 */}
                            {myBet.is_hit !== null && (
                              myBet.is_hit ? (
                                <div style={{textAlign:"center",marginTop:10,padding:"14px 8px",background:"rgba(46,204,113,0.15)",borderRadius:8,border:"1px solid rgba(46,204,113,0.5)"}}>
                                  <div style={{fontSize:32,marginBottom:4,animation:"pulse 1s infinite"}}>🎉</div>
                                  <div style={{fontSize:16,fontWeight:"bold",color:"#2ecc71",marginBottom:6}}>🎯 的中！</div>
                                  <div style={{fontSize:14,color:"#f1c40f",fontWeight:600}}>
                                    🪙 +{Math.round(Number(myBet.payout) * (myBet.bet_amount || 1))} 枚 払い戻し！
                                  </div>
                                  <div style={{fontSize:10,color:"#888",marginTop:6}}>
                                    純利益: +{Math.round(Number(myBet.payout) * (myBet.bet_amount || 1)) - (myBet.bet_amount || 1)} 枚
                                  </div>
                                </div>
                              ) : (
                                <div style={{textAlign:"center",marginTop:8,padding:"10px",background:"rgba(231,76,60,0.1)",borderRadius:8,border:"1px solid rgba(231,76,60,0.3)"}}>
                                  <div style={{fontSize:24,marginBottom:4}}>😢</div>
                                  <div style={{fontSize:13,fontWeight:"bold",color:"#e74c3c"}}>❌ ハズレ</div>
                                  <div style={{fontSize:10,color:"#888",marginTop:4}}>🪙 -{myBet.bet_amount || 1} 枚 消費</div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* 🏆 馬券的中ランキング（常時表示） */}
                    <div style={{fontSize:12,fontWeight:600,color:"#ccc",marginTop:14,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      🏆 馬券的中ランキング
                      <span style={{fontSize:9,color:"#666",fontWeight:400}}>（的中×オッズの合計）</span>
                    </div>
                    {rankingList.length === 0 ? (
                      <div style={{textAlign:"center",padding:24,color:"#555",fontSize:11}}>まだ馬券の記録がありません</div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {rankingList.map((p, i) => {
                          const m = gm(p.id);
                          const hitRate = p.total > 0 ? Math.round(p.hits/p.total*100) : 0;
                          return (
                            <div key={p.id}
                              onClick={() => setRaceBetDetailId(p.id)}
                              style={{...S.card({background:i===0?"rgba(241,196,15,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${i===0?"rgba(241,196,15,0.3)":"rgba(255,255,255,0.08)"}`}),padding:"10px 12px",cursor:"pointer"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:16,fontWeight:"bold",color:i===0?"#f1c40f":i===1?"#bdc3c7":i===2?"#cd7f32":"#666"}}>{i<3?["🥇","🥈","🥉"][i]:`${i+1}`}</span>
                                <Av m={m} sz={26}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                                  <div style={{fontSize:9,color:"#666"}}>{p.hits}/{p.total}的中 ({hitRate}%)</div>
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:16,fontWeight:"bold",color:"#f1c40f"}}>{p.sumPayout.toFixed(1)}</div>
                                  <div style={{fontSize:9,color:"#666"}}>累計配当</div>
                                </div>
                                <div style={{fontSize:9,color:"#3498db",marginLeft:2}}>▶</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 馬券詳細モーダル */}
                    {raceBetDetailId !== null && (() => {
                      const m = gm(raceBetDetailId);
                      if (!m) return null;
                      const betTypeLabelLocal = (k) => ({tansho:"単勝",umaren:"馬連",sanrentan:"三連単",yonrentan:"四連単"})[k] || k;
                      const myBets = raceBets
                        .filter(b => Number(b.bettor_id) === Number(raceBetDetailId) && b.is_hit !== null)
                        .sort((a, b) => {
                          if (a.session_date !== b.session_date) return b.session_date.localeCompare(a.session_date);
                          return b.round_index - a.round_index;
                        });
                      const totalBet = myBets.reduce((s, b) => s + (b.bet_amount || 1), 0);
                      const totalPayout = myBets.reduce((s, b) => {
                        if (b.is_hit) return s + Math.round(Number(b.payout) * (b.bet_amount || 1));
                        return s;
                      }, 0);
                      const netProfit = totalPayout - totalBet;
                      const hits = myBets.filter(b => b.is_hit).length;

                      return (
                        <div
                          onClick={() => setRaceBetDetailId(null)}
                          style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,0.75)",zIndex:9000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{width:"100%",maxWidth:480,background:"#1a1a2e",borderRadius:"16px 16px 0 0",padding:"20px 16px 32px",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>

                            {/* ヘッダー */}
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                              <Av m={m} sz={36}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{m.name}の馬券履歴</div>
                                <div style={{fontSize:10,color:"#888"}}>{myBets.length}件 / {hits}的中</div>
                              </div>
                              <button onClick={() => setRaceBetDetailId(null)}
                                style={{fontSize:18,color:"#666",background:"none",border:"none",cursor:"pointer",padding:"4px 8px"}}>✕</button>
                            </div>

                            {/* サマリー */}
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                              {[
                                {label:"的中率", value:`${myBets.length > 0 ? Math.round(hits/myBets.length*100) : 0}%`, color:"#2ecc71"},
                                {label:"消費チップ", value:`-${totalBet}🪙`, color:"#e74c3c"},
                                {label:"収支", value:`${netProfit >= 0 ? "+" : ""}${netProfit}🪙`, color: netProfit >= 0 ? "#2ecc71" : "#e74c3c"},
                              ].map(({label, value, color}) => (
                                <div key={label} style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                                  <div style={{fontSize:9,color:"#888",marginBottom:2}}>{label}</div>
                                  <div style={{fontSize:13,fontWeight:700,color}}>{value}</div>
                                </div>
                              ))}
                            </div>

                            {/* 履歴リスト */}
                            <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:6}}>
                              {myBets.length === 0 && (
                                <div style={{textAlign:"center",padding:24,color:"#555",fontSize:12}}>履歴なし</div>
                              )}
                              {myBets.map((b, i) => {
                                const sel = Array.isArray(b.bet_selection) ? b.bet_selection : (() => { try { return JSON.parse(b.bet_selection || "[]"); } catch { return []; } })();
                                const selNames = sel.map(id => gm(id)?.name || "?").join(" → ");
                                const betAmt = b.bet_amount || 1;
                                const payout = b.is_hit ? Math.round(Number(b.payout) * betAmt) : 0;
                                const profit = b.is_hit ? payout - betAmt : -betAmt;
                                return (
                                  <div key={i} style={{
                                    background: b.is_hit ? "rgba(46,204,113,0.08)" : "rgba(231,76,60,0.06)",
                                    border: `1px solid ${b.is_hit ? "rgba(46,204,113,0.25)" : "rgba(231,76,60,0.2)"}`,
                                    borderRadius: 8, padding: "10px 12px"
                                  }}>
                                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                                        <span style={{fontSize:14}}>{b.is_hit ? "✅" : "❌"}</span>
                                        <span style={{fontSize:10,color:"#888"}}>{b.session_date} R{b.round_index + 1}</span>
                                        <span style={{fontSize:10,color:"#f39c12",background:"rgba(243,156,18,0.15)",padding:"1px 5px",borderRadius:4}}>
                                          {betTypeLabelLocal(b.bet_type)}
                                        </span>
                                      </div>
                                      <div style={{fontSize:13,fontWeight:700,color: profit >= 0 ? "#2ecc71" : "#e74c3c"}}>
                                        {profit >= 0 ? "+" : ""}{profit}🪙
                                      </div>
                                    </div>
                                    <div style={{fontSize:11,color:"#ccc",marginBottom:2}}>
                                      予想：<span style={{color:"#fff",fontWeight:600}}>{selNames}</span>
                                    </div>
                                    <div style={{fontSize:10,color:"#888",display:"flex",gap:10}}>
                                      <span>賭け：<span style={{color:"#f1c40f"}}>{betAmt}🪙</span></span>
                                      <span>倍率：<span style={{color:"#f1c40f"}}>{Number(b.odds).toFixed(1)}倍</span></span>
                                      {b.is_hit && <span>払戻：<span style={{color:"#2ecc71"}}>{payout}🪙</span></span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

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
        {tab==="history" && (() => {
          // 期間フィルター
          const now = new Date();
          const thisYear = now.getFullYear();
          const thisMonth = `${thisYear}-${String(now.getMonth()+1).padStart(2,"0")}`;
          const filteredSessions = period==="year" ? sessions.filter(s=>s.date.startsWith(String(thisYear)))
            : period==="month" ? sessions.filter(s=>s.date.startsWith(thisMonth))
            : period==="pick" ? sessions.filter(s=>s.date.startsWith(selectedMonth))
            : sessions;
          
          if (!filteredSessions.length) {
            return <div style={{color:"#888",textAlign:"center",padding:30}}>該当する記録がありません</div>;
          }
          
          return (
            <>
              {[...filteredSessions].sort((a,b)=>b.date.localeCompare(a.date)).map(s => {
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
                        {(s.rules?.startTime || s.rules?.endTime) && (
                          <span style={{fontSize:10,color:"#666"}}>
                            🕐 {s.rules.startTime||"?"} 〜 {s.rules.endTime||"?"}
                          </span>
                        )}
                        {s.rules?.venue && (
                          <span style={{fontSize:9,color:"#888"}}>📍 {s.rules.venue}</span>
                        )}
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
          );
        })()}

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
                  <select value={addRules.scoreRate} onChange={e=>setAddRules(r=>({...r,scoreRate:Number(e.target.value),startTime:r.startTime}))} style={S.sel()}>
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
                          onChange={e=>{const u=[...addRules.uma];u[i]=e.target.value;setAddRules(r=>({...r,uma:u,startTime:r.startTime}));}}
                          style={S.inp({textAlign:"center"})}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,color:"#888",marginBottom:3}}>返し点</div>
                    <input type="text" inputMode="decimal" value={addRules.kaeshi} onChange={e=>setAddRules(r=>({...r,kaeshi:N(e.target.value),startTime:r.startTime}))} style={S.inp()}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#888",marginBottom:3}}>配給原点</div>
                    <input type="text" inputMode="decimal" value={addRules.starting} onChange={e=>setAddRules(r=>({...r,starting:N(e.target.value),startTime:r.startTime}))} style={S.inp()}/>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>チップレート（円/枚）</div>
                  <input type="text" inputMode="decimal" value={addRules.chipRate} onChange={e=>setAddRules(r=>({...r,chipRate:N(e.target.value),startTime:r.startTime}))} style={S.inp()}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>終了予定時間（任意）</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input type="time" value={addEndTimePlan}
                      onChange={e=>setAddEndTimePlan(e.target.value)}
                      style={{...S.inp({maxWidth:120}),WebkitAppearance:"none"}}/>
                    {addEndTimePlan && (
                      <button onClick={()=>setAddEndTimePlan("")}
                        style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"#aaa",cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}}>
                        ✕ クリア
                      </button>
                    )}
                  </div>
                  {addEndTimePlan && <div style={{fontSize:9,color:"#7fb9e0",marginTop:3}}>LIVE画面に表示されます</div>}
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:3}}>闘牌場所（任意）</div>
                  <select value={addRules.venue||""} onChange={e=>setAddRules(r=>({...r,venue:e.target.value,startTime:r.startTime}))} style={S.sel()}>
                    <option value="">未選択</option>
                    {VENUES.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
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
                    const filledCount = rpSkenbans.length > 0
                      ? addSel.filter(id => !rpSkenbans.includes(id) && String(rpSc[id]||"").trim()!=="").length 
                      : addSel.filter(id=>String(rpSc[id]||"").trim()!=="").length;
                    
                    // 抜け番選択UIを表示（5人以上かつ対局メンバー4人が確定していない場合）
                    const playersToConfirm = addSel.length - rpSkenbans.length;
                    if (addSel.length >= 5 && playersToConfirm !== 4) {
                      return (
                        <>
                          <div style={{fontSize:10,color:"#f39c12",marginBottom:8,background:"rgba(243,156,18,0.08)",borderRadius:6,padding:6}}>
                            🎯 参加しないメンバーをタップしてください<br/>
                            <span style={{fontSize:9,color:"#666"}}>（{addSel.length}人中 {rpSkenbans.length}人抜け番 → あと {4 - playersToConfirm}人選択で対局者4人確定）</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
                            {addSel.map(id => {
                              const m = gm(id);
                              if (!m) return null;
                              const isSkenban = rpSkenbans.includes(id);
                              return (
                                <div key={id} onClick={() => {
                                  const newSkenbans = isSkenban 
                                    ? rpSkenbans.filter(x => x !== id)
                                    : [...rpSkenbans, id];
                                  setRpSkenbans(newSkenbans);
                                  // Supabaseに即時保存（全端末に共有するため）
                                  saveDraft(addDate, addRules, addSel, addStep, addRounds, newSkenbans);
                                }}
                                  style={{borderRadius:9,padding:"12px 6px",textAlign:"center",cursor:"pointer",
                                    border:`2px solid ${isSkenban ? "#f39c12" : "rgba(243,156,18,0.5)"}`,
                                    background:isSkenban ? "rgba(243,156,18,0.2)" : "rgba(243,156,18,0.08)",
                                    transition:"all 0.2s",opacity:isSkenban?1:0.7}}>
                                  <Av m={m} sz={36}/>
                                  <div style={{fontSize:11,marginTop:4,color:"#fff",fontWeight:500}}>{m.name}</div>
                                  <div style={{fontSize:10,color:isSkenban?"#f39c12":"#888",marginTop:2}}>{isSkenban?"✔ 抜け番":"選択"}</div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    }

                    // 点数入力画面（抜け番が決まった後、または5人未満の場合）
                    return (
                      <>
                        <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:8}}>
                          <div style={{flex:1,fontSize:10,color:"#7fb9e0",background:"rgba(52,152,219,0.08)",borderRadius:6,padding:6}}>
                            📌 対局した4人の順位点を入力{rpSkenbans.length > 0 && ` (抜け番: ${rpSkenbans.map(id => gm(id)?.name).join(', ')})`}<br/>
                            <span style={{fontSize:9,color:"#666"}}>3人入力で残り1人を自動計算（空欄が1人のとき）</span>
                          </div>
                          {is5 && rpSkenbans.length > 0 && (
                            <button
                              onClick={() => {
                                setRpSkenbans([]);
                                setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
                                setRpAutoId(null);
                                setRpActive(null);
                                saveDraft(addDate, addRules, addSel, addStep, addRounds, []);
                              }}
                              style={{flexShrink:0,fontSize:10,padding:"5px 8px",borderRadius:6,border:"1px solid rgba(243,156,18,0.5)",background:"rgba(243,156,18,0.1)",color:"#f39c12",cursor:"pointer",whiteSpace:"nowrap"}}>
                              ✏️ 抜け番を変更
                            </button>
                          )}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:8}}>
                          {addSel.filter(id => !rpSkenbans.includes(id)).map(id=>{
                            const m=gm(id); if(!m) return null;
                            const v=String(rpSc[id]||"");
                            const isAuto=rpAutoId===id;
                            const hasV=v.trim()!=="";
                            const isActive=rpActive===id;
                            const ph=rpPhotos[id]||[];
                            const playingMembers = rpSkenbans.length > 0
                              ? addSel.filter(mid => !rpSkenbans.includes(mid))
                              : addSel;
                            const othersFilled = playingMembers.filter(oid => oid !== id && String(rpSc[oid]||"").trim() !== "").length === 3;
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
                        <div style={{display:"flex",gap:8}}>
                          <button style={{...S.bb({opacity:filledCount===4?1:0.4})}} disabled={filledCount!==4} onClick={confirmRound}>✔ この半荘を確定</button>
                          <button style={{...S.bg({background:"rgba(180,180,180,0.15)",color:"#aaa",border:"1px solid rgba(255,255,255,0.15)"})}} onClick={()=>{
                            if(!window.confirm("この半荘を中止しますか？入力中の内容はリセットされます。")) return;
                            setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
                            setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null); setAddErr("");
                          }}>✕ 中止</button>
                        </div>
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
                          const now = new Date().toISOString();
                          await supabase.from("members").update({deleted_at: now}).eq("id", m.id);
                          setTrashMembers(prev=>[{...m, deleted_at:now}, ...prev]);
                          setMembers(ms=>ms.filter(x=>x.id!==m.id));
                          setMemberDeleteStep(p=>({...p,[m.id]:0}));
                          showToast("success","🗑 ゴミ箱に移動しました（30日後に自動削除）");
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
        {tab==="taikai" && (
          <div style={{
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            padding:"60px 20px",textAlign:"center",
            background:"rgba(255,255,255,0.04)",borderRadius:12,
            border:"1px dashed rgba(255,255,255,0.2)",
            marginTop:20,
          }}>
            <div style={{fontSize:72,marginBottom:16,filter:"drop-shadow(0 0 8px rgba(255,193,7,0.4))"}}>🚧</div>
            <div style={{fontSize:18,fontWeight:600,color:"#ffc107",marginBottom:8,letterSpacing:1}}>大会前に実装予定</div>
            <div style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>
              🎌 大会モードは現在準備中です。<br/>
              大会開催に合わせて機能を実装します。
            </div>
          </div>
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
