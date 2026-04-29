"""
shutdown エンドポイントの IP ガードテスト。
ローカルホスト以外からのリクエストは 403 を返すことを確認する。
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_shutdown_許可_127001():
    """127.0.0.1 からのリクエストは shutdown が実行される（2xx or 5xx）"""
    transport = ASGITransport(app=app, client=("127.0.0.1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.shutdown._kill_by_port"), \
             patch("asyncio.create_task"):
            resp = await client.post("/api/shutdown")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_shutdown_許可_IPv6ループバック():
    """::1 からのリクエストは shutdown が実行される"""
    transport = ASGITransport(app=app, client=("::1", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.shutdown._kill_by_port"), \
             patch("asyncio.create_task"):
            resp = await client.post("/api/shutdown")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_shutdown_拒否_外部IP():
    """外部 IP（例: 192.168.1.100）からのリクエストは 403 を返す"""
    transport = ASGITransport(app=app, client=("192.168.1.100", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/shutdown")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_shutdown_拒否_パブリックIP():
    """パブリック IP（例: 1.2.3.4）からのリクエストは 403 を返す"""
    transport = ASGITransport(app=app, client=("1.2.3.4", 0))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/shutdown")
    assert resp.status_code == 403
