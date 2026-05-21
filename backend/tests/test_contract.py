from pathlib import Path

from app.main import app


FRONTEND_TYPES = Path(__file__).parents[2] / "frontend" / "src" / "api" / "types.ts"


def _type_fields(type_name: str) -> set[str]:
    source = FRONTEND_TYPES.read_text()
    start = source.index(f"export type {type_name} = {{")
    body_start = source.index("{", start) + 1
    body_end = source.index("};", body_start)
    fields = set()

    for line in source[body_start:body_end].splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue
        fields.add(stripped.split(":", maxsplit=1)[0].strip())

    return fields


def _schema_fields(schema_name: str) -> set[str]:
    schema = app.openapi()["components"]["schemas"][schema_name]
    return set(schema["properties"])


def test_frontend_task_type_matches_backend_task_response_schema() -> None:
    assert _type_fields("Task") == _schema_fields("TaskResponse")


def test_frontend_stats_type_matches_backend_stats_response_schema() -> None:
    assert _type_fields("TaskStats") == _schema_fields("TaskStatsResponse")


def test_frontend_activity_type_matches_backend_activity_response_schema() -> None:
    assert _type_fields("ActivityEntry") == _schema_fields("ActivityEntryResponse")

