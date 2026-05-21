from fastapi.testclient import TestClient


def _create_task(
    client: TestClient,
    auth_headers: dict[str, str],
    title: str,
    **payload: object,
) -> dict:
    response = client.post(
        "/tasks",
        json={"title": title, **payload},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_get_task(client: TestClient, auth_headers: dict[str, str]) -> None:
    created = _create_task(client, auth_headers, "Write report")

    assert created["title"] == "Write report"
    assert created["status"] == "pending"
    assert created["priority"] == "medium"
    assert created["tags"] == []
    assert created["target_date"] is None
    assert created["completed"] is False
    assert created["created_at"]
    assert created["updated_at"]

    response = client.get(f"/tasks/{created['id']}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_create_rejects_blank_title(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post("/tasks", json={"title": ""}, headers=auth_headers)

    assert response.status_code == 422


def test_list_tasks_is_paginated(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    _create_task(client, auth_headers, "First")
    _create_task(client, auth_headers, "Second")
    _create_task(client, auth_headers, "Third")

    response = client.get(
        "/tasks?page=1&page_size=2",
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert body["total"] == 3
    assert body["total_pages"] == 2
    assert len(body["items"]) == 2


def test_list_tasks_can_filter_by_status(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    complete = _create_task(client, auth_headers, "Complete me")
    _create_task(client, auth_headers, "Pending")
    client.put(f"/tasks/{complete['id']}/complete", headers=auth_headers)

    response = client.get("/tasks?status=completed", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == complete["id"]


def test_list_tasks_can_search_filter_tags_and_sort_due_dates(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    _create_task(
        client,
        auth_headers,
        "Campaign reporting",
        tags=["Marketing", "Metrics"],
        target_date="2026-06-15",
        priority="high",
    )
    _create_task(
        client,
        auth_headers,
        "Product launch",
        tags=["Product"],
        target_date="2026-05-30",
        priority="low",
    )

    search_response = client.get("/tasks?search=metrics", headers=auth_headers)
    tag_response = client.get("/tasks?tag=Marketing,Metrics", headers=auth_headers)
    sort_response = client.get(
        "/tasks?sort_by=target_date&sort_order=asc",
        headers=auth_headers,
    )

    assert search_response.json()["total"] == 1
    assert search_response.json()["items"][0]["title"] == "Campaign reporting"
    assert tag_response.json()["total"] == 1
    assert tag_response.json()["items"][0]["title"] == "Campaign reporting"
    assert [item["target_date"] for item in sort_response.json()["items"]] == [
        "2026-05-30",
        "2026-06-15",
    ]


def test_missing_task_returns_404(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get("/tasks/missing-id", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


def test_complete_task_updates_stats_and_activity(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    task = _create_task(client, auth_headers, "Write report")

    complete_response = client.put(
        f"/tasks/{task['id']}/complete",
        headers=auth_headers,
    )
    stats_response = client.get("/tasks/stats", headers=auth_headers)
    activity_response = client.get(
        f"/tasks/{task['id']}/activity",
        headers=auth_headers,
    )

    assert complete_response.status_code == 200
    assert complete_response.json()["completed"] is True
    assert complete_response.json()["status"] == "completed"
    assert stats_response.json() == {
        "total": 1,
        "completed": 1,
        "in_progress": 0,
        "pending": 0,
    }

    activity = activity_response.json()["items"]
    assert [entry["event_type"] for entry in activity] == [
        "created",
        "status_changed",
    ]
    assert activity[-1]["old_status"] == "pending"
    assert activity[-1]["new_status"] == "completed"


def test_toggle_task_can_reopen_completed_task(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    task = _create_task(client, auth_headers, "Toggle me")
    client.put(f"/tasks/{task['id']}/complete", headers=auth_headers)

    response = client.put(f"/tasks/{task['id']}/toggle", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["completed"] is False
    assert response.json()["status"] == "pending"


def test_update_task_title_records_activity(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    task = _create_task(client, auth_headers, "Old title")

    response = client.patch(
        f"/tasks/{task['id']}",
        json={"title": "New title"},
        headers=auth_headers,
    )
    activity_response = client.get(
        f"/tasks/{task['id']}/activity",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "New title"

    activity = activity_response.json()["items"]
    assert activity[-1]["event_type"] == "title_updated"
    assert activity[-1]["old_title"] == "Old title"
    assert activity[-1]["new_title"] == "New title"


def test_update_task_status_priority_tags_and_target_date(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    task = _create_task(client, auth_headers, "Enrich me")

    response = client.patch(
        f"/tasks/{task['id']}",
        json={
            "status": "in_progress",
            "priority": "high",
            "tags": ["Data", "Infra"],
            "target_date": "2026-06-01",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["priority"] == "high"
    assert body["tags"] == ["Data", "Infra"]
    assert body["target_date"] == "2026-06-01"


def test_delete_task_removes_task_and_updates_stats(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    task = _create_task(client, auth_headers, "Delete me")

    delete_response = client.delete(f"/tasks/{task['id']}", headers=auth_headers)
    get_response = client.get(f"/tasks/{task['id']}", headers=auth_headers)
    stats_response = client.get("/tasks/stats", headers=auth_headers)

    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert stats_response.json() == {
        "total": 0,
        "completed": 0,
        "in_progress": 0,
        "pending": 0,
    }
