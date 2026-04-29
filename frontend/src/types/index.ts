export type PredictionMode = "conservative" | "standard" | "aggressive";

export type TicketType =
  | "tan"
  | "fuku"
  | "wakuren"
  | "umaren"
  | "wide"
  | "umatan"
  | "sanren_fuku"
  | "sanren_tan";

export type SurfaceType = "turf" | "dirt";

export type RaceStatus = "scheduled" | "in_progress" | "finished";

export interface RaceInfo {
  race_id: string;
  race_name: string;
  race_date: string;
  venue: string;
  race_number: number;
  distance: number;
  surface: SurfaceType;
  grade?: string | null;
  race_class?: string | null;
  prize_money: number;
  status: RaceStatus;
  is_win5?: boolean;
}

export interface CalendarRaceDay {
  race_date: string;
  venue: string;
  grade?: string | null;
  is_win5: number;
  race_count: number;
  race_names: string[];
  race_ids: string[];
}

export interface HorseInfo {
  horse_id: string;
  horse_name: string;
  age?: number | null;
  sex?: string | null;
  trainer?: string | null;
  owner?: string | null;
}

export interface EntryInfo {
  entry_id: string;
  race_id: string;
  horse_id: string;
  horse_number: number;
  gate_number?: number | null;
  jockey?: string | null;
  weight_carried: number;
  odds?: number | null;
  popularity?: number | null;
  recent_results: string;
  horse_weight?: number | null;
  horse_weight_diff: number;
  horse_name?: string | null;
  trainer?: string | null;
  age?: number | null;
  sex?: string | null;
}

export interface ReasonDetail {
  category: string;
  label: string;
  score: number;
  description: string;
}

export interface AnalysisResult {
  race_id: string;
  horse_id: string;
  horse_name: string;
  horse_number: number;
  total_score: number;
  recent_score: number;
  odds_score: number;
  distance_score: number;
  jockey_score: number;
  gate_score: number;
  manual_correction: number;
  odds?: number | null;
  jockey?: string | null;
  reasons: ReasonDetail[];
  warnings: string[];
  rank: number;
}

export interface BuyCandidate {
  horse_numbers: number[];
  label: string;
  expected_return?: number | null;
  confidence: number;
  amount: number;
}

export interface TicketSuggestion {
  race_id: string;
  mode: PredictionMode;
  ticket_type: TicketType;
  candidates: BuyCandidate[];
  total_budget: number;
  summary: string;
  recommendation?: "recommended" | "neutral" | "avoid";
  navigator_reason?: string;
}

export type PassOrPlayLabel = "PLAY" | "WATCH" | "CAUTION" | "PASS";

export interface OverhypedHorse {
  horse_id: string;
  horse_name: string;
  horse_number: number;
  odds: number;
  popularity_rank: number;
  score_rank: number;
  ev_score: number;
  reason: string;
}

export interface EdgeSignal {
  race_id: string;
  label: PassOrPlayLabel;
  label_reason: string;
  ev_ratio: number;
  volatility_index: number;
  top_ev_score: number;
  ev_spread: number;
  overhyped: OverhypedHorse[];
  bet_type_advice: string;
}

export interface TodayEdgeRace {
  race_id: string;
  race_name: string;
  race_number: number;
  venue: string;
  label: PassOrPlayLabel;
  label_reason: string;
  ev_ratio: number;
  top_ev_score: number;
}

export interface TodayEdge {
  date: string;
  race_count: number;
  play_count: number;
  watch_count: number;
  caution_count: number;
  pass_count: number;
  risk_posture: string;
  risk_reason: string;
  top_plays: TodayEdgeRace[];
  all_races: TodayEdgeRace[];
}

export interface DataStatus {
  source_name: string;
  status: "ok" | "warning" | "error";
  last_updated?: string | null;
  record_count: number;
  message: string;
}

export interface RaceResultInput {
  race_id: string;
  first_place: string;
  second_place: string;
  third_place: string;
  fourth_place?: string;
  result_detail?: Record<string, unknown>;
}

export interface PredictionInput {
  race_id: string;
  mode: PredictionMode;
  ticket_type?: TicketType;
  buy_candidates: BuyCandidate[];
  total_budget: number;
  memo: string;
}

export interface PredictionResponse {
  id: number;
  race_id: string;
  race_name?: string | null;
  mode: string;
  ticket_type?: string | null;
  buy_candidates: BuyCandidate[];
  total_budget: number;
  memo: string;
  created_at: string;
}

export interface RaceResultResponse {
  id: number;
  race_id: string;
  race_name?: string;
  race_date?: string;
  venue?: string;
  first_place: string;
  second_place: string;
  third_place: string;
  fourth_place?: string;
  registered_at: string;
}

export interface SettingsModel {
  weight_recent_results: number;
  weight_odds: number;
  weight_distance: number;
  weight_jockey: number;
  weight_gate: number;
  weight_manual: number;
  default_mode: string;
  target_min_odds: number;
  target_max_odds: number;
  budget_per_race: number;
  enable_notifications: boolean;
  dark_mode: boolean;
  notify_mac: boolean;
  notify_email: boolean;
  notification_email: string;
  gmail_app_password: string;
  alarm_minutes_before: number;
}

export interface RoiRecord {
  id: number;
  race_id: string;
  race_name: string;
  race_date: string;
  venue: string;
  ticket_type: string;
  mode: string;
  total_budget: number;
  has_result: boolean;
  hit: boolean;
  first_place?: string | null;
}

export interface RoiSummary {
  total_budget: number;
  prediction_count: number;
  result_count: number;
  hit_count: number;
  hit_rate: number | null;
}

export interface RoiData {
  summary: RoiSummary;
  by_ticket: Record<string, { count: number; budget: number; hits: number }>;
  by_date: [string, number][];
  records: RoiRecord[];
}

export interface AlarmCreate {
  race_id: string;
  race_name: string;
  race_date: string;
  race_time: string;
  minutes_before: number;
  notify_mac: boolean;
  notify_email: boolean;
}

export interface AlarmResponse {
  id: number;
  race_id: string;
  race_name: string;
  race_date: string;
  race_time: string;
  minutes_before: number;
  notify_mac: boolean;
  notify_email: boolean;
  fired: boolean;
  created_at: string;
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  tan: "単勝",
  fuku: "複勝",
  wakuren: "枠連",
  umaren: "馬連",
  wide: "ワイド",
  umatan: "馬単",
  sanren_fuku: "3連複",
  sanren_tan: "3連単",
};

export const MODE_LABELS: Record<PredictionMode, string> = {
  conservative: "堅め",
  standard: "標準",
  aggressive: "穴狙い",
};

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  turf: "芝",
  dirt: "ダート",
};

export interface DailyRacePrediction {
  race: RaceInfo;
  favorites: AnalysisResult[];
  dark_horses: AnalysisResult[];
  tickets: TicketSuggestion[];
  win5_pick: AnalysisResult | null;
}
