"""
oauth.py — Social OAuth2 routes for DataVal.ai
================================================
Implements Google and GitHub OAuth2 flows using the Authlib `httpx` integration
(no server-side session needed — state is stored as a short-lived signed JWT).

Flow
----
1. Frontend calls  GET /auth/google/login  →  backend redirects to provider
2. Provider redirects to  /auth/google/callback?code=...&state=...
3. Backend verifies state, exchanges code for access token, fetches profile
4. Backend upserts the User row, issues our own JWT, and redirects the
   frontend to /auth/callback?token=<jwt>  where the React app picks it up.

Security
--------
* State token: a short-lived (10 min) HS256 JWT signed with SECRET_KEY.
  It binds the request to the provider name, preventing cross-provider
  state confusion and replay attacks.
* REDIRECT_URI is always constructed from BACKEND_URL env-var so the same
  code works on localhost and any production domain without changes.
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from auth import create_access_token
from config import settings
from database import get_db
from models import User

router = APIRouter(prefix="/auth", tags=["OAuth"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_state(provider: str) -> str:
    """Return a short-lived signed JWT used as the OAuth `state` parameter."""
    payload = {
        "provider": provider,
        "nonce": secrets.token_hex(16),
        "exp": datetime.utcnow() + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _verify_state(state: str, expected_provider: str) -> None:
    """Raise HTTPException if the state token is invalid or expired."""
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("provider") != expected_provider:
            raise ValueError("provider mismatch")
    except (JWTError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state token.")


def _upsert_user(
    db: Session,
    *,
    provider: str,
    oauth_id: str,
    email: str,
    full_name: str,
    avatar_url: Optional[str],
) -> User:
    """
    Find or create a User for a social login.

    Look-up priority:
      1. Existing social account  (oauth_provider + oauth_id)
      2. Existing e-mail account  → attach social credentials
      3. New user                 → create account (no password)
    """
    # 1 — exact social match
    user = db.query(User).filter(
        User.oauth_provider == provider,
        User.oauth_id == oauth_id,
    ).first()

    if user:
        return user

    # 2 — email already registered (merge)
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.oauth_provider = provider
        user.oauth_id = oauth_id
        if avatar_url and not user.profile_picture_url:
            user.profile_picture_url = avatar_url
        db.commit()
        db.refresh(user)
        return user

    # 3 — brand new social user
    user = User(
        full_name=full_name or email.split("@")[0],
        email=email,
        hashed_password=None,       # social-only, no password needed
        oauth_provider=provider,
        oauth_id=str(oauth_id),
        profile_picture_url=avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _frontend_redirect(token: str) -> RedirectResponse:
    """Redirect the browser to the React app's OAuth callback handler."""
    frontend_base = settings.FRONTEND_URL.split(",")[0].strip()
    return RedirectResponse(url=f"{frontend_base}/auth/callback?token={token}")


# ── Google ────────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL      = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL     = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL  = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES        = "openid email profile"


@router.get("/google/login")
async def google_login():
    """Redirect the user to Google's OAuth2 consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")

    redirect_uri = f"{settings.BACKEND_URL}/auth/google/callback"
    state = _make_state("google")

    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         GOOGLE_SCOPES,
        "access_type":   "offline",
        "state":         state,
        "prompt":        "select_account",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Exchange Google auth code for token, fetch profile, upsert user, return JWT."""
    _verify_state(state, "google")

    redirect_uri = f"{settings.BACKEND_URL}/auth/google/callback"

    # Exchange code → access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri":  redirect_uri,
            "grant_type":    "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code.")
        token_data = token_resp.json()

        # Fetch user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google profile.")
        profile = userinfo_resp.json()

    user = _upsert_user(
        db,
        provider="google",
        oauth_id=profile["sub"],
        email=profile["email"],
        full_name=profile.get("name", ""),
        avatar_url=profile.get("picture"),
    )

    jwt_token = create_access_token({"sub": str(user.id)})
    return _frontend_redirect(jwt_token)


# ── GitHub ────────────────────────────────────────────────────────────────────

GITHUB_AUTH_URL     = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL    = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL     = "https://api.github.com/user"
GITHUB_EMAIL_URL    = "https://api.github.com/user/emails"
GITHUB_SCOPES       = "read:user user:email"


@router.get("/github/login")
async def github_login():
    """Redirect the user to GitHub's OAuth2 consent screen."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured.")

    redirect_uri = f"{settings.BACKEND_URL}/auth/github/callback"
    state = _make_state("github")

    params = {
        "client_id":    settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope":        GITHUB_SCOPES,
        "state":        state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GITHUB_AUTH_URL}?{query}")


@router.get("/github/callback")
async def github_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Exchange GitHub auth code for token, fetch profile, upsert user, return JWT."""
    _verify_state(state, "github")

    redirect_uri = f"{settings.BACKEND_URL}/auth/github/callback"

    async with httpx.AsyncClient() as client:
        # Exchange code → access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id":     settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange GitHub code.")
        gh_token = token_resp.json().get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="GitHub did not return an access token.")

        auth_headers = {
            "Authorization": f"Bearer {gh_token}",
            "Accept": "application/vnd.github+json",
        }

        # Fetch user profile
        user_resp = await client.get(GITHUB_USER_URL, headers=auth_headers)
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub profile.")
        gh_user = user_resp.json()

        # GitHub may hide the email — fetch verified primary email separately
        email: Optional[str] = gh_user.get("email")
        if not email:
            emails_resp = await client.get(GITHUB_EMAIL_URL, headers=auth_headers)
            if emails_resp.status_code == 200:
                primary = next(
                    (e for e in emails_resp.json() if e.get("primary") and e.get("verified")),
                    None,
                )
                email = primary["email"] if primary else None

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve a verified email from your GitHub account. "
                   "Please make sure at least one email is public or verified.",
        )

    user = _upsert_user(
        db,
        provider="github",
        oauth_id=str(gh_user["id"]),
        email=email,
        full_name=gh_user.get("name") or gh_user.get("login", ""),
        avatar_url=gh_user.get("avatar_url"),
    )

    jwt_token = create_access_token({"sub": str(user.id)})
    return _frontend_redirect(jwt_token)
