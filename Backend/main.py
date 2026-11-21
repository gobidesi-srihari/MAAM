
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import login as login_endpoint
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.substations import router as substations_router
from routers.equipment_types import router as equipment_types_router
from routers.equipment import router as equipment_router
from routers.transformer_nameplate import router as transformer_nameplate_router
from routers import transformer_bdv
from routers.asset_scheduling import router as asset_scheduling_router
from routers.transformer_tests import (
    catalog_router as transformer_test_catalog_router,
    router as transformer_tests_router,
)
from schemas.auth import TokenResponse

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
    expose_headers=[
        "Content-Disposition",
        "X-Equipment-Export-Token",
    ],
)

# Register API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(substations_router)
app.include_router(equipment_types_router)
app.include_router(equipment_router)
app.include_router(transformer_nameplate_router)
app.include_router(transformer_bdv.router)
app.include_router(asset_scheduling_router)
app.include_router(transformer_test_catalog_router)
app.include_router(transformer_tests_router)
app.add_api_route(
    "/login",
    login_endpoint,
    methods=["POST"],
    response_model=TokenResponse,
    include_in_schema=False,
)


@app.get("/")
def home():
    return {
        "message": "MAAM Backend is running successfully"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "MAAM API"
    }
