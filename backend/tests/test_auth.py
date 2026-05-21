from fastapi.testclient import TestClient


def test_login_succeeds_with_demo_credentials(client: TestClient) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "demo@carbonarc.local", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json() == {"token": "demo-token", "token_type": "bearer"}


def test_login_rejects_invalid_credentials(client: TestClient) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "demo@carbonarc.local", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_task_endpoints_require_auth(client: TestClient) -> None:
    response = client.get("/tasks")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"


def test_task_endpoints_reject_invalid_token(client: TestClient) -> None:
    response = client.get("/tasks", headers={"Authorization": "Bearer bad-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid bearer token"

