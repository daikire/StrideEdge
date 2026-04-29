"""Mac通知 + Gmail通知サービス"""
import subprocess
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


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


def notify_email(
    to_email: str,
    app_password: str,
    subject: str,
    body: str,
    from_email: str = "",
) -> bool:
    if not to_email or not app_password:
        print("[通知] メール設定が未入力のためスキップ")
        return False
    sender = from_email or to_email
    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(sender, app_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[通知] メール送信失敗: {e}")
        return False


def send_race_alarm(
    race_name: str,
    race_date: str,
    race_time: str,
    minutes_before: int,
    notify_mac_flag: bool,
    notify_email_flag: bool,
    to_email: str,
    app_password: str,
):
    title = "🏇 StrideEdge アラーム"
    body = (
        f"{race_name}\n"
        f"発走 {race_time} まであと {minutes_before} 分です！\n"
        f"開催日: {race_date}"
    )
    subject = f"【StrideEdge】{race_name} 発走{minutes_before}分前"

    if notify_mac_flag:
        notify_mac(title, body)
    if notify_email_flag:
        notify_email(to_email, app_password, subject, body)
