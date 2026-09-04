import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from typing import TypedDict

logger = logging.getLogger("callcraft.email")


class MailConfig(TypedDict):
    host: str
    port: int
    username: str
    password: str
    encryption: str
    from_address: str
    from_name: str
    web_url: str


def get_mail_config() -> MailConfig:
    return {
        "host": os.getenv("MAIL_HOST", "flyup.id"),
        "port": int(os.getenv("MAIL_PORT", "465")),
        "username": os.getenv("MAIL_USERNAME", "callcraft@flyup.id"),
        "password": os.getenv("MAIL_PASSWORD", "gv%]Sxx%_WR(c]5R").strip("'\""),
        "encryption": os.getenv("MAIL_ENCRYPTION", "ssl").lower(),
        "from_address": os.getenv("MAIL_FROM_ADDRESS", "callcraft@flyup.id").strip("'\""),
        "from_name": os.getenv("MAIL_FROM_NAME", "CallCraft").strip("'\""),
        "web_url": os.getenv("NEXTAUTH_URL", "http://localhost:3000"),
    }


def send_verification_email(to_email: str, full_name: str, verification_token: str, otp_code: str = "") -> bool:
    """
    Sends HTML activation email via SMTP with direct verification link.
    """
    config = get_mail_config()
    verify_link = f"{config['web_url']}/verify-email?token={verification_token}&email={to_email}"

    subject = "Aktivasi Akun & Verifikasi Email - CallCraft AI"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verifikasi Email - CallCraft AI</title>
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0a08; color: #edd6bb; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #17120e; border: 1px solid rgba(237, 214, 187, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(237, 214, 187, 0.15); }}
        .logo {{ font-size: 24px; font-weight: 800; color: #e1b329; letter-spacing: -0.5px; }}
        .content {{ padding: 30px 0; font-size: 14px; line-height: 1.6; color: #d4c5b3; }}
        .greeting {{ font-size: 18px; font-weight: 700; color: #edd6bb; margin-bottom: 16px; }}
        .btn {{ display: inline-block; background-color: #e1b329; color: #0c0a08; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 14px; text-align: center; margin: 24px 0; }}
        .footer {{ font-size: 11px; color: #8b7e6d; text-align: center; padding-top: 24px; border-top: 1px solid rgba(237, 214, 187, 0.15); }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✨ CallCraft AI</div>
        </div>
        <div class="content">
          <div class="greeting">Halo {full_name},</div>
          <p>Terima kasih telah mendaftar di <strong>CallCraft AI Execution Gateway</strong>. Silakan klik tombol di bawah untuk mengaktifkan akun Anda dan mengakses Dashboard:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_link}" class="btn" target="_blank">Aktivasi Akun Sekarang</a>
          </div>

          <p style="font-size: 12px; color: #8b7e6d;">Atau salin tautan verifikasi berikut di browser Anda:<br>
          <a href="{verify_link}" style="color: #e1b329; word-break: break-all;">{verify_link}</a></p>
        </div>
        <div class="footer">
          Jika Anda tidak merasa melakukan pendaftaran di CallCraft, abaikan email ini.<br>
          &copy; 2026 CallCraft Multimodal Gateway. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_address']}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        host = config["host"]
        port = config["port"]
        encryption = config["encryption"]
        username = config["username"]
        password = config["password"]
        from_address = config["from_address"]

        logger.info(f"Connecting to SMTP server {host}:{port} for {to_email}...")

        if port == 465 or encryption in ["ssl", "tls"]:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            if encryption == "starttls":
                server.starttls()

        server.login(username, password)
        server.sendmail(from_address, [to_email], msg.as_string())
        server.quit()
        
        logger.info(f"Verification email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> bool:
    """
    Sends HTML password reset email via SMTP with direct reset link.
    """
    config = get_mail_config()
    reset_link = f"{config['web_url']}/reset-password?token={reset_token}&email={to_email}"

    subject = "Reset Password Akun - CallCraft AI"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Password - CallCraft AI</title>
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0a08; color: #edd6bb; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #17120e; border: 1px solid rgba(237, 214, 187, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(237, 214, 187, 0.15); }}
        .logo {{ font-size: 24px; font-weight: 800; color: #e1b329; letter-spacing: -0.5px; }}
        .content {{ padding: 30px 0; font-size: 14px; line-height: 1.6; color: #d4c5b3; }}
        .greeting {{ font-size: 18px; font-weight: 700; color: #edd6bb; margin-bottom: 16px; }}
        .btn {{ display: inline-block; background-color: #e1b329; color: #0c0a08; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 14px; text-align: center; margin: 24px 0; }}
        .footer {{ font-size: 11px; color: #8b7e6d; text-align: center; padding-top: 24px; border-top: 1px solid rgba(237, 214, 187, 0.15); }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✨ CallCraft AI</div>
        </div>
        <div class="content">
          <div class="greeting">Halo {full_name},</div>
          <p>Kami menerima permintaan untuk mereset password akun CallCraft Anda. Silakan klik tombol di bawah untuk membuat password baru:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" class="btn" target="_blank">Reset Password Saya</a>
          </div>

          <p style="font-size: 12px; color: #8b7e6d;">Tautan ini berlaku selama 1 jam. Atau salin tautan reset password berikut ke browser Anda:<br>
          <a href="{reset_link}" style="color: #e1b329; word-break: break-all;">{reset_link}</a></p>
        </div>
        <div class="footer">
          Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tetap aman.<br>
          &copy; 2026 CallCraft Multimodal Gateway. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_address']}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        host = config["host"]
        port = config["port"]
        encryption = config["encryption"]
        username = config["username"]
        password = config["password"]
        from_address = config["from_address"]

        logger.info(f"Connecting to SMTP server {host}:{port} for password reset email to {to_email}...")

        if port == 465 or encryption in ["ssl", "tls"]:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            if encryption == "starttls":
                server.starttls()

        server.login(username, password)
        server.sendmail(from_address, [to_email], msg.as_string())
        server.quit()

        logger.info(f"Password reset email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False

