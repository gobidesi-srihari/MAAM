
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.substations import router as substations_router
from routers.equipment_types import router as equipment_types_router
from routers.equipment import router as equipment_router
from routers.transformer_nameplate import router as transformer_nameplate_router
from routers import transformer_bdv

app = FastAPI(
    title="MAAM API",
    description="Electrical Equipment Management System",
    version="1.0.0"
)

# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(substations_router)
app.include_router(equipment_types_router)
app.include_router(equipment_router)
app.include_router(transformer_nameplate_router)
app.include_router(transformer_bdv.router)


@app.get("/")
def home():
    return {
        "message": "MAAM Backend is running successfully"
    }
