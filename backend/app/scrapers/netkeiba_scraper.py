"""
netkeiba.com スクレイパー

設計原則:
  - fetch_html() と parse_*() を完全分離 → テスト時は fetch_html をモック差し替え
  - 文字列→数値変換は ScrapedEntry / ScrapedRace の Pydantic バリデーターで完結
  - リクエスト間隔は必ず 1〜3 秒のランダム sleep（通信制限対策）
"""

import asyncio
import logging
import random
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.models.scraper_models import ScrapedEntry, ScrapedRace

logger = logging.getLogger(__name__)

# netkeiba 開催場コード → 場名マッピング
_VENUE_MAP = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


class BlockDetectedError(Exception):
    """IP ブロックまたは予期しないリダイレクトを検知した際に raise"""


class NetkeibaScraper:
    MAX_REQUESTS = 150

    def __init__(self) -> None:
        self._request_count = 0

    # ------------------------------------------------------------------
    # fetch layer — HTTP 通信のみ。パースロジックを含まない
    # ------------------------------------------------------------------

    async def fetch_html(self, url: str) -> str:
        """URL の HTML を取得して返す。テスト時はこのメソッドをモック差し替え可能。"""
        if self._request_count >= self.MAX_REQUESTS:
            raise BlockDetectedError(
                f"1 セッション上限 ({self.MAX_REQUESTS} req) に達しました"
            )

        async with httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=False,
            timeout=30.0,
        ) as client:
            response = await client.get(url)

        if response.status_code == 403:
            raise BlockDetectedError(f"HTTP 403 を検知しました: {url}")
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            raise BlockDetectedError(f"予期しないリダイレクトを検知しました: {url}")

        response.raise_for_status()
        self._request_count += 1

        await self._random_sleep()
        return self._decode_bytes(response.content)

    @staticmethod
    def _decode_bytes(content: bytes) -> str:
        """UTF-8 で試み、失敗時は EUC-JP にフォールバック（shutuba.html 対応）"""
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("euc-jp", errors="replace")

    async def _random_sleep(self) -> None:
        """通信制限対策: 1〜3 秒のランダム待機（必須）"""
        delay = random.uniform(1.0, 3.0)
        logger.debug("sleep %.2f 秒", delay)
        await asyncio.sleep(delay)

    # ------------------------------------------------------------------
    # parse layer — HTML 文字列を受け取り Pydantic モデルのリストを返す
    # ------------------------------------------------------------------

    # CSS selectors tried in order; first match wins (fallback for HTML structure changes)
    _RACE_ITEM_SELECTORS = [
        ".RaceList_DataItem",
        "[class*='RaceList_DataItem']",
        "li.RaceList_DataItem",
        ".race_list_item",
    ]
    _ENTRY_ROW_SELECTORS = [
        "tr.HorseList",
        "tr.Horse_Info",
        "tr[class*='HorseList']",
        "tr[class*='Horse_Info']",
    ]

    def parse_race_list(self, html: str, target_date: str = "") -> list[ScrapedRace]:
        """レース一覧ページ HTML → ScrapedRace のリスト"""
        soup = BeautifulSoup(html, "html.parser")
        races: list[ScrapedRace] = []

        items = []
        for sel in self._RACE_ITEM_SELECTORS:
            items = soup.select(sel)
            if items:
                logger.debug("parse_race_list: selector '%s' matched %d items", sel, len(items))
                break

        if not items:
            logger.warning("parse_race_list: no race items found (all selectors exhausted)")

        for item in items:
            try:
                race = self._parse_race_item(item, target_date)
                if race:
                    races.append(race)
            except Exception as exc:
                logger.warning("レースアイテムのパース失敗: %s", exc)

        return races

    def parse_entries(self, html: str, race_id: str) -> list[ScrapedEntry]:
        """出走表ページ HTML → ScrapedEntry のリスト"""
        soup = BeautifulSoup(html, "html.parser")
        entries: list[ScrapedEntry] = []

        rows = []
        for sel in self._ENTRY_ROW_SELECTORS:
            rows = soup.select(sel)
            if rows:
                logger.debug("parse_entries: selector '%s' matched %d rows", sel, len(rows))
                break

        if not rows:
            logger.warning("parse_entries: no horse rows found (race_id=%s, all selectors exhausted)", race_id)

        for row in rows:
            try:
                entry = self._parse_entry_row(row, race_id)
                if entry:
                    entries.append(entry)
            except Exception as exc:
                logger.warning("出走馬行のパース失敗 (race_id=%s): %s", race_id, exc)

        return entries

    # ------------------------------------------------------------------
    # private helpers
    # ------------------------------------------------------------------

    def _parse_race_item(self, item, target_date: str = "") -> Optional[ScrapedRace]:
        link = item.select_one("a[href*='race_id']")
        if not link:
            return None

        m = re.search(r"race_id=(\d+)", link.get("href", ""))
        if not m:
            return None
        race_id = m.group(1)

        # race name — try multiple selectors for structural resilience
        race_name = ""
        for name_sel in (
            ".RaceList_ItemTitle .ItemTitle",
            ".ItemTitle",
            ".RaceList_Name",
            ".race_name",
            "h3",
        ):
            tag = item.select_one(name_sel)
            if tag:
                race_name = tag.text.strip()
                break

        # long info line (surface / distance)
        long_tag = None
        for long_sel in (".RaceList_ItemLong", ".RaceList_ItemLongDetail", ".RaceData"):
            long_tag = item.select_one(long_sel)
            if long_tag:
                break
        long_text = long_tag.text.strip() if long_tag else ""

        # surface — CSS class Dart / Turf, fallback to text keywords
        long_classes = long_tag.get("class", []) if long_tag else []
        if "Dart" in long_classes or "dart" in long_classes:
            surface = "ダート"
        elif "ダート" in long_text or "D" in long_text[:4]:
            surface = "ダート"
        else:
            surface = "芝"

        dist_m = re.search(r"(\d{3,4})m", long_text)
        distance = int(dist_m.group(1)) if dist_m else 0

        venue_code = race_id[4:6] if len(race_id) >= 6 else ""
        venue = _VENUE_MAP.get(venue_code, venue_code)

        # race_id の日付部分は開催回・日目のエンコードであり暦日と一致しない
        # → target_date パラメータ（YYYY-MM-DD）を使用する
        race_date = target_date

        # race number — try .Race_Num, .RaceNum, data-race-no attribute
        race_num_tag = item.select_one(".Race_Num") or item.select_one(".RaceNum")
        race_num_text = race_num_tag.get_text(strip=True) if race_num_tag else ""
        if not race_num_text:
            race_num_text = item.get("data-race-no", "")
        race_num_m = re.search(r"(\d+)R?", race_num_text)
        race_number = (
            int(race_num_m.group(1)) if race_num_m
            else (int(race_id[-2:]) if len(race_id) >= 2 else 0)
        )

        return ScrapedRace(
            race_id=race_id,
            race_name=race_name,
            race_date=race_date,
            venue=venue,
            race_number=race_number,
            distance=distance,
            surface=surface,
        )

    def _parse_entry_row(self, row, race_id: str) -> Optional[ScrapedEntry]:
        horse_link = row.select_one("a[href*='/horse/']")
        if not horse_link:
            return None
        m = re.search(r"/horse/(\d+)", horse_link.get("href", ""))
        if not m:
            return None
        horse_id = m.group(1)
        horse_name = horse_link.text.strip()

        # 馬番: class="UmabanN"（N は馬番数字）
        umaban_td = row.select_one("td[class*='Umaban']")
        horse_number = self._int_or_none(umaban_td)
        if horse_number is None:
            return None  # 馬番は必須

        # 枠番: class="WakuN Txt_C"（N は枠番数字）
        waku_td = row.select_one("td[class*='Waku']")
        gate_number = self._int_or_none(waku_td)

        jockey_link = row.select_one("a[href*='/jockey/']")
        jockey = jockey_link.text.strip() if jockey_link else None

        # 斤量: td.Barei の直後の td（専用クラスなし）
        barei_td = row.select_one("td.Barei")
        futan_td = barei_td.find_next_sibling("td") if barei_td else None
        weight_carried_raw = futan_td.get_text(strip=True) if futan_td else None

        horse_weight_raw = self._cell_text(row, "td.Weight")

        # オッズ: td.Popular.Txt_R / 人気: td.Popular_Ninki
        odds_td = row.select_one("td.Popular.Txt_R")
        odds_raw = odds_td.get_text(strip=True) if odds_td else None
        ninki_td = row.select_one("td.Popular_Ninki")
        popularity_raw = ninki_td.get_text(strip=True) if ninki_td else None

        return ScrapedEntry(
            race_id=race_id,
            horse_id=horse_id,
            horse_name=horse_name,
            horse_number=horse_number,
            gate_number=gate_number,
            jockey=jockey,
            weight_carried=weight_carried_raw,
            odds=odds_raw,
            popularity=popularity_raw,
            # 同じ生文字列を渡す。各フィールドの validator が異なる部分を抽出する
            horse_weight=horse_weight_raw,
            horse_weight_diff=horse_weight_raw,
        )

    @staticmethod
    def _cell_text(row, selector: str) -> Optional[str]:
        tag = row.select_one(selector)
        return tag.text.strip() if tag else None

    @staticmethod
    def _int_or_none(tag) -> Optional[int]:
        if tag is None:
            return None
        try:
            return int(tag.text.strip())
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _extract_number(text: str) -> Optional[int]:
        """'480(+4)' → 480  （共通ユーティリティ）"""
        if not text:
            return None
        m = re.match(r"^(\d+)", text.strip())
        return int(m.group(1)) if m else None
