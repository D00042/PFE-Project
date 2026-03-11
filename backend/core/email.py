import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587
SMTP_USER     = "maryemgassri3@gmail.com"   # ← replace
SMTP_PASSWORD = "hxho ukmy bnmp wxsx"      # ← replace
FROM_EMAIL    = "noreply@tui.com"

DASHBOARD_LABELS = {
    "profitability": "Profitability",
    "balance_sheet": "Balance Sheet",
    "liquidity":     "Liquidity Analysis",
    "dpo_dso":       "DPO & DSO",
}


def send_reset_email(email: str, token: str):
    reset_link = f"http://localhost:5173/reset-password/{token}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset – TUI Financial Platform"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = email
    body = f"""
    <html><body>
      <p>Hello,</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="{reset_link}">{reset_link}</a></p>
      <p>If you did not request this, ignore this email.</p>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))
    _send(email, msg)


def send_password_changed_email(email: str, full_name: str = ""):
    name = full_name or email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your password was changed – TUI Financial Platform"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = email
    body = f"""
    <html><body style="font-family:sans-serif;color:#1a2b4a;">
      <h2 style="color:#E8002D;">Security Notice</h2>
      <p>Hello {name},</p>
      <p>Your password on the <strong>TUI Financial Intelligence Platform</strong>
         was successfully changed.</p>
      <p>If you did not make this change, please contact your Team Leader immediately.</p>
      <br/>
      <p style="color:#888;font-size:12px;">TUI Financial Intelligence Platform</p>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))
    _send(email, msg)


def send_dashboard_access_email(email: str, full_name: str, dashboard: str):
    label = DASHBOARD_LABELS.get(dashboard, dashboard)
    name  = full_name or email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Dashboard Access Granted – {label}"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = email
    body = f"""
    <html><body style="font-family:sans-serif;color:#1a2b4a;">
      <h2 style="color:#E8002D;">Dashboard Access Granted</h2>
      <p>Hello {name},</p>
      <p>You have been granted access to the <strong>{label}</strong> dashboard
         on the TUI Financial Intelligence Platform.</p>
      <p>You can now view this dashboard the next time you log in.</p>
      <br/>
      <p style="color:#888;font-size:12px;">TUI Financial Intelligence Platform</p>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))
    _send(email, msg)


def _send_credentials_email(email: str, full_name: str, password: str):
    name = full_name or email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your TUI Platform Account"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = email
    body = f"""
    <html><body style="font-family:sans-serif;color:#1a2b4a;">
      <h2 style="color:#E8002D;">Welcome to TUI Financial Platform</h2>
      <p>Hello {name},</p>
      <p>Your account has been created. Here are your credentials:</p>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Password:</strong> {password}</p>
      <p>Please log in and change your password immediately.</p>
      <p style="color:#888;font-size:12px;">TUI Financial Intelligence Platform</p>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))
    _send(email, msg)


def _send(to: str, msg: MIMEMultipart):
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")