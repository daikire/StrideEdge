"""
sync エンドポイントの結合テスト（integration test）。
data_sync_service をモックし、APIの入力バリデーション・レスポンス形式を検証する。
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app


class _FakeSyncResult:
    status = "success"
    races_fetched = 3
    entries_fetched = 24
    errors = []


@pytest.mark.asyncio
async def test_sync_日付バリデーション_正常():
    """正しい日付形式 YYYY-MM-DD を受け付ける"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.sync.sync_races", new=AsyncMock(return_value=_FakeSyncResult())):
            resp = await client.post("/api/sync/races", params={"date": "2026-05-04"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["races_fetched"] == 3
    assert data["entries_fetched"] == 24


@pytest.mark.asyncio
async def test_sync_日付バリデーション_不正():
    """YYYY-MM-DD 以外の形式は 400 を返す"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/sync/races", params={"date": "20260504"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_sync_同時実行_409():
    """sync 実行中に再度リクエストすると 409 を返す"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch(
            "app.routers.sync.sync_races",
            new=AsyncMock(side_effect=RuntimeError("already running")),
        ):
            resp = await client.post("/api/sync/races", params={"date": "2026-05-04"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_sync_logs_取得():
    """GET /api/sync/logs は logs キーを含むレスポンスを返す"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/sync/logs", params={"limit": 5})
    assert resp.status_code == 200
    assert "logs" in resp.json()


@pytest.mark.asyncio
async def test_sync_logs_limit_バリデーション():
    """limit に 0 以下を指定すると 422 を返す"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/sync/logs", params={"limit": 0})
    assert resp.status_code == 422
