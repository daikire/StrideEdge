import {
  RaceInfo,
  EntryInfo,
  AnalysisResult,
  TicketSuggestion,
  PredictionMode,
  PredictionInput,
  PredictionResponse,
  RaceResultInput,
  RaceResultResponse,
  SettingsModel,
  DailyRacePrediction,
  CalendarRaceDay,
  AlarmCreate,
  AlarmResponse,
  RoiData,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ManualCorrectionInput {
  horse_id: string;
  correction_value: number;
  reason?: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error ${res.status}: ${errorText}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[API] ${path}`, err);
    throw err;
  }
}

// ---- Races ----

export async function fetchRaceDates(): Promise<string[]> {
  const data = await fetchApi<{ dates: string[] }>("/api/races/dates");
  return data.dates;
}

export async function fetchRaces(date?: string): Promise<RaceInfo[]> {
  const query = date ? `?date=${date}` : "";
  return fetchApi<RaceInfo[]>(`/api/races${query}`);
}

export async function fetchRace(raceId: string): Promise<RaceInfo> {
  return fetchApi<RaceInfo>(`/api/races/${raceId}`);
}

export async function fetchEntries(raceId: string): Promise<EntryInfo[]> {
  return fetchApi<EntryInfo[]>(`/api/races/${raceId}/entries`);
}

// ---- Analysis ----

export async function fetchAnalysis(
  raceId: string,
  mode: PredictionMode = "standard"
): Promise<AnalysisResult[]> {
  return fetchApi<AnalysisResult[]>(`/api/analysis/${raceId}?mode=${mode}`);
}

export async function fetchTicketSuggestions(
  raceId: string,
  mode: PredictionMode = "standard",
  budget: number = 3000
): Promise<TicketSuggestion[]> {
  return fetchApi<TicketSuggestion[]>(
    `/api/analysis/${raceId}/tickets?mode=${mode}&budget=${budget}`
  );
}

export async function postManualCorrection(
  raceId: string,
  data: ManualCorrectionInput
): Promise<void> {
  await fetchApi(`/api/analysis/${raceId}/manual-correction`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- History ----

export async function fetchPredictions(): Promise<PredictionResponse[]> {
  return fetchApi<PredictionResponse[]>("/api/predictions");
}

export async function savePrediction(
  data: PredictionInput
): Promise<{ id: number; message: string }> {
  return fetchApi("/api/predictions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchResults(): Promise<RaceResultResponse[]> {
  return fetchApi<RaceResultResponse[]>("/api/results");
}

export async function saveResult(
  data: RaceResultInput
): Promise<{ id: number; message: string }> {
  return fetchApi("/api/results", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Daily Predictions ----

export async function fetchDailyPredictions(
  date?: string,
  mode: PredictionMode = "standard",
  budget: number = 3000
): Promise<DailyRacePrediction[]> {
  const params = new URLSearchParams({ mode, budget: String(budget) });
  if (date) params.set("date", date);
  return fetchApi<DailyRacePrediction[]>(`/api/predictions/daily?${params}`);
}

// ---- Calendar ----

export async function fetchCalendar(
  year: number,
  month: number
): Promise<{ year: number; month: number; race_days: CalendarRaceDay[] }> {
  return fetchApi(`/api/races/calendar/${year}/${month}`);
}

// ---- Settings ----

export async function fetchSettings(): Promise<SettingsModel> {
  return fetchApi<SettingsModel>("/api/settings");
}

export async function updateSettings(data: SettingsModel): Promise<SettingsModel> {
  return fetchApi<SettingsModel>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ---- Memos ----

export async function fetchMemo(raceId: string): Promise<string> {
  const data = await fetchApi<{ memo: string }>(`/api/memos/${raceId}`);
  return data.memo;
}

export async function saveMemo(raceId: string, memo: string): Promise<void> {
  await fetchApi(`/api/memos/${raceId}`, {
    method: "PUT",
    body: JSON.stringify({ memo }),
  });
}

// ---- ROI ----

export async function fetchRoi(): Promise<RoiData> {
  return fetchApi<RoiData>("/api/roi");
}

// ---- Alarms ----

export async function fetchAlarms(): Promise<AlarmResponse[]> {
  return fetchApi<AlarmResponse[]>("/api/alarms");
}

export async function createAlarm(data: AlarmCreate): Promise<AlarmResponse> {
  return fetchApi<AlarmResponse>("/api/alarms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAlarm(alarmId: number): Promise<void> {
  await fetchApi(`/api/alarms/${alarmId}`, { method: "DELETE" });
}

export async function testNotification(): Promise<{ message: string }> {
  return fetchApi("/api/alarms/test", { method: "POST" });
}

// ---- Sync ----

export type SyncLog = {
  id: number;
  target_date: string;
  url: string;
  status: string;
  races_fetched: number;
  entries_fetched: number;
  error_message: string | null;
  scraped_at: string;
};

export type SyncResult = {
  status: string;
  races_fetched: number;
  entries_fetched: number;
  errors: string[];
};

export async function fetchSyncLogs(limit = 20): Promise<SyncLog[]> {
  const data = await fetchApi<{ logs: SyncLog[] }>(`/api/sync/logs?limit=${limit}`);
  return data.logs;
}

export async function triggerSync(date: string): Promise<SyncResult> {
  return fetchApi<SyncResult>(`/api/sync/races?date=${date}`, { method: "POST" });
}
