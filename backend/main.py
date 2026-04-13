from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from models import user
from models import data_models
from models import dashboard_permission
from models.account import Account  # noqa: F401 — registers table with SQLAlchemy metadata
from controllers.authController      import router as auth_router
from controllers.accountController   import router as account_router
from controllers.dataController      import router as data_router
from controllers.dashboardController import router as dashboard_router
from controllers.accessController    import router as access_router
from controllers.aiInsightController import router as ai_insight_router

app = FastAPI()                                 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(account_router)
app.include_router(data_router)
app.include_router(dashboard_router)
app.include_router(access_router) 
app.include_router(ai_insight_router)

@app.get("/")
def home():
    return {"message": "Backend running!"}