from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from models import user
from models import data_models
from models import dashboard_permission       
from controllers.authController      import router as auth_router
from controllers.accountController   import router as account_router
from controllers.dataController      import router as data_router
from controllers.dashboardController import router as dashboard_router
from controllers.accessController    import router as access_router
from controllers.ai import router as ai_router

app = FastAPI()                                 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Add columns that may be missing from pre-existing tables
with engine.connect() as _conn:
    _conn.execute(__import__("sqlalchemy").text("""
        ALTER TABLE dashboard_permissions
            ADD COLUMN IF NOT EXISTS granted_by INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP DEFAULT NOW()
    """))
    _conn.commit()

app.include_router(auth_router)
app.include_router(account_router)
app.include_router(data_router)
app.include_router(dashboard_router)
app.include_router(access_router) 
app.include_router(ai_router)  

@app.get("/")
def home():
    return {"message": "Backend running!"}