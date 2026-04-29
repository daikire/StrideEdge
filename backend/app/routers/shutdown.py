import asyncio
import os
import signal
import subprocess
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()

SCRIPT_DIR = Path(__file__).parent.parent.parent.parent
LOCK_FILE = Path("/tmp/strideedge_launcher.lock")


def _kill_by_port(port: int):
    """指定ポートを占有するプロセスを SIGKILL で強制終了（個別 PID kill）"""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"TCP:{port}"],
            capture_output=True, text=True
        )
        for pid_str in result.stdout.strip().split():
            try:
                os.kill(int(pid_str), signal.SIGKILL)
            except (ProcessLookupError, ValueError, OSError):
                pass
    except Exception:
        pass


@router.post("/api/shutdown")
async def shutdown():
    """StrideEdgeを停止する（フロントエンドとバックエンド両方）"""
    # フロントエンド: PID ファイル経由で個別 kill
    # ※ os.killpg() は呼び出し元プロセスグループを巻き込む恐れがあるため使用禁止
    frontend_pid_file = SCRIPT_DIR / "logs" / "frontend.pid"
    if frontend_pid_file.exists():
        try:
            pid = int(frontend_pid_file.read_text().strip())
            os.kill(pid, signal.SIGKILL)
        except (ProcessLookupError, ValueError, OSError):
            pass

    # フォールバック: ポート 3000 を占有するプロセスを直接 kill（npm 子プロセス含む）
    _kill_by_port(3000)

    # ロックファイルを確実に削除
    try:
        LOCK_FILE.unlink()
    except FileNotFoundError:
        pass
    except Exception:
        pass

    # レスポンスを返してからバックエンド自身を停止
    async def _stop():
        await asyncio.sleep(0.5)
        _kill_by_port(8000)  # 自身のポートをポートベースで終了（SIGTERM は不要）

    asyncio.create_task(_stop())
    return {"status": "stopping"}
