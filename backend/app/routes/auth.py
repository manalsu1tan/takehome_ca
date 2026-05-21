from fastapi import APIRouter

from app.auth import login
from app.schemas import LoginRequest, TokenResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login_route(payload: LoginRequest) -> TokenResponse:
    """Exchange demo credentials for a bearer token."""

    return login(payload)
