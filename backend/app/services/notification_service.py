"""Mac通知サービス（Gmail機能は凍結）"""
import subprocess


def notify_mac(title: str, body: str) -> bool:
    try:
        safe_title = title.replace('"', "'")
        safe_body = body.replace('"', "'")
        script = (
            f'display notification "{safe_body}" '
            f'with title "{safe_title}" '
            f'sound name "Blow"'
        )
        subprocess.run(["osascript", "-e", script], check=True, timeout=5)
        return True
    except Exception as e:
        print(f"[通知] Mac通知失敗: {e}")
        return False


def send_race_alarm(
    race_name: str,
    race_date: str,
    race_time: str,
    minutes_before: int,
    notify_mac_flag: bool,
    notify_email_flag: bool = False,  # Gmail凍結中 — 使用しない
    to_email: str = "",               # Gmail凍結中 — 使用しない
    app_password: str = "",           # Gmail凍結中 — 使用しない
):
    title = "🏇 StrideEdge アラーム"
    body = (
        f"{race_name}\n"
        f"発走 {race_time} まであと {minutes_before} 分です！\n"
        f"開催日: {race_date}"
    )
    if notify_mac_flag:
        notify_mac(title, body)
