from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas import LoginRequest, TokenResponse


DEMO_EMAIL = "demo@carbonarc.local"
DEMO_PASSWORD = "password123"
DEMO_TOKEN = "demo-token"

# `auto_error=False` lets us return consistent JSON error messages instead of
# FastAPI's default HTTPBearer response when the header is absent.
bearer_scheme = HTTPBearer(auto_error=False)


def login(credentials: LoginRequest) -> TokenResponse:
    """Validate demo credentials and return the static take-home token."""

    if credentials.email != DEMO_EMAIL or credentials.password != DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(token=DEMO_TOKEN)


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> None:
    """FastAPI dependency that protects task routes with bearer auth."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    if credentials.credentials != DEMO_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )
