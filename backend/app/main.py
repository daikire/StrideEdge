from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import APP_TITLE, APP_VERSION, CORS_ORIGINS
from app.routers import races, horses, analysis, history, settings, predictions, alarms, memos, roi, shutdown, sync
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title=APP_TITLE, version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(races.router)
app.include_router(horses.router)
app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(settings.router)
app.include_router(predictions.router)
app.include_router(alarms.router)
app.include_router(memos.router)
app.include_router(roi.router)
app.include_router(shutdown.router)
app.include_router(sync.router)


@app.get("/")
async def root():
    return {"message": "StrideEdge API", "version": APP_VERSION, "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
