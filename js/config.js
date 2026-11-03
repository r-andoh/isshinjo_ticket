/**
 * チケット予約フォーム 設定ファイル (config.js)
 * 
 * 公演情報やGoogleフォームの連携IDを一元管理します。
 * 公演：ジェットラグプロデュース『一身上の都合により』
 */

const FORM_CONFIG = {
  // バージョン情報 (v[メジャー].[プッシュ回数].[Antigravity修正回数])
  version: "v1.15.0",

  // ==========================================
  // 1. Google フォーム連携設定
  // ==========================================
  
  // Googleフォームの formResponse エンドポイントURL
  // フォームタイトル: 『一身上の都合により』（安藤専用予約フォーム）
  formActionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdw0_UtzOf3LKsyLGOaHzEbP8a4TEv7OCbClZ0QVamz_tzG9A/formResponse",

  // モックモード（本番稼働）
  isMockMode: false,

  // 各入力項目とGoogleフォームの entry ID の対応表（全7項目）
  fields: {
    name: "entry.2100160247",         // お名前
    furigana: "entry.1689145255",     // フリガナ
    email: "entry.1389300706",        // メールアドレス
    schedule: "entry.727708549",       // 観劇日時
    ticketType: "entry.1948786286",   // 券種（一般 / プレミアム）
    ticketCount: "entry.1258909965",  // チケット枚数
    message: "entry.438285804"        // 備考
  },

  // ==========================================
  // 2. 公演・イベント基本情報 (ジェットラグ)
  // ==========================================
  eventInfo: {
    // 主催・公演タイトル
    organizer: "ジェットラグプロデュース",
    title: "一身上の都合により",
    subtitle: "安藤理樹扱い専用 チケット予約フォーム",
    credits: "作・演出：山崎洋平",

    // デフォルトの扱い窓口（出演者名）
    defaultPerformer: "安藤理樹",

    // 公演日程
    dates: "2026年11月25日(水)〜29日(日)",

    // 劇場・会場情報
    venue: "新宿シアタートップス",
    venueAddress: "東京都新宿区新宿3丁目20-8 WaMall TOPS HOUSE ビル4階",
    venueAccess: "JR・小田急線・京王線「新宿駅」東口 徒歩5分 ／ 東京メトロ「新宿三丁目駅」B9出口 徒歩1分",
    venueMapUrl: "https://maps.google.com/?q=新宿シアタートップス",

    // 券種・料金情報（当窓口は一般指定席のみ）
    ticketTypes: [
      { id: "general", label: "一般指定席", price: "7,500円 (税込)", priceNum: 7500 }
    ],
    ticketPriceSummary: "一般 7,500円 ／ プレミアム 9,500円（全席指定・税込）",

    // 1回の申込における最大予約枚数
    maxTickets: 4,

    // 公演日程一覧 (2026年11月25日(水)〜11月29日(日) 全9ステージ)
    // 各公演前日の23:59:59まで予約可能
    schedules: [
      { id: "s1", label: "2026年11月25日(水) 19:00開演", deadline: "2026-11-24T23:59:59+09:00", available: true },
      { id: "s2", label: "2026年11月26日(木) 14:00開演", deadline: "2026-11-25T23:59:59+09:00", available: true },
      { id: "s3", label: "2026年11月26日(木) 19:00開演", deadline: "2026-11-25T23:59:59+09:00", available: true },
      { id: "s4", label: "2026年11月27日(金) 14:00開演", deadline: "2026-11-26T23:59:59+09:00", available: true },
      { id: "s5", label: "2026年11月27日(金) 19:00開演", deadline: "2026-11-26T23:59:59+09:00", available: true },
      { id: "s6", label: "2026年11月28日(土) 13:00開演", deadline: "2026-11-27T23:59:59+09:00", available: true },
      { id: "s7", label: "2026年11月28日(土) 17:00開演", deadline: "2026-11-27T23:59:59+09:00", available: true },
      { id: "s8", label: "2026年11月29日(日) 13:00開演", deadline: "2026-11-28T23:59:59+09:00", available: true },
      { id: "s9", label: "2026年11月29日(日) 17:00開演", deadline: "2026-11-28T23:59:59+09:00", available: true }
    ],

    // 受付・ご来場に関する注意事項
    notices: [
      '本フォームは、安藤理樹が独自に作成管理している予約受付窓口です。個人受付が気になる方は公式プレイガイド（<a href="https://www.confetti-web.com/events/17419" target="_blank" rel="noopener noreferrer">カンフェティ</a> ／ <a href="https://t.pia.jp/pia/event/event.do?eventCd=2632238" target="_blank" rel="noopener noreferrer">チケットぴあ</a>）よりお買い求めください。',
      "本フォーム送信時点では予約は【仮予約】となります。残席状況を確認後、担当者より確定メールをお送りいたします。",
      "受付開始は開演の40分前、客席開場は開演の30分前です。",
      "開演時間を過ぎてのご来場は、指定のお席にご案内できない場合がございます。",
      "未就学児童のご入場はご遠慮いただいております。",
      "ご入力いただいた個人情報（お名前・メールアドレス等）は、本公演のチケット予約管理およびご案内連絡のみに使用し、公演終了後に適切に削除・破棄いたします。"
    ],

    // 公式サイト・問い合わせ
    officialUrl: "http://www.jetlag.jp/",
    contactEmail: "info@jetlag.jp"
  }
};

// グローバルスコープへ公開
if (typeof window !== "undefined") {
  window.FORM_CONFIG = FORM_CONFIG;
}
