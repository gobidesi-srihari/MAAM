from fastapi import FastAPI
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

    if username == "admin" and password == "admin123":
        return {
            "message": "Login successful"
        }

    return {
        "message": "Invalid username or password"
    }