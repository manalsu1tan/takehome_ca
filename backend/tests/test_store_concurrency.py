from concurrent.futures import ThreadPoolExecutor

from app.store import TaskStore


def test_store_handles_concurrent_task_creation() -> None:
    store = TaskStore()

    with ThreadPoolExecutor(max_workers=12) as executor:
        tasks = list(
            executor.map(lambda index: store.create_task(f"Task {index}"), range(100))
        )

    assert len({task.id for task in tasks}) == 100
    assert store.get_stats() == {
        "total": 100,
        "completed": 0,
        "in_progress": 0,
        "pending": 100,
    }


def test_store_handles_concurrent_status_updates() -> None:
    store = TaskStore()
    tasks = [store.create_task(f"Task {index}") for index in range(50)]

    with ThreadPoolExecutor(max_workers=12) as executor:
        completed = list(executor.map(lambda task: store.complete_task(task.id), tasks))

    assert all(task.completed for task in completed)
    assert store.get_stats() == {
        "total": 50,
        "completed": 50,
        "in_progress": 0,
        "pending": 0,
    }
