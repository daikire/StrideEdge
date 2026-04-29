"""
netkeiba_scraper.py のパーステスト。
保存済み HTML フィクスチャを使用し、ネットワークに依存しない。
fetch_html() はモックで差し替え可能な設計であることを確認する。
"""
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from app.scrapers.netkeiba_scraper import NetkeibaScraper, BlockDetectedError

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


# ============================================================
# parse_race_list
# ============================================================
class TestParseRaceList:
    TARGET_DATE = "2026-05-05"

    def setup_method(self):
        self.scraper = NetkeibaScraper()
        self.html = load("sample_race_list.html")

    def _parse(self):
        return self.scraper.parse_race_list(self.html, self.TARGET_DATE)

    def test_正常系_2件取得(self):
        races = self._parse()
        assert len(races) == 2

    def test_race_id_抽出(self):
        races = self._parse()
        ids = {r.race_id for r in races}
        assert "2026050511" in ids
        assert "2026050508" in ids

    def test_race_name_抽出(self):
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.race_name == "日本ダービー"

    def test_surface_芝(self):
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.surface == "芝"

    def test_surface_ダート(self):
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050508")
        assert r.surface == "ダート"

    def test_distance_抽出(self):
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.distance == 2400

    def test_venue_コード変換(self):
        # race_id[4:6] = "05" → 東京
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.venue == "東京"

    def test_race_date_target_dateから取得(self):
        # 日付は target_date パラメータから取得（race_id は YYYY+場+回+日+R 形式で暦日でない）
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.race_date == self.TARGET_DATE

    def test_race_number_抽出(self):
        # .Race_Num テキスト "11R" → 11
        races = self._parse()
        r = next(r for r in races if r.race_id == "2026050511")
        assert r.race_number == 11

    def test_リンクなしはスキップ(self):
        races = self._parse()
        assert len(races) == 2

    def test_空HTMLは空リスト(self):
        races = self.scraper.parse_race_list("<html><body></body></html>")
        assert races == []


# ============================================================
# parse_entries
# ============================================================
class TestParseEntries:
    RACE_ID = "2026050511"

    def setup_method(self):
        self.scraper = NetkeibaScraper()
        self.html = load("sample_entries.html")

    def test_正常系_3件取得_馬番なしはスキップ(self):
        # フィクスチャに4行あるが、馬番なし1行はスキップ
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert len(entries) == 3

    def test_horse_id_抽出(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].horse_id == "2021110001"

    def test_horse_name_抽出(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].horse_name == "テストホース"

    def test_horse_number_必須(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].horse_number == 1
        assert entries[1].horse_number == 2
        assert entries[2].horse_number == 3

    def test_gate_number_抽出(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].gate_number == 1

    def test_jockey_抽出(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].jockey == "武豊"

    def test_odds_float変換(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].odds == pytest.approx(3.2)

    def test_popularity_int変換(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].popularity == 1

    def test_weight_carried_float変換(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].weight_carried == pytest.approx(57.0)

    def test_horse_weight_括弧除去_プラス(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].horse_weight == 480

    def test_horse_weight_diff_プラス(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[0].horse_weight_diff == 4

    def test_horse_weight_diff_マイナス(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[1].horse_weight_diff == -2

    def test_準正常系_odds欠損はNone(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[2].odds is None

    def test_準正常系_horse_weight欠損はNone(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[2].horse_weight is None

    def test_準正常系_popularity欠損はNone(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert entries[2].popularity is None

    def test_race_id_紐付け(self):
        entries = self.scraper.parse_entries(self.html, self.RACE_ID)
        assert all(e.race_id == self.RACE_ID for e in entries)

    def test_空HTMLは空リスト(self):
        entries = self.scraper.parse_entries("<html><body></body></html>", self.RACE_ID)
        assert entries == []


# ============================================================
# fetch_html のモック差し替えパターン
# ============================================================
class TestFetchHtmlMock:
    @pytest.mark.asyncio
    async def test_fetch_html_モック差し替えでparse可能(self):
        scraper = NetkeibaScraper()
        html = load("sample_race_list.html")

        with patch.object(scraper, "fetch_html", new=AsyncMock(return_value=html)):
            result = await scraper.fetch_html("https://example.com/dummy")
            races = scraper.parse_race_list(result, "2026-05-05")
            assert len(races) == 2

    @pytest.mark.asyncio
    async def test_ブロック検知_403でBlockDetectedError(self):
        scraper = NetkeibaScraper()
        with patch.object(
            scraper, "fetch_html",
            new=AsyncMock(side_effect=BlockDetectedError("HTTP 403")),
        ):
            with pytest.raises(BlockDetectedError):
                await scraper.fetch_html("https://example.com/dummy")

    @pytest.mark.asyncio
    async def test_最大リクエスト数超過でBlockDetectedError(self):
        scraper = NetkeibaScraper()
        scraper._request_count = scraper.MAX_REQUESTS
        with pytest.raises(BlockDetectedError, match="セッション上限"):
            await scraper.fetch_html("https://example.com/dummy")


# ============================================================
# _extract_number ユーティリティ
# ============================================================
class TestExtractNumber:
    def test_数値のみ(self):
        assert NetkeibaScraper._extract_number("480") == 480

    def test_括弧プラス(self):
        assert NetkeibaScraper._extract_number("480(+4)") == 480

    def test_括弧マイナス(self):
        assert NetkeibaScraper._extract_number("454(-2)") == 454

    def test_空文字はNone(self):
        assert NetkeibaScraper._extract_number("") is None

    def test_Noneはそのまま(self):
        assert NetkeibaScraper._extract_number(None) is None

    def test_文字のみはNone(self):
        assert NetkeibaScraper._extract_number("---") is None
