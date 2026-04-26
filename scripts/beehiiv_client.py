#!/usr/bin/env python3
"""
Beehiiv API client for Carnivore Weekly.

Handles publishing newsletters as posts and managing subscribers.

Credentials loaded from: secrets/api-keys.json -> beehiiv.api_key / beehiiv.publication_id
Wrangler secrets: BEEHIIV_API_KEY, BEEHIIV_PUB_ID (for Cloudflare Worker)
"""

import json
import re
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).parent.parent
SECRETS_PATH = PROJECT_ROOT / "secrets" / "api-keys.json"
BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"


def _load_credentials() -> tuple[str, str]:
    """Load API key and publication ID from secrets file."""
    secrets = json.loads(SECRETS_PATH.read_text())
    bh = secrets.get("beehiiv", {})
    api_key = bh.get("api_key")
    pub_id = bh.get("publication_id")
    if not api_key or not pub_id:
        print("Error: beehiiv.api_key / beehiiv.publication_id missing from secrets/api-keys.json")
        sys.exit(1)
    return api_key, pub_id


def strip_footer(html: str) -> str:
    """
    Remove our custom unsubscribe footer before sending to Beehiiv.
    Beehiiv appends its own CAN-SPAM compliant footer automatically.

    Handles two newsletter formats:
    - New (Jinja2 template): <!-- FOOTER --> comment block wrapping a <tr>
    - Old (div-based): <!-- Footer --> comment wrapping <div class="footer">
    """
    # New format: table-based Jinja2 template footer
    stripped = re.sub(
        r'<!--\s*=+\s*-->\s*<!--\s*FOOTER[\s\S]*?</tr>\s*(?=\s*</table>)',
        '',
        html,
        flags=re.DOTALL,
    )
    # Old format: div-based footer (legacy newsletters/)
    stripped = re.sub(
        r'<!--\s*Footer\s*-->\s*<div class="footer">[\s\S]*?</div>\s*(?=\s*</div>\s*</body>)',
        '',
        stripped,
        flags=re.DOTALL,
    )
    return stripped


def create_post(
    title: str,
    html: str,
    *,
    subtitle: str = "",
    status: str = "draft",
    preview_text: str = "",
) -> dict:
    """
    Create a newsletter post on Beehiiv via the Create Post API.

    Args:
        title:        Email subject / post title.
        html:         Full rendered newsletter HTML (footer will be stripped).
        subtitle:     Optional subtitle shown in Beehiiv post listing.
        status:       'draft' (default) or 'confirmed' (sends immediately).
        preview_text: Inbox preview snippet.

    Returns:
        Full Beehiiv API response dict.
    """
    api_key, pub_id = _load_credentials()
    clean_html = strip_footer(html)

    payload = {
        "title": title,
        "subtitle": subtitle,
        "status": status,
        "preview_text": preview_text,
        "body_content": clean_html,
        "audience": "free",
        "content_tags": [],
    }

    response = requests.post(
        f"{BEEHIIV_API_BASE}/publications/{pub_id}/posts",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def add_subscriber(email: str, *, utm_source: str = "website") -> dict:
    """
    Add a subscriber to the Beehiiv publication.

    Args:
        email:      Subscriber email address.
        utm_source: Source label for attribution (e.g. 'homepage', 'blog').

    Returns:
        Full Beehiiv API response dict.
    """
    api_key, pub_id = _load_credentials()

    payload = {
        "email": email.strip().lower(),
        "reactivate_existing": False,
        "send_welcome_email": True,
        "utm_source": utm_source,
    }

    response = requests.post(
        f"{BEEHIIV_API_BASE}/publications/{pub_id}/subscriptions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def list_subscribers(limit: int = 100) -> list:
    """Return list of subscriber objects from the publication."""
    api_key, pub_id = _load_credentials()

    response = requests.get(
        f"{BEEHIIV_API_BASE}/publications/{pub_id}/subscriptions",
        headers={"Authorization": f"Bearer {api_key}"},
        params={"limit": limit},
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("data", [])
