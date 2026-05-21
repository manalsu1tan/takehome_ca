import pytest
from fastapi.testclient import TestClient

from app.auth import DEMO_TOKEN
from app.main import app
from app.store import task_store


@pytest.fixture(autouse=True)
def reset_store() -> None:
    task_store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {DEMO_TOKEN}"}

