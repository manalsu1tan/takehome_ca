from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.tasks import router as tasks_router


app = FastAPI(
    title="Task API",
    version="0.1.0",
    description="Task management API.",
)

app.add_middleware(
    CORSMiddleware,
    # The React app runs in the browser on port 3000 and calls the API on 3001.
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tasks_router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Health endpoint used by Docker Compose before starting the frontend."""

    return {"status": "ok"}
