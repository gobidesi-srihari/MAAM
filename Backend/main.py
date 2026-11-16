from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/login")
def login(data: dict):
    username = data.get("username")
    password = data.get("password")

    if username == "Admin" and password == "poi098":
        return {
            "message": "Login successful"
        }

    raise HTTPException(
        status_code=401,
        detail="Invalid username or password"
    )
