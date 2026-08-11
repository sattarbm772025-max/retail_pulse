"""Email delivery helpers.

Credentials are loaded only from the existing environment.  Never commit API keys
or passwords to this repository.
"""

from urllib.parse import urlencode

from app.core.config import FRONTEND_URL, FROM_EMAIL, RESEND_API_KEY


def send_reset_email(email: str, token: str) -> None:
    """Deliver the time-limited reset link through Resend."""
    if not RESEND_API_KEY:
        # The endpoint remains non-enumerating, while local development can run
        # without an email provider. Production must set this value.
        return

    try:
        import resend
    except ImportError as error:
        raise RuntimeError("Resend is not installed. Run: pip install resend") from error

    resend.api_key = RESEND_API_KEY
    reset_link = f"{FRONTEND_URL.rstrip('/')}/reset-password?{urlencode({'token': token})}"
    resend.Emails.send(
        {
            "from": FROM_EMAIL,
            "to": [email],
            "subject": "Reset your RetailPulse password",
            "html": f"""
                <h2>RetailPulse Password Reset</h2>
                <p>We received a request to reset your password.</p>
                <p><a href=\"{reset_link}\">Reset Password</a></p>
                <p>This link expires shortly. If you did not request it, you can safely ignore this email.</p>
            """,
        }
    )
