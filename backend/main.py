from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from models import user
from models import data_models
from models import dashboard_permission          # ← add this
from routes import auth, data
from routes.dashboard_access import router as dashboard_access_router

app = FastAPI()                                  # ← must be first

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(dashboard_access_router)      # ← now after app is defined

@app.get("/")
def home():
    return {"message": "Backend running!"}