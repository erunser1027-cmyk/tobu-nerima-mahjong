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
// 今日: 2026-07-03
const CHANGELOG = [
  { date:"2026-07-03", features:[
    "MBTI診断：診断完了時に「answers.reduce is not a function」で必ずクラッシュしていた不具合を修正（ハッシュ値シード計算がanswersをオブジェクトでなく配列として扱っていたことが原因）",
    "MBTI診断：赤ドラ・リーチをテーマにした設問を4軸各1問ずつ追加し、全28問→全32問に拡張（局面18問＋お題14問）。手牌に赤5を表示するakaTiles対応も追加",
    "MBTI診断：診断結果をLINEでシェアするボタンを追加（対応端末では画像付き共有シート、非対応環境ではLINEのテキスト共有にフォールバック）",
    "MBTI診断：カード画像に既に焼き込まれているキャラ名・レア度バッジとアプリ側テキストの二重表示を解消（キャラ名・レア度バッジのテキストを削除、タイプ名見出しは維持）",
    "MBTI診断：キャラ画像のリサイズ方式をクロップから「縦横比保持の縮小＋透明パディング」に変更（顔や頭部が切れる問題を解消・32枚全て再処理）",
    "MBTI診断：タイブレーク時に回答パターンハッシュ値をシードに使用、同点時も診断結果を確定的に決定",
    "MBTI診断：タイブレーク時のランダム判定を実装、同点時の公平性を確保",
    "MBTI診断：T/F軸の表現を中立化（「美学に反する」→「物足りない」）",
    "MBTI診断：図鑑を「メンバー名簿」から自分が解放済みのカードだけを並べる「コレクション」形式に変更",
    "MBTI診断：実戦データを反映する新形態「覚醒カード」を追加（規定打席到達で本人は自動入手・他人は対戦成績ルート＆外馬ルートの両方達成で解放。診断%と実戦%を50%ずつ反映した4軸で算出、必ずUR以上のレア度＆戦闘力を大幅ブースト、専用フレーバーテキストとLR限定の虹色エフェクトつき）",
    "MBTI診断：コレクション画面に「？遊び方を見る」の折りたたみ式ルール説明パネルを追加",
    "ヘッダーバージョン表記をv1.9→v2.0に変更",
    "MBTI診断：出題画面の牌をSVG手描きから実物写真風PNG画像（37種・赤ドラ込み）に差し替え。画面幅に応じて横一列に自動収縮するレスポンシブサイズに変更",
    "MBTI診断：ゲストメンバー（名前に「ゲスト」を含む参加者）を診断対象・名簿・タイプ制覇カウントから完全に除外",
    "MBTI診断：他メンバーのトレーディングカードを解放する「メンバー名簿」機能を追加（ルートA：対戦10半荘以上＋勝率50%超、ルートB：そのメンバー参加半荘での外馬チップ収支+50枚以上、いずれか達成で解放・未解放は？シルエット表示）",
    "MBTI診断：名簿画面に「タイプ制覇 X/16」の進捗表示を追加",
    "ヘッダーバージョン表記をv1.8→v1.9に変更",
    "新機能：麻雀MBTI診断＋トレーディングカードを追加（🃏の右隣に🎴タブ新設・全28問でMBTIタイプを診断・結果をドラゴンボールキャラ風トレーディングカードとして表示・Supabaseに保存）",
    "MBTI診断：属性（NT/NF/SJ/SP）ごとにカード枠の色が変化・4軸の振れ幅からレア度（N〜UR）と戦闘力を算出・SR/UR限定でホロ光沢アニメーション演出",
    "ヘッダーバージョン表記をv1.7→v1.8に変更",
  ]},
  { date:"2026-06-11", features:[
    "メインメニューに📖麻雀基礎講座ボタンを追加（大会モード右隣・別タブでhttps://nerima-night-crew.com/mahjong/を開く）",
    "外馬：レーストラックを競馬ゲーム風に全面リニューアル（疾走する馬と騎手のスプライト・スタンド観客・ダートコース・インフィールド着順掲示板・ゴール板）",
    "外馬：三連単を三連複に変更（4人ゲームで3連単は4連単と同義のため・順不同で1〜3位を当てる形式に修正・当選判定・オッズ計算・ラベルすべて更新）",
  ]},
  { date:"2026-06-01", features:[
    "バグ修正：観覧者が新規でページを開いたときLIVE状態・スコアが表示されない問題を修正（drafts取得の.single()エラーが原因）",
    "半荘入力中に「✕ 中止」ボタンを追加（確定ボタン隣・確認ダイアログ付き・入力リセットしてLIVE継続）",
    "設定タブのロゴ下に公式Tシャツ販売セクションを追加（画像・価格・購入リンク）",
    "LIVE中の確定済み半荘✏️編集に点数テンキーを追加（±付き・合計0チェック表示）",
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
const isGuestMember = m => !!(m && m.name && m.name.includes("ゲスト"));

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

// 三連複オッズ：単勝オッズの幾何平均ベース、上限18倍（順不同のため倍率低め）
function calcSanrenpukuOdds(id1, id2, id3, tanshoOdds) {
  const avgOdds = Math.pow(tanshoOdds[id1] * tanshoOdds[id2] * tanshoOdds[id3], 1/3);
  const raw = avgOdds * 2.8;
  return Math.max(3.0, Math.min(18.0, Math.round(raw * 10) / 10));
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

// ========================================================
// 麻雀MBTI診断＋トレーディングカード
// ========================================================
const MBTI_C = {
  table:"#123B32", tableDeep:"#0D2A24", ivory:"#F3ECDB", ink:"#20302B",
  red:"#B23A2E", green:"#2F7A57", indigo:"#2C5A7A", brass:"#C6A24C", mute:"#8FA69B",
};
const MBTI_FONT_MIN = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
const MBTI_FONT_GO = '"Hiragino Kaku Gothic ProN","Yu Gothic UI","Noto Sans JP",sans-serif';

// 牌コード（"1m"〜"9s" or "東南西北中發白"）→ /public/tiles/ 内のPNGファイル名
const TILE_SUIT_FILE = { m:"man", p:"pin", s:"sou" };
const TILE_HONOR_FILE = { "東":"ton", "南":"nan", "西":"sha", "北":"pei", "發":"hatsu", "白":"haku", "中":"chun" };
function tileImageSrc(code, aka=false){
  const m = /^([1-9])([mps])$/.exec(code);
  if (m) {
    const [, num, suit] = m;
    const suffix = (aka && num === "5") ? "_aka" : "";
    return `/tiles/${TILE_SUIT_FILE[suit]}${num}${suffix}.png`;
  }
  const honorFile = TILE_HONOR_FILE[code];
  return honorFile ? `/tiles/${honorFile}.png` : null;
}

// 牌画像は66×90px。flex:1で行内に応じて縮小しつつ、maxWidth(w)より大きくは拡大しない
function MbtiTile({ code, w=40, dora=false, aka=false }) {
  const src = tileImageSrc(code, aka);
  return (
    <div style={{
      flex:"1 1 0", minWidth:0, maxWidth:w, aspectRatio:"66 / 90", boxSizing:"border-box",
      borderRadius:6, overflow:"hidden", background:"#FBF6E9",
      border: dora ? `2px solid ${MBTI_C.brass}` : "1px solid rgba(0,0,0,0.18)",
      boxShadow:"0 3px 3px rgba(0,0,0,.35)",
    }}>
      {src && (
        <img src={src} alt={code} draggable={false}
          style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}/>
      )}
    </div>
  );
}

// 全32問  side= E/I/S/N/T/F/J/P
const MBTI_QUESTIONS = [
  /* ===== S/N（現実 ⇄ 流れ） 7問 ===== */
  { axis:"SN", tag:"現実 ⇄ 流れ", basis:"デジタル(即・和了率) ⇄ 打点/展開",
    meta:"東1局 ・ 6巡目 ・ 子 ・ 平和のみ",
    hand:["2m","3m","4m","6m","7m","8m","3p","4p","5p","5s","6s","9m","9m"], doraTiles:[],
    prompt:"先制で入れる、安いテンパイ。どうする？",
    left:{label:"即リーチ",sub:"今ある優位を確定させる",side:"S"},
    right:{label:"ダマで待つ",sub:"手変わり・打点に賭ける",side:"N"} },
  { axis:"SN", tag:"現実 ⇄ 流れ", basis:"効率・和了率 ⇄ 打点(面前)",
    meta:"東1局 ・ 7巡目 ・ 子 ・ ドラ 中",
    hand:["2m","3m","4m","6m","7m","4p","5p","6p","7s","8s","中","中","白"], doraTiles:["中"],
    prompt:"上家が 中 を捨てた。ポンできる。あなたは？",
    left:{label:"ポンして速攻",sub:"安いが確実に前へ",side:"S"},
    right:{label:"スルーして面前",sub:"高い手を仕上げる",side:"N"} },
  { axis:"SN", tag:"現実 ⇄ 流れ", basis:"先制の確定価値 ⇄ 好形への期待",
    meta:"南1局 ・ 8巡目 ・ 子 ・ 先制テンパイ",
    hand:["2m","3m","4m","6m","7m","8m","4p","5p","6p","3s","5s","白","白"], doraTiles:[],
    prompt:"カンチャン待ちだが先制で入れる。愚形でもリーチする？",
    left:{label:"即リーチ",sub:"先制の優位は確定情報",side:"S"},
    right:{label:"好形変化を待つ",sub:"良い待ちになる未来に賭ける",side:"N"} },
  { axis:"SN", tag:"現実 ⇄ 流れ", basis:"手なり効率 ⇄ 打点(混一)",
    meta:"東2局 ・ 4巡目 ・ 子 ・ 手が二択",
    hand:["2s","3s","4s","6s","7s","8s","9s","發","3m","4m","5m","2p","白"], doraTiles:[],
    prompt:"索子が濃く、發も。安く早い手か、高い混一か。寄せるなら？",
    left:{label:"手なりで安く早く",sub:"効率よく和了率を取る",side:"S"},
    right:{label:"混一色で高く",sub:"打点の可能性に賭ける",side:"N"} },
  { axis:"SN", tag:"麻雀観 ・ 勝負観", basis:"デジタル(確率) ⇄ オカルト(流れ・ツキ)",
    meta:"接戦の終盤 ・ 最後の一打", hand:null,
    prompt:"最後の判断を後押しするのは、どっち？",
    left:{label:"これまでの数字",sub:"確率と期待値を信じる",side:"S"},
    right:{label:"場の流れ",sub:"自分のツキを信じる",side:"N"} },
  { axis:"SN", tag:"麻雀観 ・ 勝負観", basis:"デジタル(再現性) ⇄ アナログ(勝負勘)",
    meta:"あなたが憧れる打ち手は？", hand:null,
    prompt:"“強い”と思う打ち手は、どっち？",
    left:{label:"ミスなく最善",sub:"いつも確率通りに打てる人",side:"S"},
    right:{label:"流れを掴む",sub:"ここぞで魅せる手を打てる人",side:"N"} },
  { axis:"SN", tag:"麻雀観 ・ 人生観", basis:"論理型 ⇄ 直感型",
    meta:"麻雀を離れて ・ 人生の岐路", hand:null,
    prompt:"大事な決断。最後に頼るのは、どっち？",
    left:{label:"情報と計算",sub:"根拠を積み上げて決める",side:"S"},
    right:{label:"直感と勢い",sub:"その時の流れに乗る",side:"N"} },
  { axis:"SN", tag:"赤ドラ ⇄ 打点期待", basis:"愚形でも先制リーチ(S) ⇄ 赤5を活かす好形変化待ち(N)",
    meta:"南2局 ・ 6巡目 ・ 子 ・ カンチャン待ちに赤5あり",
    hand:["2m","3m","4m","6m","7m","8m","1p","2p","5p","2s","4s","6s","7s"], doraTiles:[], akaTiles:["5p"],
    prompt:"赤5(赤ドラ)を使ったカンチャン待ち。愚形だが打点は十分。どうする？",
    left:{label:"即リーチ",sub:"待ちは悪いが赤で打点は確保",side:"S"},
    right:{label:"好形への変化を待つ",sub:"赤を活かしつつ広い待ちを狙う",side:"N"} },

  /* ===== T/F（損得 ⇄ こだわり） 7問 ===== */
  { axis:"TF", tag:"損得 ⇄ こだわり", basis:"期待値(デジタル) ⇄ 勝負師の気迫",
    meta:"南2局 ・ 11巡目 ・ 2着目 ・ 親リーチ",
    hand:["3m","4m","5m","6m","7m","8m","3p","4p","5p","5s","6s","發","發"], doraTiles:["發"],
    prompt:"發ドラ2の良形テンパイ。親リーチに無スジ。どちらの気持ちで押す？",
    left:{label:"押し得だから押す",sub:"打点と受けで期待値はプラス",side:"T"},
    right:{label:"引けないから押す",sub:"ここで引いたら悔いが残る",side:"F"} },
  { axis:"TF", tag:"損得 ⇄ こだわり", basis:"損得(確実性) ⇄ 美意識(安手を嫌う)",
    meta:"南4局 ・ オーラス ・ トップ目 ・ 余裕あり",
    hand:["2m","3m","4m","3p","4p","5p","6p","7p","8p","5s","6s","6s","6s"], doraTiles:[],
    prompt:"安手だが即和了でトップ確定。高くする余地もある。どうする？",
    left:{label:"安手で即和了",sub:"確実にトップを取るのが得",side:"T"},
    right:{label:"高い手で決めたい",sub:"安手で終わるのは物足りない",side:"F"} },
  { axis:"TF", tag:"損得 ⇄ こだわり", basis:"損得(オリ得) ⇄ 気迫(勝負)",
    meta:"東3局 ・ 13巡目 ・ ラス目 ・ 2軒リーチ",
    hand:["4m","5m","6m","2p","3p","4p","7p","8p","9p","3s","4s","中","中"], doraTiles:[],
    prompt:"2軒リーチにテンパイ復活。放銃なら大ラス濃厚。あなたは？",
    left:{label:"損得でオリる",sub:"放銃リスクが見合わない",side:"T"},
    right:{label:"意地でも押す",sub:"ここで逃げる自分が許せない",side:"F"} },
  { axis:"TF", tag:"損得 ⇄ こだわり", basis:"損得(確実な加点) ⇄ こだわり(打ちたい手)",
    meta:"東1局 ・ 9巡目 ・ 子 ・ 手が二択",
    hand:["2m","3m","4m","6m","7m","8m","2p","3p","4p","7s","8s","西","西"], doraTiles:[],
    prompt:"すぐ和了れる安い形か、待ち替えて高い勝負手か。惹かれるのは？",
    left:{label:"確実に和了る",sub:"取れる点は確実に取るのが得",side:"T"},
    right:{label:"勝負手にこだわる",sub:"打ちたい手を打ってこそ",side:"F"} },
  { axis:"TF", tag:"麻雀観 ・ 勝負観", basis:"期待値至上 ⇄ 勝負師の矜持",
    meta:"あなたにとって ・ 良い一打とは", hand:null,
    prompt:"“良い一打”に近いのは、どっち？",
    left:{label:"損得で最善",sub:"収支がプラスになる選択",side:"T"},
    right:{label:"悔いの残らない",sub:"自分が納得できる選択",side:"F"} },
  { axis:"TF", tag:"麻雀観 ・ 勝負観", basis:"合理 ⇄ 美学",
    meta:"負けている時 ・ あなたの心は", hand:null,
    prompt:"劣勢の終盤、あなたを支えるのは？",
    left:{label:"冷静な計算",sub:"まだ拾える手を淡々と探す",side:"T"},
    right:{label:"熱い気持ち",sub:"一発逆転を狙う気迫",side:"F"} },
  { axis:"TF", tag:"麻雀観 ・ 人生観", basis:"論理型 ⇄ 情熱型",
    meta:"麻雀を離れて ・ あなたの決め方", hand:null,
    prompt:"大きな選択、優先するのはどっち？",
    left:{label:"損得・合理",sub:"得か損かで判断する",side:"T"},
    right:{label:"想い・こだわり",sub:"譲れない気持ちで決める",side:"F"} },
  { axis:"TF", tag:"損得 ⇄ 気遣い", basis:"期待値重視のリーチ(T) ⇄ 相手を思ってのダマ(F)",
    meta:"オーラス ・ 8巡目 ・ 親 ・ 大差のトップ目で赤5切ればリーチ可能", hand:null,
    prompt:"オーラス、既に大差のトップ。赤5を切ればリーチできる。あなたは？",
    left:{label:"迷わずリーチ",sub:"最大価値を追求するのが筋",side:"T"},
    right:{label:"ダマで静かに終える",sub:"これ以上の失点は誰も望んでいない",side:"F"} },

  /* ===== J/P（決め打ち ⇄ 柔軟） 7問 ===== */
  { axis:"JP", tag:"決め打ち ⇄ 柔軟", basis:"役狙い(計画) ⇄ 手なり(柔軟)",
    meta:"東2局 ・ 4巡目 ・ 自風 南 ・ ドラ 發",
    hand:["2s","3s","4s","5s","6s","7s","8s","9s","發","發","3m","5p","東"], doraTiles:["發"],
    prompt:"索子が伸び、發はドラの対子。序盤の方針は？",
    left:{label:"混一色へ一直線",sub:"他色を払って決め打ち",side:"J"},
    right:{label:"手なりで柔軟に",sub:"来た形に合わせて進める",side:"P"} },
  { axis:"JP", tag:"決め打ち ⇄ 柔軟", basis:"完成形を描く ⇄ ツモ任せ",
    meta:"東1局 ・ 3巡目 ・ 子 ・ 好配牌",
    hand:["2m","3m","4m","5m","6m","4p","5p","6p","3s","4s","5s","白","白"], doraTiles:[],
    prompt:"きれいな好配牌。あなたの頭の中は？",
    left:{label:"完成形を決める",sub:"最終形を描いて一直線",side:"J"},
    right:{label:"ツモ次第で伸ばす",sub:"良く伸びた方に乗る",side:"P"} },
  { axis:"JP", tag:"決め打ち ⇄ 柔軟", basis:"方針を貫く ⇄ 乗り換える",
    meta:"南1局 ・ 9巡目 ・ 子 ・ テンパイ間近",
    hand:["3m","4m","5m","6m","7m","3p","4p","5p","6s","7s","8s","2m","2m"], doraTiles:[],
    prompt:"狙いの形が見えたが、別の高い形にも変えられる。どうする？",
    left:{label:"当初の形を貫く",sub:"決めた手を最後まで",side:"J"},
    right:{label:"高い形へ乗り換え",sub:"良い変化には柔軟に",side:"P"} },
  { axis:"JP", tag:"決め打ち ⇄ 柔軟", basis:"構想優先 ⇄ 状況対応",
    meta:"東3局 ・ 7巡目 ・ 子 ・ 仕掛けどころ",
    hand:["3m","4m","5m","7m","8m","2p","3p","4p","6s","7s","發","發","西"], doraTiles:["發"],
    prompt:"發が出た。鳴けば形は変わるが早い。あなたは？",
    left:{label:"構想通りに面前",sub:"描いた手を崩さない",side:"J"},
    right:{label:"鳴いて形を変える",sub:"状況に合わせて動く",side:"P"} },
  { axis:"JP", tag:"麻雀観 ・ 勝負観", basis:"計画型 ⇄ 適応型",
    meta:"あなたの ・ 手作りの流儀", hand:null,
    prompt:"手作りで気持ちいいのは、どっち？",
    left:{label:"狙い通り完成",sub:"描いた手を仕上げる快感",side:"J"},
    right:{label:"何にでも化ける",sub:"来た牌で最善を作る快感",side:"P"} },
  { axis:"JP", tag:"麻雀観 ・ 勝負観", basis:"一貫性 ⇄ 臨機応変",
    meta:"卓に着く前 ・ あなたの構え", hand:null,
    prompt:"あなたの麻雀に近いのは？",
    left:{label:"型を持つ",sub:"自分のスタイルを貫く",side:"J"},
    right:{label:"型を持たない",sub:"その場に合わせて変える",side:"P"} },
  { axis:"JP", tag:"麻雀観 ・ 人生観", basis:"計画型 ⇄ 柔軟型",
    meta:"麻雀を離れて ・ あなたの進み方", hand:null,
    prompt:"物事の進め方、近いのは？",
    left:{label:"計画を立てて",sub:"決めた道を着実に進む",side:"J"},
    right:{label:"流れに任せて",sub:"状況を見て柔軟に動く",side:"P"} },
  { axis:"JP", tag:"決め打ち ⇄ 柔軟", basis:"今すぐリーチで確定(J) ⇄ 赤引き込みに賭けて手を進化(P)",
    meta:"東4局 ・ 7巡目 ・ 子 ・ 今リーチ可能、待てば赤5活用の好形も",
    hand:["1m","2m","3m","5m","6m","7m","3p","4p","5p","7s","8s","9s","9s"], doraTiles:[],
    prompt:"今すぐリーチできる形。だがもう一巡待てば赤5を活かした好形に化ける未来も見える。どうする？",
    left:{label:"今すぐリーチ",sub:"形を決めて前進あるのみ",side:"J"},
    right:{label:"一旦様子見",sub:"赤を引き込む可能性に賭ける",side:"P"} },

  /* ===== E/I（場読み ⇄ 没入） 7問 ===== */
  { axis:"EI", tag:"場読み ⇄ 没入", basis:"相手を読む(アナログ) ⇄ 自分の手(デジタル)",
    meta:"南2局 ・ 12巡目 ・ 上家が2副露(高そう)",
    hand:["3m","4m","5m","5m","6m","7m","3p","4p","5p","6s","7s","9p","東"], doraTiles:[],
    prompt:"1シャンテンで無スジをツモ。上家の仕掛けが不気味。あなたは？",
    left:{label:"警戒して受ける",sub:"上家の気配を最優先",side:"E"},
    right:{label:"自分の手を最速で",sub:"他家は気にしない",side:"I"} },
  { axis:"EI", tag:"場読み ⇄ 没入", basis:"他家の河を読む ⇄ 自分の効率",
    meta:"東1局 ・ 9巡目 ・ 全員が無仕掛け",
    hand:["2m","3m","4m","5m","6m","7p","8p","4s","5s","6s","7s","南","南"], doraTiles:[],
    prompt:"切る牌を選ぶとき、まず見るのは？",
    left:{label:"他家3人の河",sub:"何が危険で何が安全か",side:"E"},
    right:{label:"自分の受け入れ",sub:"一番手が進む切り方",side:"I"} },
  { axis:"EI", tag:"場読み ⇄ 没入", basis:"相手に合わせる ⇄ 自分を通す",
    meta:"東3局 ・ 6巡目 ・ 下家が絶好調",
    hand:["3m","4m","2p","3p","4p","6p","7p","8p","5s","6s","7s","發","發"], doraTiles:[],
    prompt:"下家が連荘中で伸び伸び打ってる。あなたの意識は？",
    left:{label:"下家を止めにいく",sub:"好調者を意識して打つ",side:"E"},
    right:{label:"自分の手に集中",sub:"誰が好調でも関係ない",side:"I"} },
  { axis:"EI", tag:"場読み ⇄ 没入", basis:"読みで決める ⇄ 効率で決める",
    meta:"南3局 ・ 11巡目 ・ リーチに無スジ2択",
    hand:["4m","5m","6m","3p","4p","5p","7p","8p","9p","2s","3s","北","北"], doraTiles:[],
    prompt:"リーチに押す。切る危険牌は2つ。選ぶ基準は？",
    left:{label:"相手の待ちを読む",sub:"河から通りそうな方を",side:"E"},
    right:{label:"自分の手が進む方",sub:"受け入れが良い方を",side:"I"} },
  { axis:"EI", tag:"麻雀観 ・ 勝負観", basis:"対人重視 ⇄ 自分重視",
    meta:"あなたの ・ 勝ち方の軸", hand:null,
    prompt:"勝つために大事なのは、どっち？",
    left:{label:"相手を読むこと",sub:"3人の動きを制する",side:"E"},
    right:{label:"自分を貫くこと",sub:"己の最善を積み上げる",side:"I"} },
  { axis:"EI", tag:"麻雀観 ・ 勝負観", basis:"場の空気を読む ⇄ 我が道",
    meta:"卓に着いた時 ・ あなたの視線", hand:null,
    prompt:"打っている間、意識が向くのは？",
    left:{label:"場の全員",sub:"表情・仕草・河を見ている",side:"E"},
    right:{label:"自分の手牌",sub:"手の中の構想に没頭する",side:"I"} },
  { axis:"EI", tag:"麻雀観 ・ 人生観", basis:"外向型 ⇄ 内向型",
    meta:"麻雀を離れて ・ あなたの充電法", hand:null,
    prompt:"力が湧いてくるのは、どっち？",
    left:{label:"人と関わる時",sub:"周りとの掛け合いで乗る",side:"E"},
    right:{label:"一人で集中する時",sub:"自分の世界に入り込む",side:"I"} },
  { axis:"EI", tag:"場読み ⇄ 没入", basis:"他家の気配で判断(E) ⇄ 自分の手牌だけで判断(I)",
    meta:"南1局 ・ 9巡目 ・ 上家の様子が怪しい ・ 赤5切りでリーチ可能", hand:null,
    prompt:"赤5を切ればリーチできる。だが上家の捨て牌が急に慎重になった。あなたは？",
    left:{label:"上家を警戒して一旦様子見",sub:"場の気配を最優先",side:"E"},
    right:{label:"気にせずリーチ",sub:"自分の手の価値を信じる",side:"I"} },
];

const MBTI_LEANS = [{v:-2,label:"迷わず"},{v:-1,label:"やや"},{v:1,label:"やや"},{v:2,label:"迷わず"}];

// 16タイプ配役表：MBTIコード → [麻雀タイプ名, ドラゴンボールキャラ名]
const MBTI_TYPES = {
  INTJ:["孤高の戦略家","ベジータ"], INTP:["牌効率の探究者","ブルマ"],
  ENTJ:["冷徹な処刑人","フリーザ"], ENTP:["盤上の実験者","セル"],
  INFJ:["静かなる読み師","ピッコロ"], INFP:["秘めたる理想家","孫悟飯"],
  ENFJ:["卓の主人公","ミスターサタン"], ENFP:["一発ロマンの風来坊","ヤムチャ"],
  ISTJ:["鉄の求道者","天津飯"], ISFJ:["不屈の生存者","クリリン"],
  ESTJ:["盤面の統率者","未来トランクス"], ESFJ:["和を重んじる調整型","チチ"],
  ISTP:["クールな捌き師","18号"], ISFP:["マイペースの一撃","16号"],
  ESTP:["経験がモノを言う実戦派","亀仙人"], ESFP:["本能の勝負師","孫悟空"],
};
// 覚醒カード専用フレーバーテキスト（素質＝人柄の説明、覚醒＝実際のプレースタイルの説明）
const MBTI_AWAKEN_FLAVOR = {
  INTJ:"序盤から手役の完成形を見据え、誰に何を言われても一点読みを曲げない。安手で妥協するくらいなら潔く沈む。",
  INTP:"常に受け入れ枚数と期待値を頭の中で計算している。理屈で勝てる牌しか切らないが、たまに数字を信じすぎて痛い目を見る。",
  ENTJ:"相手の一番嫌がる牌を、一番嫌がるタイミングで叩き込む。勝ち目が見えた瞬間の踏み込みは誰よりも速く、容赦がない。",
  ENTP:"定石を疑い、誰もやらない仕掛けを平気で試す。当たれば会心の一打、外れても「次はこう来るか」と笑って切り替える。",
  INFJ:"河と気配から静かに先を読み、勝負所だけ音もなく踏み込む。オリと押しの境界線を誰よりも正確に引く。",
  INFP:"普段は無理をせず流れに身を任せているが、ここぞという一局だけ人が変わったように踏み込んでくる。本気を出した時が一番怖い。",
  ENFJ:"卓の空気を自分の味方につけるのがうまい。実力以上の勢いとノリで、気づけば局を支配している。",
  ENFP:"一発のロマンを追いかけて無謀な手を握りがちだが、その分ハマった時のリターンは誰よりも大きい。",
  ISTJ:"型を崩さず、決めた打ち方を最後まで貫き通す。派手さはないが、同じミスを二度と繰り返さない鉄の精度。",
  ISFJ:"大きく攻めるより、最後まで残ることを優先する。地味に見えて、気づけば一番しぶとく生き残っている。",
  ESTJ:"場全体の流れを把握し、周りに指示するように打ち回す。統率力で局を締めるタイプ。",
  ESFJ:"場の均衡を大事にし、無理な勝負より丁寧な進行を選ぶ。周りに気を配りすぎて自分の手が遅れることも。",
  ISTP:"無駄な牌を一枚も切らない、驚くほど機械的で正確な手順。感情を挟まず、最短距離で局を畳む。",
  ISFP:"自分のペースを崩さず、淡々と一撃を狙う。周りが騒がしくても表情ひとつ変えない。",
  ESTP:"場数がモノを言う実戦派。理屈より「これは危ない」という嗅覚で切り抜ける、経験に裏打ちされた勝負師。",
  ESFP:"理屈より本能。危険を察知した瞬間に踏み込む判断力は、誰にも予測できない。",
};
// MBTIキャラ画像パス（本人が別途 public/mbti/ に配置。未配置時はimg側のonErrorでフォールバック）
const mbtiPortraitSrc = (code, awakened=false) => `/mbti/${code.toLowerCase()}_${awakened ? "awakened" : "base"}.png`;

const MBTI_APP_URL = "https://tleague.nerima-night-crew.com";
// 診断結果をLINEで共有。feature detection（UA判定はしない）で経路を切り替える：
// - navigator.share/canShareに対応し、かつファイル共有が可能な環境（主にモバイル）→ カード画像＋テキストを共有シート経由で送る
// - それ以外（主にPC）→ LINEのURLスキームでテキスト＋URLのみ共有
async function mbtiShareResult(code, dbName, typeName, onError) {
  const text = `麻雀MBTI診断やってみた！私は【${dbName}（${typeName}）】でした🀄`;
  const canShareApi = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (canShareApi) {
    try {
      if (typeof navigator.canShare === "function") {
        const res = await fetch(mbtiPortraitSrc(code, false));
        const blob = await res.blob();
        const file = new File([blob], `${code.toLowerCase()}_base.png`, { type: blob.type || "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text}\n${MBTI_APP_URL}` });
          return;
        }
      }
      await navigator.share({ text, url: MBTI_APP_URL });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // ユーザーがシェアをキャンセルした場合は何もしない
      onError && onError(e);
      return;
    }
  }
  // Web Share API非対応環境（主にPC）→ LINEのURLスキームへフォールバック
  const lineUrl = `line://msg/text/${encodeURIComponent(text + "\n" + MBTI_APP_URL)}`;
  window.location.href = lineUrl;
}
const MBTI_AXES = [
  {key:"EI", field:"axis_ei", la:"場読み型", lb:"没入型"},
  {key:"SN", field:"axis_sn", la:"現実型",   lb:"流れ型"},
  {key:"TF", field:"axis_tf", la:"期待値型", lb:"美学型"},
  {key:"JP", field:"axis_jp", la:"決め打ち型", lb:"変幻型"},
];

// 回答（{idx: -2|-1|1|2}）からMBTIコードと各軸の生スコアを算出
function mbtiTally(answers){
  const t={};
  MBTI_QUESTIONS.forEach((q,i)=>{
    const v=answers[i]; if(v==null) return;
    const side=v<0?q.left.side:q.right.side;
    t[side]=(t[side]||0)+Math.abs(v);
  });
  // 回答パターンからハッシュ値を生成（確定的な乱数シード：同じ回答なら常に同じ結果になる）
  // answersは配列ではなく{idx: -2|-1|1|2}形式のオブジェクトのためObject.keysで走査する
  const answerHash = Object.keys(answers).reduce((h,key)=>h+(answers[key]||0)*Math.pow(7,Number(key)), 0);
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  const pick=(a,b)=>{
    const aVal=t[a]||0, bVal=t[b]||0;
    if(aVal===bVal) return seededRandom(answerHash)<0.5?a:b; // 同点時は回答パターンのハッシュ値をシードに確定的に決定
    return aVal>=bVal?a:b;
  };
  const code=pick("E","I")+pick("S","N")+pick("T","F")+pick("J","P");
  return {code,t};
}
// 生スコア→DB保存用（各軸1文字目側の%）に変換
function mbtiAxesToDb(t){
  const pct=(a,b)=>{ const av=t[a]||0, bv=t[b]||0, total=av+bv||1; return Math.round((av/total)*100); };
  return { ei: pct("E","I"), sn: pct("S","N"), tf: pct("T","F"), jp: pct("J","P") };
}

// ---- トレーディングカード ----
function mbtiTemperament(code){
  const isN = code[1]==="N", isT = code[2]==="T", isJ = code[3]==="J";
  if (isN && isT) return "NT";
  if (isN && !isT) return "NF";
  if (!isN && isJ) return "SJ";
  return "SP";
}
function mbtiSpread(r){
  return (Math.abs(r.axis_ei-50)+Math.abs(r.axis_sn-50)+Math.abs(r.axis_tf-50)+Math.abs(r.axis_jp-50))/4;
}
// レア度閾値は初期案。実データを見て後日調整可
function mbtiRarity(spread){
  if (spread >= 35) return "UR";
  if (spread >= 25) return "SR";
  if (spread >= 15) return "R";
  return "N";
}
function mbtiStars(spread){ return Math.max(1, Math.min(7, Math.round(1 + spread/50*6))); }
// 乱数不使用：同じ診断結果なら常に同じ戦闘力になる（演出用の数値）
function mbtiPower(r){
  const spread = mbtiSpread(r);
  return Math.round(3000 + spread*160 + (Number(r.axis_ei)+Number(r.axis_sn)+Number(r.axis_tf)+Number(r.axis_jp))*3);
}
const MBTI_FRAME = {
  NT: "linear-gradient(135deg,#8e2de2,#00c9ff)",
  NF: "linear-gradient(135deg,#ff6ec7,#4ade80)",
  SJ: "linear-gradient(135deg,#b8860b,#f0c674)",
  SP: "linear-gradient(135deg,#e74c3c,#ff8c00)",
};

// ---- 他メンバーカード解放判定 ----
// ルートA：対戦した半荘が10回以上 かつ 勝率50%超（半荘内スコア比較、同点は勝ちに含めない）
function mbtiRouteAStats(sessions, selfId, targetId) {
  let games = 0, wins = 0;
  sessions.forEach(s => {
    const smembers = (s.members || []).map(Number);
    if (!smembers.includes(Number(selfId)) || !smembers.includes(Number(targetId))) return;
    (s.rounds || []).forEach(r => {
      const rPlayers = (r.players || []).map(Number);
      if (!rPlayers.includes(Number(selfId)) || !rPlayers.includes(Number(targetId))) return;
      const selfScore = N(r.scores[String(selfId)] ?? r.scores[selfId]);
      const targetScore = N(r.scores[String(targetId)] ?? r.scores[targetId]);
      games++;
      if (selfScore > targetScore) wins++;
    });
  });
  const winRate = games > 0 ? wins / games : 0;
  return { games, wins, winRate, unlocked: games >= 10 && winRate > 0.5 };
}
// ルートB：対象メンバーが参加した半荘（sessions.members×session_dateで突合）の外馬で、自分のチップ収支合計が+50枚以上
function mbtiRouteBProfit(sessions, raceBets, selfId, targetId) {
  const targetDates = new Set(
    sessions.filter(s => (s.members || []).map(Number).includes(Number(targetId))).map(s => s.date)
  );
  let profit = 0;
  raceBets.forEach(b => {
    if (Number(b.bettor_id) !== Number(selfId)) return;
    if (b.is_hit == null) return;
    if (!targetDates.has(b.session_date)) return;
    const amt = N(b.bet_amount || 1);
    profit += b.is_hit ? Math.round(N(b.payout) * amt) - amt : -amt;
  });
  return profit;
}
// ルートA・Bいずれかを満たせば解放
function mbtiUnlockStatus(sessions, raceBets, selfId, targetId) {
  const routeA = mbtiRouteAStats(sessions, selfId, targetId);
  const profitB = mbtiRouteBProfit(sessions, raceBets, selfId, targetId);
  return { unlocked: routeA.unlocked || profitB >= 50, routeA, profitB };
}
// 覚醒カードの解放にはルートA・Bの両方が必要（素質はどちらか一方でOK）
function mbtiAwakenUnlockStatus(sessions, raceBets, selfId, targetId) {
  const base = mbtiUnlockStatus(sessions, raceBets, selfId, targetId);
  return { unlocked: base.routeA.unlocked && base.profitB >= 50, routeA: base.routeA, profitB: base.profitB };
}

// ---- 覚醒カード：規定打席（Mリーグ個人タイトルのbuildMemberMLeagueと同じ計算式を流用） ----
function mbtiAwakenQual(sessions, members, memberId) {
  const id = Number(memberId);
  const currentYear = new Date().getFullYear();
  const yearSessions = sessions.filter(s => s.date && s.date.startsWith(String(currentYear)));
  const getMonth = d => parseInt(d.slice(5, 7), 10);
  const firstHalfSessions = yearSessions.filter(s => { const m = getMonth(s.date); return m >= 1 && m <= 6; });
  const secondHalfSessions = yearSessions.filter(s => { const m = getMonth(s.date); return m >= 7 && m <= 12; });

  const calcPeriod = (periodSessions) => {
    const totals = {};
    members.forEach(m => { totals[m.id] = 0; });
    periodSessions.forEach(s => {
      (s.rounds || []).forEach(r => {
        (r.players || []).forEach(pid => {
          const pidNum = Number(pid);
          if (totals[pidNum] !== undefined) totals[pidNum]++;
        });
      });
    });
    const participantsCount = Object.values(totals).filter(t => t > 0).length;
    const totalPlayHalves = Object.values(totals).reduce((a, b) => a + b, 0);
    const standardRounds = participantsCount > 0 ? Math.floor(totalPlayHalves / participantsCount) : 0;
    const easeRounds = Math.floor(standardRounds * 0.85);
    return { total: totals[id] || 0, easeRounds };
  };

  const fh = calcPeriod(firstHalfSessions);
  const sh = calcPeriod(secondHalfSessions);
  const fhQualified = fh.easeRounds > 0 && fh.total >= fh.easeRounds;
  const shQualified = sh.easeRounds > 0 && sh.total >= sh.easeRounds;
  const qualified = fhQualified || shQualified;
  const shortfalls = [];
  if (fh.easeRounds > 0 && !fhQualified) shortfalls.push(fh.easeRounds - fh.total);
  if (sh.easeRounds > 0 && !shQualified) shortfalls.push(sh.easeRounds - sh.total);
  const remaining = qualified ? 0 : (shortfalls.length ? Math.min(...shortfalls) : null);
  return { qualified, remaining };
}

// 実戦データの生集計（1半荘=1round単位）
function mbtiRawStats(sessions, raceBets, memberId) {
  const id = Number(memberId);
  let total = 0, lastCount = 0, yakumanCount = 0;
  const ranks = [];
  const vs = {};
  sessions.forEach(s => {
    (s.rounds || []).forEach(r => {
      if (!r.players || !r.scores) return;
      const rPlayers = r.players.map(Number);
      if (!rPlayers.includes(id)) return;
      const myScore = N(r.scores[String(id)] ?? r.scores[id]);
      const sorted = [...rPlayers].sort((a, b) => N(r.scores[String(b)] ?? r.scores[b]) - N(r.scores[String(a)] ?? r.scores[a]));
      const rank = sorted.indexOf(id) + 1;
      total++; ranks.push(rank);
      if (rank === 4) lastCount++;
      if (r.yakuman && r.yakuman.map(Number).includes(id)) yakumanCount++;
      rPlayers.forEach(opId => {
        if (opId === id) return;
        if (!vs[opId]) vs[opId] = { wins: 0, total: 0 };
        const opScore = N(r.scores[String(opId)] ?? r.scores[opId]);
        vs[opId].total++;
        if (myScore > opScore) vs[opId].wins++;
      });
    });
  });
  const avgRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
  const rankVariance = ranks.length ? ranks.reduce((a, r) => a + (r - avgRank) ** 2, 0) / ranks.length : 0;
  const lastRate = total > 0 ? (lastCount / total) * 100 : 0;
  const yakumanFreq = total > 0 ? yakumanCount / total : 0;
  const winRates = Object.values(vs).filter(v => v.total > 0).map(v => v.wins / v.total);
  const winAvg = winRates.length ? winRates.reduce((a, b) => a + b, 0) / winRates.length : 0;
  const winVariance = winRates.length ? winRates.reduce((a, r) => a + (r - winAvg) ** 2, 0) / winRates.length : 0;
  const myBets = raceBets.filter(b => Number(b.bettor_id) === id).length;
  const betRate = total > 0 ? myBets / total : 0;
  return { total, lastRate, rankVariance, yakumanFreq, winVariance, betRate };
}
// リーグ内平均値（ゲスト除く、参加半荘のあるメンバーのみ対象）
function mbtiLeagueBaseline(sessions, raceBets, members) {
  const eligible = members.filter(m => !isGuestMember(m));
  const stats = eligible.map(m => mbtiRawStats(sessions, raceBets, m.id)).filter(s => s.total > 0);
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  return {
    yakumanFreq: avg(stats.map(s => s.yakumanFreq)) || 0.0001,
    winVariance: avg(stats.map(s => s.winVariance)) || 0.0001,
    betRate: avg(stats.map(s => s.betRate)) || 0.0001,
  };
}
// 4段階ティア（既存のavgRankCol/topRateCol等と同じ発想：閾値に応じて90/70/50/30点）
function mbtiTierScore4(value, t1, t2, t3, lowerIsBetter = true) {
  const cmp = (v, t) => lowerIsBetter ? v <= t : v >= t;
  if (cmp(value, t1)) return 90;
  if (cmp(value, t2)) return 70;
  if (cmp(value, t3)) return 50;
  return 30;
}
// リーグ平均との比率を0-100の傾きスコアに変換（平均=50、倍で+25、半分で-25、上下限クランプ）
function mbtiRatioScore(ratio) {
  return Math.max(0, Math.min(100, 50 + (ratio - 1) * 25));
}
// 実戦データから4軸の「%第一文字寄り」スコアを算出
function mbtiPracticalAxes(raw, baseline) {
  const sScore = mbtiTierScore4(raw.lastRate, 16, 20, 23, true); // 4着回避率が高い(ラス率が低い)ほどS
  const yakumanRatio = raw.yakumanFreq / baseline.yakumanFreq;
  const nScoreFromYakuman = mbtiRatioScore(yakumanRatio); // 役満頻度の比率が高いほどN
  const sn = (sScore + (100 - nScoreFromYakuman)) / 2; // %S

  const jp = mbtiTierScore4(raw.rankVariance, 0.8, 1.1, 1.4, true); // 順位の分散が小さいほどJ

  const winVarianceRatio = raw.winVariance / baseline.winVariance;
  const fScore = mbtiRatioScore(winVarianceRatio); // 対戦相手ごとの勝率のばらつきが大きいほどF
  const tf = 100 - fScore; // %T

  const betRatio = raw.betRate / baseline.betRate;
  const ei = mbtiRatioScore(betRatio); // 外馬参加率が高いほどE

  return { ei, sn, tf, jp };
}
// 覚醒カード本体の算出（診断%×0.5＋実戦%×0.5）。未達成時はqualified:falseとremaining半荘数を返す
function mbtiComputeAwaken(sessions, raceBets, members, memberId, baseResult) {
  const qual = mbtiAwakenQual(sessions, members, memberId);
  if (!qual.qualified) return { qualified: false, remaining: qual.remaining };
  const raw = mbtiRawStats(sessions, raceBets, memberId);
  const baseline = mbtiLeagueBaseline(sessions, raceBets, members);
  const practical = mbtiPracticalAxes(raw, baseline);
  const blend = (base, prac) => Number(base) * 0.5 + prac * 0.5;
  const axes = {
    ei: blend(baseResult.axis_ei, practical.ei),
    sn: blend(baseResult.axis_sn, practical.sn),
    tf: blend(baseResult.axis_tf, practical.tf),
    jp: blend(baseResult.axis_jp, practical.jp),
  };
  const pick = (v, a, b) => v >= 50 ? a : b;
  const code = pick(axes.ei, "E", "I") + pick(axes.sn, "S", "N") + pick(axes.tf, "T", "F") + pick(axes.jp, "J", "P");
  const devs = Object.values(axes).map(v => Math.abs(v - 50));
  const allStrong = devs.every(d => d >= 30); // 4軸すべてが強く振れていたらLR、それ以外はUR（覚醒は必ずUR以上）
  const rarity = allStrong ? "LR" : "UR";
  const spread = devs.reduce((a, b) => a + b, 0) / 4;
  const basePower = mbtiPower(baseResult);
  const boostMul = rarity === "LR" ? 3.5 : 2.8;
  const rankBonus = rarity === "LR" ? 15000 : 9000;
  const power = Math.round(basePower * boostMul + rankBonus);
  return { qualified: true, axes, code, rarity, spread, power };
}

function MbtiStar({ lit }) {
  return (
    <div style={{
      width:16, height:16, borderRadius:"50%",
      background: lit ? "radial-gradient(circle at 35% 30%, #fff6c8, #f5a623 60%, #b8720a 100%)" : "rgba(255,255,255,0.08)",
      border: lit ? "1px solid #ffdd55" : "1px solid rgba(255,255,255,0.15)",
      boxShadow: lit ? "0 0 6px 1px #f5a62388" : "none",
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#7a4a00", flex:"0 0 auto",
    }}>{lit ? "★" : ""}</div>
  );
}

function MbtiCard({ result, member }) {
  const code = result.mbti_code;
  const [typeName, dbName] = MBTI_TYPES[code] || ["?","?"];
  const temperament = mbtiTemperament(code);
  const spread = mbtiSpread(result);
  const rarity = mbtiRarity(spread);
  const stars = mbtiStars(spread);
  const power = mbtiPower(result);
  const holo = rarity==="SR" || rarity==="UR";

  const axisRow = (pctA, la, lb) => (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4}}>
        <span style={{color:pctA>=50?"#fff":"#8FA69B", fontWeight:pctA>=50?700:400}}>{la}</span>
        <span style={{color:pctA<50?"#fff":"#8FA69B", fontWeight:pctA<50?700:400}}>{lb}</span>
      </div>
      <div style={{height:6, background:"#0c221d", borderRadius:4, overflow:"hidden", display:"flex"}}>
        <div style={{width:`${pctA}%`, background:"#C6A24C"}}/>
        <div style={{width:`${100-pctA}%`, background:"#2F7A57"}}/>
      </div>
    </div>
  );

  return (
    <div style={{padding:3, borderRadius:16, background:MBTI_FRAME[temperament], boxShadow:"0 4px 18px rgba(0,0,0,0.5)"}}>
      <div style={{position:"relative", borderRadius:14, background:"linear-gradient(160deg,#12121f,#1a1a2e)", padding:16, overflow:"hidden"}}>
        {holo && (
          <div style={{
            position:"absolute", inset:0, borderRadius:"inherit", pointerEvents:"none",
            background:"linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.05) 50%, transparent 60%)",
            backgroundSize:"250% 250%", mixBlendMode:"overlay", animation:"mbtiHoloSweep 2.8s linear infinite",
          }}/>
        )}
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
          <Av m={member} sz={40}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:700, color:"#fff"}}>{member?.name || "?"}</div>
            <div style={{fontSize:10, color:"#8FA69B", letterSpacing:2}}>{code}</div>
          </div>
        </div>
        <img src={mbtiPortraitSrc(code, false)} alt={dbName} draggable={false}
          onError={(e)=>{ e.currentTarget.style.display="none"; }}
          style={{width:"100%", aspectRatio:"3 / 4", objectFit:"cover", borderRadius:10, marginBottom:10, display:"block", background:"rgba(0,0,0,0.25)"}}/>
        <div style={{textAlign:"center", marginBottom:10}}>
          <div style={{fontSize:18, fontWeight:800, color:"#ddd"}}>「{typeName}」</div>
        </div>
        <div style={{display:"flex", gap:3, justifyContent:"center", marginBottom:10, flexWrap:"wrap"}}>
          {Array.from({length:7}).map((_,i)=>(<MbtiStar key={i} lit={i<stars}/>))}
        </div>
        <div style={{textAlign:"center", fontSize:11, color:"#888", marginBottom:14}}>
          戦闘力 <span style={{fontSize:16, fontWeight:800, color:"#fff", marginLeft:4}}>{power.toLocaleString()}</span>
        </div>
        <div style={{background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"10px 12px"}}>
          {MBTI_AXES.map(ax=>(<div key={ax.key}>{axisRow(Number(result[ax.field]), ax.la, ax.lb)}</div>))}
        </div>
      </div>
    </div>
  );
}

// ---- 覚醒カード：素質カード＋実戦データを反映。必ずUR以上、戦闘力も大幅ブースト ----
function MbtiAwakenCard({ awaken, member }) {
  const code = awaken.code;
  const [typeName, dbName] = MBTI_TYPES[code] || ["?","?"];
  const flavor = MBTI_AWAKEN_FLAVOR[code] || "";
  const temperament = mbtiTemperament(code);
  const stars = mbtiStars(awaken.spread);
  const isLr = awaken.rarity === "LR";

  const axisRow = (pctA, la, lb) => (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4}}>
        <span style={{color:pctA>=50?"#fff":"#8FA69B", fontWeight:pctA>=50?700:400}}>{la}</span>
        <span style={{color:pctA<50?"#fff":"#8FA69B", fontWeight:pctA<50?700:400}}>{lb}</span>
      </div>
      <div style={{height:6, background:"#0c221d", borderRadius:4, overflow:"hidden", display:"flex"}}>
        <div style={{width:`${pctA}%`, background: isLr ? "#ff9d3d" : "#C6A24C"}}/>
        <div style={{width:`${100-pctA}%`, background:"#2F7A57"}}/>
      </div>
    </div>
  );

  return (
    <div style={{
      padding:4, borderRadius:18,
      background: isLr ? "linear-gradient(135deg,#ffd700,#ff3d81,#7c4dff,#00e5ff)" : MBTI_FRAME[temperament],
      boxShadow:"0 6px 24px rgba(0,0,0,0.6)",
      animation: isLr ? "mbtiLrRainbow 3.2s linear infinite" : "none",
    }}>
      <div style={{position:"relative", borderRadius:15, background:"linear-gradient(160deg,#0c0c17,#161628)", padding:16, overflow:"hidden", border: isLr ? "1px solid rgba(255,215,0,0.5)" : "none"}}>
        <div style={{
          position:"absolute", inset:0, borderRadius:"inherit", pointerEvents:"none",
          background:"linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
          backgroundSize:"250% 250%", mixBlendMode:"overlay", animation:"mbtiHoloSweep 2.4s linear infinite",
        }}/>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
          <Av m={member} sz={40}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:700, color:"#fff"}}>{member?.name || "?"}</div>
            <div style={{fontSize:10, color:"#8FA69B", letterSpacing:2}}>{code}</div>
          </div>
          <div style={{fontSize:9, fontWeight:800, color:"#ffe08a", padding:"2px 7px", borderRadius:10, background:"rgba(255,157,61,0.18)", border:"1px solid rgba(255,157,61,0.5)"}}>⚡ 覚醒</div>
        </div>
        <img src={mbtiPortraitSrc(code, true)} alt={dbName} draggable={false}
          onError={(e)=>{ e.currentTarget.style.display="none"; }}
          style={{width:"100%", aspectRatio:"3 / 4", objectFit:"cover", borderRadius:10, marginBottom:10, display:"block", background:"rgba(0,0,0,0.3)"}}/>
        <div style={{textAlign:"center", marginBottom:6}}>
          <div style={{fontSize:18, fontWeight:800, color: isLr ? "#ffd700" : "#ddd", textShadow: isLr ? "0 0 12px rgba(255,215,0,0.6)" : "none"}}>「{typeName}」</div>
        </div>
        <div style={{fontSize:10.5, color:"#B9C4BD", lineHeight:1.6, textAlign:"center", margin:"0 4px 10px", fontStyle:"italic"}}>{flavor}</div>
        <div style={{display:"flex", gap:3, justifyContent:"center", marginBottom:10, flexWrap:"wrap"}}>
          {Array.from({length:7}).map((_,i)=>(<MbtiStar key={i} lit={i<stars}/>))}
        </div>
        <div style={{textAlign:"center", fontSize:11, color:"#888", marginBottom:14}}>
          戦闘力 <span style={{fontSize:19, fontWeight:900, color: isLr ? "#ffd700" : "#fff", marginLeft:4, textShadow: isLr ? "0 0 10px rgba(255,215,0,0.7)" : "none"}}>{awaken.power.toLocaleString()}</span>
        </div>
        <div style={{background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"10px 12px"}}>
          {MBTI_AXES.map(ax=>(<div key={ax.key}>{axisRow(Number(awaken.axes[ax.field.replace("axis_","")]), ax.la, ax.lb)}</div>))}
        </div>
      </div>
    </div>
  );
}

// ---- メンバー名簿（他メンバーカードの解放状況一覧）----
function MbtiRulePanel() {
  const [open, setOpen] = useState(false);
  const h = (color, text) => <div style={{fontWeight:600, color, marginTop:12, marginBottom:4}}>{text}</div>;
  return (
    <div style={{marginBottom:10, background:"rgba(52,152,219,0.06)", borderRadius:8, border:"1px solid rgba(52,152,219,0.15)"}}>
      <div onClick={()=>setOpen(p=>!p)} style={{display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", padding:"9px 12px"}}>
        <div style={{fontSize:12, fontWeight:600, color:"#3498db"}}>❓ 遊び方を見る</div>
        <span style={{fontSize:13, color:"#888"}}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{padding:"0 12px 12px", fontSize:11, color:"#ccc", lineHeight:1.7}}>
          {h("#3498db","🧠 MBTI診断とは")}
          <div>本診断は、心理学で実際に使われているMBTI理論（4軸・16タイプ）をベースに、麻雀の場面に置き換えたオリジナル設問で構成されています。単なる話のネタではなく、ちゃんとした性格理論に基づいた診断です。</div>

          {h("#3498db","🎴 素質カードの入手方法")}
          <div>自分の分：診断を完了すれば即入手できます。</div>
          <div style={{marginTop:4}}>他人の分：以下のどちらかを満たすと入手できます。</div>
          <div style={{marginTop:2}}>・対戦成績ルート：その人と半荘10回以上対戦し、勝ち越している</div>
          <div>・外馬ルート：その人が参加した半荘の外馬で、チップ収支+50枚以上稼ぐ</div>

          {h("#ffb347","⚡ 覚醒カードとは")}
          <div>覚醒カードは、クイズの回答結果だけでなく、あなたの実際の対局成績・外馬成績を大きく反映（診断結果と実戦データを50%ずつ）して算出される、"クイズでは測れない、実戦で磨かれた本当の麻雀性格"です。</div>
          <div style={{marginTop:4}}>自分の分：規定半荘数に到達すれば自動的に入手できます。</div>
          <div style={{marginTop:4}}>他人の分：素質カードの入手条件（対戦成績ルート・外馬ルート）の両方を満たす必要があります（片方だけでは入手不可）。</div>

          {h("#f1c40f","💎 レア度")}
          <div>N → R → SR → UR → LR（覚醒限定の最上位ランク）の順に希少になります。性格の"尖り具合"や実戦成績で決まります。</div>

          {h("#2ecc71","🏆 タイプ制覇")}
          <div>16タイプ中いくつのタイプのカードを集めたかを示す進捗です（メンバー内で誰かとタイプが被ることもあります）。</div>
        </div>
      )}
    </div>
  );
}

// ---- コレクション：自分が解放済みの素質・覚醒カードだけを並べる ----
function MbtiCollection({ members, mbtiResults, sessions, raceBets, raceSelf, onBack, expandId, onToggleExpand, awakenExpandId, onToggleAwakenExpand }) {
  const rosterMembers = members.filter(m => !isGuestMember(m));
  const mbtiOf = id => mbtiResults.find(r => Number(r.member_id) === Number(id));

  const visible = rosterMembers.filter(m => {
    const result = mbtiOf(m.id);
    if (!result) return false;
    if (Number(m.id) === Number(raceSelf)) return true;
    return mbtiUnlockStatus(sessions, raceBets, raceSelf, m.id).unlocked;
  });

  const coverage = new Set();
  visible.forEach(m => { const r = mbtiOf(m.id); if (r) coverage.add(r.mbti_code); });

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
        <button onClick={onBack} style={{padding:"6px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:12}}>← 戻る</button>
        <div style={{fontSize:12, fontWeight:700, color:"#f1c40f"}}>タイプ制覇 {coverage.size}/16</div>
      </div>

      <MbtiRulePanel/>

      <div style={{fontSize:11, color:"#888", margin:"4px 0 10px"}}>コレクション（{visible.length}枚）</div>

      {visible.length === 0 && (
        <div style={{textAlign:"center", padding:24, color:"#666", fontSize:12}}>
          まだカードがありません。対戦や外馬でカードを集めましょう。
        </div>
      )}

      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        {visible.map(m => {
          const result = mbtiOf(m.id);
          const isSelf = Number(m.id) === Number(raceSelf);
          const [typeName, dbName] = MBTI_TYPES[result.mbti_code] || ["?","?"];
          const expanded = expandId === m.id;
          const awakenExpanded = awakenExpandId === m.id;

          const qual = mbtiAwakenQual(sessions, members, m.id);
          let awakenBlock = null;
          if (!qual.qualified) {
            if (isSelf) {
              awakenBlock = (
                <div style={{marginTop:8, fontSize:10, color:"#e08a3c", background:"rgba(230,126,34,0.08)", borderRadius:8, padding:"6px 10px"}}>
                  ⚡ 覚醒条件未達{qual.remaining!=null ? `（あと${qual.remaining}半荘）` : ""}
                </div>
              );
            }
          } else {
            const awakenUnlocked = isSelf || mbtiAwakenUnlockStatus(sessions, raceBets, raceSelf, m.id).unlocked;
            if (awakenUnlocked) {
              const awaken = mbtiComputeAwaken(sessions, raceBets, members, m.id, result);
              awakenBlock = (
                <div style={{marginTop:8}}>
                  <div onClick={()=>onToggleAwakenExpand(awakenExpanded ? null : m.id)}
                    style={{display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", fontSize:11, color:"#ffb347", fontWeight:600, padding:"4px 2px"}}>
                    <span>⚡ 覚醒カード（{awaken.rarity}）</span>
                    <span>{awakenExpanded ? "▲" : "▼"}</span>
                  </div>
                  {awakenExpanded && <div style={{marginTop:6}}><MbtiAwakenCard awaken={awaken} member={m}/></div>}
                </div>
              );
            } else {
              awakenBlock = (
                <div style={{marginTop:8, fontSize:10, color:"#888", background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"6px 10px"}}>
                  ⚡ 覚醒：未解放（対戦成績・外馬の両方を満たすと解放）
                </div>
              );
            }
          }

          return (
            <div key={m.id} style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:10}}>
              <div onClick={()=>onToggleExpand(expanded ? null : m.id)} style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer"}}>
                <Av m={m} sz={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13, fontWeight:700, color:"#fff"}}>{dbName} <span style={{fontSize:10, color:"#888", fontWeight:400}}>「{typeName}」</span></div>
                  <div style={{fontSize:10, color:"#888"}}>所有者：{m.name}{isSelf ? "（本人）" : ""}</div>
                </div>
                <div style={{fontSize:10, color:"#888"}}>{expanded ? "▲" : "▼"}</div>
              </div>
              {expanded && <div style={{marginTop:10}}><MbtiCard result={result} member={m}/></div>}
              {awakenBlock}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MbtiQuiz({ onFinish, onCancel }) {
  const [stage, setStage] = useState("intro"); // "intro" | "quiz"
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const choose = (v) => {
    const next = { ...answers, [idx]: v };
    setAnswers(next);
    setTimeout(() => {
      if (idx < MBTI_QUESTIONS.length - 1) {
        setIdx(idx + 1);
      } else {
        const { code, t } = mbtiTally(next);
        onFinish(code, mbtiAxesToDb(t), next);
      }
    }, 220);
  };

  const shell = (children) => (
    <div style={{
      background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      color: MBTI_C.ivory, fontFamily: MBTI_FONT_GO,
      borderRadius: 14, padding: "22px 16px 30px",
    }}>
      {children}
    </div>
  );

  if (stage === "intro") {
    return shell(
      <div style={{textAlign:"center", paddingTop:10}}>
        <div style={{fontFamily:MBTI_FONT_MIN, color:MBTI_C.brass, letterSpacing:6, fontSize:12}}>東武練馬Tリーグ 公認</div>
        <h1 style={{fontFamily:MBTI_FONT_MIN, fontSize:30, fontWeight:700, margin:"14px 0 6px", lineHeight:1.3}}>雀 打 診 断</h1>
        <div style={{color:MBTI_C.mute, fontSize:13}}>全32問で、あなたの16タイプを。</div>
        <div style={{display:"flex", flexWrap:"nowrap", gap:5, justifyContent:"center", margin:"22px 0 22px"}}>
          {["1m","5p","發","中"].map((c,i)=>(<MbtiTile key={i} code={c} w={44}/>))}
        </div>
        <p style={{color:"#D8CDB4", fontSize:13.5, lineHeight:1.9, textAlign:"left"}}>
          麻雀界で実際に使われる打ち手の分類（デジタル/アナログ、攻撃/守備）を土台に、
          4つの軸を測ります。局面18問＋お題14問。正解はありません。感覚で。
        </p>
        <button onClick={()=>setStage("quiz")}
          style={{marginTop:20, width:"100%", padding:"15px", background:MBTI_C.red, color:"#fff",
            border:"none", borderRadius:10, fontSize:16, fontWeight:700, fontFamily:MBTI_FONT_MIN,
            letterSpacing:2, cursor:"pointer", boxShadow:"0 4px 0 #7f2820"}}>
          はじめる（全32問）
        </button>
        {onCancel && (
          <button onClick={onCancel}
            style={{marginTop:10, width:"100%", padding:"11px", background:"transparent", color:MBTI_C.mute,
              border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, fontSize:13, cursor:"pointer"}}>
            やめる
          </button>
        )}
      </div>
    );
  }

  const q = MBTI_QUESTIONS[idx];
  const current = answers[idx];
  const isOdai = !q.hand;
  return shell(
    <div>
      <div style={{textAlign:"center", color:MBTI_C.mute, fontSize:11, marginBottom:8}}>{idx+1} / {MBTI_QUESTIONS.length}</div>
      <div style={{height:4, background:"#22463c", borderRadius:2, overflow:"hidden", marginBottom:16}}>
        <div style={{width:`${(idx/(MBTI_QUESTIONS.length-1))*100}%`, height:"100%", background:MBTI_C.brass, transition:"width .25s"}}/>
      </div>
      <div style={{textAlign:"center", color:MBTI_C.brass, fontFamily:MBTI_FONT_MIN, fontSize:12.5, letterSpacing:1}}>{q.meta}</div>
      <div style={{textAlign:"center", color:MBTI_C.mute, fontSize:11, marginTop:4}}>測定軸：{q.tag}</div>
      {q.basis && <div style={{textAlign:"center", color:"#7f9a8d", fontSize:10.5, marginTop:3}}>認知枠組み：{q.basis}</div>}

      {!isOdai ? (
        <>
          <div style={{margin:"16px 0 8px", padding:"18px 8px", background:"rgba(0,0,0,.16)", borderRadius:12,
            border:"1px solid rgba(0,0,0,.25)", display:"flex", flexWrap:"nowrap", gap:3, justifyContent:"center"}}>
            {q.hand.map((c,i)=>(<MbtiTile key={i} code={c} w={40} dora={q.doraTiles && q.doraTiles.includes(c)} aka={q.akaTiles && q.akaTiles.includes(c)}/>))}
          </div>
          <p style={{fontFamily:MBTI_FONT_MIN, fontSize:17, textAlign:"center", lineHeight:1.7, margin:"16px 6px 22px"}}>{q.prompt}</p>
        </>
      ) : (
        <div style={{position:"relative", margin:"16px 0 22px", borderRadius:14, overflow:"hidden",
          background:"linear-gradient(180deg,#151515,#0a0a0a)", border:"1px solid rgba(198,162,76,.55)",
          boxShadow:"0 8px 24px rgba(0,0,0,.55), inset 0 0 46px rgba(198,162,76,.06)"}}>
          <div style={{height:7, background:`repeating-linear-gradient(90deg, ${MBTI_C.red} 0 16px, #f4efe0 16px 32px)`}}/>
          <div style={{position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
            width:300, height:200, background:"radial-gradient(closest-side, rgba(198,162,76,.20), transparent)", pointerEvents:"none"}}/>
          <div style={{position:"relative", padding:"22px 22px 30px", textAlign:"center"}}>
            <div style={{display:"inline-block", background:MBTI_C.brass, color:"#141414", fontFamily:MBTI_FONT_MIN,
              fontWeight:800, fontSize:13, letterSpacing:6, padding:"3px 18px 3px 22px", borderRadius:2, marginBottom:20}}>お題</div>
            <div style={{fontFamily:MBTI_FONT_MIN, fontSize:21, fontWeight:700, color:"#F5EEDC", lineHeight:1.85}}>{q.prompt}</div>
          </div>
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", gap:10, marginBottom:10}}>
        {[q.left,q.right].map((p,i)=>(
          <div key={i} style={{flex:1, textAlign:i===0?"left":"right"}}>
            <div style={{fontFamily:MBTI_FONT_MIN, fontSize:15, fontWeight:700, color:MBTI_C.ivory}}>{p.label}</div>
            <div style={{fontSize:11, color:MBTI_C.mute, marginTop:2}}>{p.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex", gap:6}}>
        {MBTI_LEANS.map((ln)=>{
          const active = current===ln.v, isLeft = ln.v<0;
          return (
            <button key={ln.v} onClick={()=>choose(ln.v)}
              style={{flex:Math.abs(ln.v)===2?1.25:1, padding:"14px 4px", borderRadius:9,
                border:`1px solid ${active?MBTI_C.brass:"#2c5347"}`,
                background:active?(isLeft?MBTI_C.brass:MBTI_C.green):"rgba(255,255,255,.04)",
                color:active?"#10201b":MBTI_C.ivory, fontWeight:active?800:500, fontFamily:MBTI_FONT_MIN, fontSize:13,
                cursor:"pointer", transition:"all .15s"}}>
              {ln.label}<div style={{fontSize:9, opacity:0.7, marginTop:2}}>{isLeft?"◀":"▶"}</div>
            </button>
          );
        })}
      </div>
      <div style={{textAlign:"center", color:MBTI_C.mute, fontSize:10.5, marginTop:14}}>直感で。中央（五分五分）はあえて無し。</div>
    </div>
  );
}

// Confetti紙吹雪コンポーネント
// ========================================================
// 外馬レース：競馬ゲーム風トラックアニメーション v2
// ========================================================
// 疾走する馬スプライト（騎手・ゼッケン・ギャロップアニメ付き）
function HorseSprite({ coat, silk, num, flip, isMine, evType }) {
  return (
    <g>
      {/* 影 */}
      <ellipse cx="0" cy="9" rx="9" ry="2" fill="rgba(0,0,0,0.28)"/>
      {/* 自分の馬の金リング */}
      {isMine && (
        <ellipse cx="0" cy="9" rx="12" ry="3" fill="none" stroke="#ffd700" strokeWidth="1.2">
          <animate attributeName="opacity" values="0.9;0.25;0.9" dur="1.2s" repeatCount="indefinite"/>
        </ellipse>
      )}
      {/* 上下バウンド（ギャロップの躍動感） */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="0.36s" repeatCount="indefinite"/>
        {/* 尻尾 */}
        <path d="M-7.5,-1.5 Q-12,-0.5 -11,4.5" stroke={coat} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        {/* 脚（前後ペアが交互にスイング） */}
        <g stroke={coat} strokeWidth="1.8" strokeLinecap="round" fill="none">
          <line x1="-5" y1="2" x2="-7.5" y2="8.5">
            <animateTransform attributeName="transform" type="rotate" values="-24 -5 2;24 -5 2;-24 -5 2" dur="0.36s" repeatCount="indefinite"/>
          </line>
          <line x1="-3.8" y1="2" x2="-2" y2="8.5">
            <animateTransform attributeName="transform" type="rotate" values="20 -3.8 2;-20 -3.8 2;20 -3.8 2" dur="0.36s" repeatCount="indefinite"/>
          </line>
          <line x1="4" y1="2" x2="6.5" y2="8.5">
            <animateTransform attributeName="transform" type="rotate" values="26 4 2;-18 4 2;26 4 2" dur="0.36s" repeatCount="indefinite"/>
          </line>
          <line x1="5" y1="2" x2="3.2" y2="8.5">
            <animateTransform attributeName="transform" type="rotate" values="-18 5 2;26 5 2;-18 5 2" dur="0.36s" repeatCount="indefinite"/>
          </line>
        </g>
        {/* 胴体 */}
        <ellipse cx="0" cy="0" rx="7.5" ry="3.7" fill={coat}/>
        {/* 首・頭 */}
        <path d="M5,-1.8 L9.2,-6.2 Q10.4,-7.4 11.6,-6.4 L13.6,-4.7 Q14.2,-4.2 13.4,-3.7 L10.8,-3 L8.2,1.2 Z" fill={coat}/>
        {/* たてがみ */}
        <path d="M5.6,-2.4 Q7.8,-5.8 9.6,-6.6" stroke="#241510" strokeWidth="1.1" fill="none"/>
        {/* 耳 */}
        <path d="M9.8,-6.9 l0.6,-1.7 l1,1.2 z" fill={coat}/>
        {/* ゼッケン（番号は左右反転しても読めるよう打ち消し） */}
        <rect x="-4.8" y="-2.4" width="5.6" height="4.8" rx="1" fill="#fff" stroke="#333" strokeWidth="0.4"/>
        <text x={flip === -1 ? 2 : -2} y="1.4" fontSize="4.4" fill="#111" textAnchor="middle" fontWeight="bold" transform={flip === -1 ? "scale(-1,1)" : undefined}>{num}</text>
        {/* 騎手（勝負服＝レーンカラー） */}
        <path d="M0.2,-4.6 Q1.8,-3.2 3.4,-4.4 L2.8,-1.6 Q1.4,-0.7 0.4,-1.7 Z" fill={silk}/>
        <circle cx="1.7" cy="-6.3" r="2" fill={silk} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
      </g>
      {/* ドラマイベント演出 */}
      {evType === "dash" && (
        <g stroke="#fff" strokeWidth="0.9" opacity="0.8" strokeLinecap="round">
          <line x1="-10" y1="-3" x2="-15" y2="-3"/>
          <line x1="-11" y1="0" x2="-17" y2="0"/>
          <line x1="-10" y1="3" x2="-15" y2="3"/>
        </g>
      )}
      {evType === "chase" && (
        <text x={flip === -1 ? 12 : -12} y="-6" fontSize="6" textAnchor="middle" transform={flip === -1 ? "scale(-1,1)" : undefined}>⚡</text>
      )}
      {evType === "slow" && (
        <text x={flip === -1 ? -1 : 1} y="-11" fontSize="6" textAnchor="middle" transform={flip === -1 ? "scale(-1,1)" : undefined}>💤</text>
      )}
    </g>
  );
}

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

  // トラックジオメトリ
  const cx = 140, cy = 104, rx = 96, ry = 30;
  // 4レーン（外側ほど半径大、縦方向は0.55倍で奥行き感）
  const laneOffsets = [0, 7, 14, 21];

  // 自分が賭けた馬のID
  const myHorseIds = betType ? mySelection : [];
  const silks = ["#e74c3c","#3498db","#2ecc71","#f1c40f"];
  const coats = ["#7B4B2A","#4E342E","#9C6B45","#33231B"];

  // 各馬の描画パラメータ（位置・進行方向への向き）
  const horseDraw = playingMembers.map((m, i) => {
    const angle = positions[i] * Math.PI * 2 - Math.PI / 2;
    const hRx = rx + laneOffsets[i];
    const hRy = ry + laneOffsets[i] * 0.55;
    const x = cx + hRx * Math.cos(angle);
    const y = cy + hRy * Math.sin(angle);
    // 進行方向ベクトル → 左右反転と傾き
    const dx = -hRx * Math.sin(angle);
    const dy = hRy * Math.cos(angle);
    const flip = dx >= 0 ? 1 : -1;
    let tilt = Math.atan2(dy, dx) * 180 / Math.PI;
    if (flip === -1) tilt -= 180;
    if (tilt > 180) tilt -= 360;
    if (tilt < -180) tilt += 360;
    tilt = Math.max(-24, Math.min(24, tilt));
    return { m, i, x, y, flip, tilt };
  });
  // 手前の馬を前面に描画
  const renderOrder = [...horseDraw].sort((a, b) => a.y - b.y);

  // 現在の着順（進捗順）
  const ranks = positions.map((p, idx) => ({ idx, p })).sort((a, b) => b.p - a.p);

  // 観客（初回マウント時に固定生成・毎フレーム変わらない）
  const crowd = useRef(Array.from({ length: 56 }, (_, k) => ({
    x: 36 + (k % 28) * 7.4 + ((k * 7) % 5),
    y: 30 + Math.floor(k / 28) * 8 + ((k * 13) % 4),
    c: ["#ffadad","#ffd6a5","#fdffb6","#caffbf","#9bf6ff","#a0c4ff","#bdb2ff","#ffc6ff","#fffffc"][k % 9]
  }))).current;

  return (
    <div style={{
      background:"#0d1b2a",
      border:"1px solid rgba(255,255,255,0.15)", borderRadius:10,
      padding:"6px 6px 4px", marginBottom:10, overflow:"hidden"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"0 4px"}}>
        <div style={{fontSize:10,color:"#aaa"}}>🏇 レース実況中継</div>
        <div style={{fontSize:9,color:"#888",display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:"#e74c3c",animation:"pulse 1.5s infinite"}}/>
          LIVE
        </div>
      </div>
      <svg viewBox="0 0 280 168" style={{width:"100%",height:"auto",display:"block",borderRadius:6}}>
        <defs>
          <linearGradient id="rtSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D8FD1"/>
            <stop offset="100%" stopColor="#BFE3F7"/>
          </linearGradient>
          <linearGradient id="rtGrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#79B244"/>
            <stop offset="100%" stopColor="#3E7222"/>
          </linearGradient>
          <linearGradient id="rtDirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9B57C"/>
            <stop offset="100%" stopColor="#B98F55"/>
          </linearGradient>
          <radialGradient id="rtSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF7C0"/>
            <stop offset="60%" stopColor="#FFE066"/>
            <stop offset="100%" stopColor="rgba(255,224,102,0)"/>
          </radialGradient>
        </defs>

        {/* 空・太陽・雲 */}
        <rect x="0" y="0" width="280" height="64" fill="url(#rtSky)"/>
        <circle cx="248" cy="16" r="16" fill="url(#rtSun)"/>
        <circle cx="248" cy="16" r="7" fill="#FFEE99"/>
        <g fill="#fff" opacity="0.85">
          <animateTransform attributeName="transform" type="translate" values="0 0;10 0;0 0" dur="40s" repeatCount="indefinite"/>
          <ellipse cx="46" cy="13" rx="14" ry="5"/>
          <ellipse cx="58" cy="10" rx="10" ry="4"/>
          <ellipse cx="186" cy="18" rx="12" ry="4.5"/>
          <ellipse cx="196" cy="15" rx="8" ry="3.5"/>
        </g>

        {/* メインスタンド（屋根・観客・窓） */}
        <g>
          <polygon points="22,26 258,26 246,16 34,16" fill="#C8C0B0"/>
          <rect x="22" y="24" width="236" height="3" fill="#A89F8C"/>
          <rect x="28" y="26" width="224" height="38" fill="#E8E2D6"/>
          <rect x="28" y="26" width="224" height="20" fill="#3E4A5A"/>
          {crowd.map((c, k) => (
            <circle key={k} cx={c.x} cy={c.y} r="1.7" fill={c.c} opacity="0.9"/>
          ))}
          {Array.from({length:13}).map((_, k) => (
            <rect key={k} x={34 + k * 17} y="48" width="9" height="14" fill="#7D7464" opacity="0.65"/>
          ))}
          <text x="140" y="61" fontSize="6" fill="#5d544a" textAnchor="middle" fontWeight="bold" letterSpacing="2">TOBU NERIMA RACECOURSE</text>
        </g>

        {/* 芝生エリア */}
        <rect x="0" y="64" width="280" height="104" fill="url(#rtGrass)"/>
        <g fill="#2E5D1A">
          <ellipse cx="14" cy="70" rx="13" ry="5"/>
          <ellipse cx="266" cy="70" rx="13" ry="5"/>
        </g>

        {/* ダートコース */}
        <ellipse cx={cx} cy={cy} rx={rx + 29} ry={ry + 24} fill="url(#rtDirt)"/>
        <ellipse cx={cx} cy={cy} rx={rx + 29} ry={ry + 24} fill="none" stroke="#8a6a3c" strokeWidth="1"/>
        {/* レーン区切り（破線） */}
        {[3.5, 10.5, 17.5].map((o, k) => (
          <ellipse key={k} cx={cx} cy={cy} rx={rx + o} ry={ry + o * 0.55} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {/* 白ラチ（内・外） */}
        <ellipse cx={cx} cy={cy} rx={rx + 27} ry={ry + 22} fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.9"/>
        <ellipse cx={cx} cy={cy} rx={rx - 8} ry={ry - 8} fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.95"/>

        {/* インフィールド（池・木・着順掲示板） */}
        <ellipse cx={cx} cy={cy} rx={rx - 9} ry={ry - 9} fill="#5FA838"/>
        <ellipse cx={cx} cy={cy} rx={rx - 9} ry={ry - 9} fill="none" stroke="#4a8a2a" strokeWidth="1"/>
        <ellipse cx={cx - 52} cy={cy + 4} rx="13" ry="4.5" fill="#5BB8E8" stroke="#3E92C0" strokeWidth="0.8"/>
        {[[cx + 40, cy + 3], [cx + 54, cy + 7], [cx + 47, cy - 3]].map(([tx, ty], k) => (
          <g key={k}>
            <rect x={tx - 1} y={ty} width="2" height="5" fill="#6D4C2F"/>
            <circle cx={tx} cy={ty - 2.5} r="4.5" fill="#2F6B1E"/>
            <circle cx={tx - 2.5} cy={ty - 0.5} r="3" fill="#3B7D27"/>
          </g>
        ))}
        {/* 着順掲示板（リアルタイム更新） */}
        <g>
          <rect x={cx - 31} y={cy - 15} width="62" height="22" rx="2" fill="#101820" stroke="#2c3a48" strokeWidth="1"/>
          <text x={cx} y={cy - 8.5} fontSize="5" fill="#9fb4c8" textAnchor="middle">着 順</text>
          {ranks.map((r, k) => (
            <g key={k}>
              <rect x={cx - 26 + k * 13} y={cy - 5} width="10" height="9" rx="1.5" fill={silks[r.idx]}/>
              <text x={cx - 21 + k * 13} y={cy + 1.8} fontSize="6" fill="#fff" textAnchor="middle" fontWeight="bold">{r.idx + 1}</text>
            </g>
          ))}
        </g>

        {/* ゴール板（市松模様）＋GOAL看板 */}
        {(() => {
          const gTop = cy + (ry - 8) + 1;
          const gBot = cy + (ry + 22) - 1;
          const sq = 4;
          const n = Math.ceil((gBot - gTop) / sq);
          return (
            <g>
              {Array.from({length: n}).map((_, k) => (
                <g key={k}>
                  <rect x={cx - 3} y={gTop + k * sq} width="3" height={sq} fill={k % 2 === 0 ? "#fff" : "#111"}/>
                  <rect x={cx} y={gTop + k * sq} width="3" height={sq} fill={k % 2 === 0 ? "#111" : "#fff"}/>
                </g>
              ))}
              <rect x={cx - 9} y={gBot + 1} width="18" height="7" rx="1" fill="#C0392B"/>
              <text x={cx} y={gBot + 6.2} fontSize="4.6" fill="#fff" textAnchor="middle" fontWeight="bold">GOAL</text>
            </g>
          );
        })()}

        {/* 馬（手前を前面に重ね描画・進行方向に向きと傾き） */}
        {renderOrder.map(h => {
          const ev = eventRefs.current[h.i] || {type:"normal"};
          return (
            <g key={h.m.id} transform={`translate(${h.x},${h.y}) rotate(${h.tilt}) scale(${h.flip},1)`}>
              <HorseSprite
                coat={coats[h.i]} silk={silks[h.i]} num={h.i + 1}
                flip={h.flip}
                isMine={myHorseIds.includes(h.m.id)}
                evType={ev.type}/>
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
    @keyframes mbtiHoloSweep {
      0% { background-position: -150% -150%; }
      100% { background-position: 150% 150%; }
    }
    @keyframes mbtiLrRainbow {
      0% { box-shadow: 0 0 18px 4px #ff004c, 0 0 34px 10px #ff004c55; }
      20% { box-shadow: 0 0 18px 4px #ff8c00, 0 0 34px 10px #ff8c0055; }
      40% { box-shadow: 0 0 18px 4px #ffee00, 0 0 34px 10px #ffee0055; }
      60% { box-shadow: 0 0 18px 4px #00e5ff, 0 0 34px 10px #00e5ff55; }
      80% { box-shadow: 0 0 18px 4px #a742ff, 0 0 34px 10px #a742ff55; }
      100% { box-shadow: 0 0 18px 4px #ff004c, 0 0 34px 10px #ff004c55; }
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
  const [editLiveKeypadActive, setEditLiveKeypadActive] = useState(null); // LIVE編集用テンキー
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

  // ---- 麻雀MBTI診断 ----
  const [mbtiResults, setMbtiResults] = useState([]); // Supabase由来、全員分
  const [mbtiStage, setMbtiStage] = useState("intro"); // "intro" | "quiz"
  const [mbtiSubmitting, setMbtiSubmitting] = useState(false);
  const [mbtiRosterOpen, setMbtiRosterOpen] = useState(false);
  const [mbtiRosterExpand, setMbtiRosterExpand] = useState(null);
  const [mbtiAwakenExpand, setMbtiAwakenExpand] = useState(null);
  const mbtiOf = id => mbtiResults.find(r => Number(r.member_id) === Number(id));

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

  async function saveMbtiResult(memberId, code, axes, answers) {
    setMbtiSubmitting(true);
    const { data, error } = await supabase.from("mbti_results").upsert({
      member_id: Number(memberId),
      mbti_code: code,
      axis_ei: axes.ei, axis_sn: axes.sn, axis_tf: axes.tf, axis_jp: axes.jp,
      answers,
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" }).select().single();
    setMbtiSubmitting(false);
    if (error) { showToast("error", `⚠️ 診断結果の保存に失敗しました: ${error.message || error.code}`); return; }
    setMbtiResults(prev => [...prev.filter(r => Number(r.member_id) !== Number(memberId)), data]);
    showToast("success", "🎴 診断結果を保存しました");
    setMbtiStage("intro");
  }

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
      else if(b.bet_type === "sanrenpuku") isHit = [actualResult[0],actualResult[1],actualResult[2]].every(r=>sel.includes(r))&&sel.every(s=>[actualResult[0],actualResult[1],actualResult[2]].includes(s));
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
      const [{ data: mData }, { data: sData }, { data: bData }] = await Promise.all([
        supabase.from("members").select("*").is("deleted_at", null).order("id"),
        supabase.from("sessions").select("*").is("deleted_at", null).order("created_at"),
        supabase.from("mbti_results").select("*"),
      ]);
      if (mData) setMembers(mData);
      if (sData) setSessions(sData);
      if (bData) setMbtiResults(bData);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "mbti_results" }, () => {
        // MBTI診断結果の即時同期
        supabase.from("mbti_results").select("*").then(({data}) => { if (data) setMbtiResults(data); });
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
          else if(b.bet_type==="sanrenpuku") isHit=[actualResult[0],actualResult[1],actualResult[2]].every(r=>sel.includes(r))&&sel.every(s=>[actualResult[0],actualResult[1],actualResult[2]].includes(s));
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
            {(()=>{
              const total = r.players.reduce((s,pid)=>s+N(r.scores[pid]),0);
              const isZero = total === 0;
              return !isZero && <div style={{fontSize:10,color:"#e74c3c",marginBottom:6}}>⚠️ 合計: {total > 0 ? "+" : ""}{total}（0になるよう修正してください）</div>;
            })()}
            {r.players.map(pid => {
              const m = gm(pid); if (!m) return null;
              const ph = (r.photos?.[pid])||[];
              const hasYakuman = r.yakuman && r.yakuman.includes(pid);
              const yakumanType = r.yakumanTypes?.[pid]||"";
              const hasOpenRiichi = r.openRiichi && r.openRiichi.includes(pid);
              const hasDealIn = r.dealIn && r.dealIn.includes(pid);
              const liveKey = `${ri}-${pid}`;
              const isLiveActive = editLiveKeypadActive === liveKey;
              const scVal = String(r.scores[pid] ?? "");
              
              return (
                <div key={pid} style={{background:"rgba(255,255,255,0.04)",borderRadius:6,padding:7,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <Av m={m} sz={24}/>
                    <div style={{fontSize:12,fontWeight:500,flex:1}}>{m.name}</div>
                    <div onClick={()=>setEditLiveKeypadActive(isLiveActive?null:liveKey)}
                      style={{padding:"4px 10px",borderRadius:6,cursor:"pointer",minWidth:60,textAlign:"center",
                        background:isLiveActive?"rgba(231,76,60,0.12)":"rgba(255,255,255,0.06)",
                        border:isLiveActive?"1px solid rgba(231,76,60,0.4)":"1px solid rgba(255,255,255,0.1)"}}>
                      <span style={{fontSize:15,fontWeight:"bold",color:N(scVal)>=0?"#2ecc71":"#e74c3c"}}>
                        {scVal!==""?(N(scVal)>=0?"+":"")+scVal:"入力"}
                      </span>
                    </div>
                  </div>
                  {isLiveActive && (
                    <Keypad value={scVal} onChange={val=>{
                      setAddRounds(prev=>prev.map((rr,idx)=>idx!==ri?rr:{
                        ...rr, scores:{...rr.scores,[pid]:val}
                      }));
                    }}/>
                  )}

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
          <div style={{fontSize:12,fontWeight:500,lineHeight:1.2}}>麻雀スコア表 <span style={{fontSize:9,color:"#666",fontWeight:400}}>v2.0</span></div>
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
          {[["dashboard","📊"],["calendar","🗓"],["history","📅"],["skull","💀"],["sotoba","🏇"],["hilo","🃏"],["shindan","🎴"],["taikai","🎌"],["guide","📖"],["add","➕"],["members","👥"]].map(([t,l])=>{
            const isActive = t==="sotoba"
              ? (tab==="dashboard" && dashSub==="sotoba")
              : t==="hilo"
              ? (tab==="dashboard" && dashSub==="hilo")
              : (tab===t && !(t==="dashboard" && (dashSub==="sotoba" || dashSub==="hilo")));
            return (
              <button key={t} onClick={()=>{
                if(t==="sotoba"){ setTab("dashboard"); setDashSub("sotoba"); }
                else if(t==="hilo"){ setTab("dashboard"); setDashSub("hilo"); }
                else if(t==="guide"){ window.open("https://nerima-night-crew.com/mahjong/","_blank","noopener,noreferrer"); }
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
                <img src="/tshirt.jpg" alt="公式Tシャツ" style={{width:140,height:186,borderRadius:10,objectFit:"cover",display:"block",margin:"0 auto 8px"}}/>
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
                  { key:"sanrenpuku", label:"三連複",  desc:"1〜3位を順不同で", picks:3 },
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
                  else if(raceBetType==="sanrenpuku") currentOdds = calcSanrenpukuOdds(raceSelection[0], raceSelection[1], raceSelection[2], tanshoOdds);
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
                          const betTypeLabel = (k) => ({tansho:"単勝",umaren:"馬連",sanrenpuku:"三連複",yonrentan:"四連単"})[k] || k;
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
                      const betTypeLabelLocal = (k) => ({tansho:"単勝",umaren:"馬連",sanrenpuku:"三連複",yonrentan:"四連単"})[k] || k;
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
                            if(!window.confirm("この半荘を中止しますか？メンバー選択に戻ります。")) return;
                            setRpSc(Object.fromEntries(addSel.map(id=>[id,""])));
                            setRpPhotos({}); setRpYakuman([]); setRpYakumanTypes({}); setRpOpenRiichi([]); setRpDealIn([]); setRpAutoId(null); setRpActive(null); setAddErr("");
                            setAddSel([]); setAddStep(1);
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
        {tab==="shindan" && (
          <div style={{padding:"10px 0"}}>
            {(!raceSelf || isGuestMember(gm(raceSelf))) ? (
              <div style={{...S.card({background:"rgba(255,255,255,0.04)"}), marginBottom:10}}>
                <div style={{fontSize:11,color:"#888",marginBottom:8}}>診断するのはあなたですか？</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                  {members.filter(m=>!isGuestMember(m)).map(m=>(
                    <div key={m.id} onClick={()=>{setRaceSelf(m.id);setMbtiRosterOpen(false);setMbtiRosterExpand(null);}}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",borderRadius:8,cursor:"pointer",
                        background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)"}}>
                      <Av m={m} sz={28}/>
                      <div style={{fontSize:10,color:"#ccc"}}>{m.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : mbtiRosterOpen ? (
              <MbtiCollection
                members={members}
                mbtiResults={mbtiResults}
                sessions={sessions}
                raceBets={raceBets}
                raceSelf={raceSelf}
                onBack={()=>{setMbtiRosterOpen(false);setMbtiRosterExpand(null);setMbtiAwakenExpand(null);}}
                expandId={mbtiRosterExpand}
                onToggleExpand={setMbtiRosterExpand}
                awakenExpandId={mbtiAwakenExpand}
                onToggleAwakenExpand={setMbtiAwakenExpand}
              />
            ) : mbtiStage==="quiz" ? (
              <MbtiQuiz
                onFinish={(code,axes,answers)=>saveMbtiResult(raceSelf,code,axes,answers)}
                onCancel={()=>setMbtiStage("intro")}
              />
            ) : mbtiOf(raceSelf) ? (
              <div>
                <MbtiCard result={mbtiOf(raceSelf)} member={gm(raceSelf)}/>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button style={S.bb({flex:1})} disabled={mbtiSubmitting} onClick={()=>setMbtiStage("quiz")}>🔄 再診断する</button>
                  <button style={S.bg({flex:1})} disabled={mbtiSubmitting} onClick={()=>{setRaceSelf(null);setMbtiRosterOpen(false);setMbtiRosterExpand(null);}}>👤 別の人で診断</button>
                </div>
                <button style={S.bg({width:"100%",marginTop:8})} disabled={mbtiSubmitting} onClick={()=>setMbtiRosterOpen(true)}>🎴 コレクションを見る</button>
                <button style={{...S.bg({width:"100%",marginTop:8}), background:"rgba(6,199,85,0.12)", border:"1px solid rgba(6,199,85,0.5)", color:"#06C755", fontWeight:600}}
                  disabled={mbtiSubmitting}
                  onClick={()=>{
                    const r = mbtiOf(raceSelf);
                    const [typeName, dbName] = MBTI_TYPES[r.mbti_code] || ["?","?"];
                    mbtiShareResult(r.mbti_code, dbName, typeName, ()=>showToast("error","⚠️ 共有に失敗しました"));
                  }}>📤 診断結果をLINEでシェア</button>
                <div style={{fontSize:9.5,color:"#666",textAlign:"center",marginTop:4}}>スマホは画像付きで共有シートが開き、PCはLINEでのテキスト共有が開きます</div>
              </div>
            ) : (
              <div style={{...S.card(), textAlign:"center", padding:24}}>
                <div style={{fontSize:40,marginBottom:8}}>🎴</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>麻雀MBTI診断</div>
                <div style={{fontSize:12,color:"#aaa",marginBottom:16,lineHeight:1.6}}>
                  全32問に答えて、あなたの雀風タイプをドラゴンボールキャラで診断！
                </div>
                <button style={S.br({width:"100%"})} onClick={()=>setMbtiStage("quiz")}>診断をはじめる</button>
              </div>
            )}
          </div>
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
