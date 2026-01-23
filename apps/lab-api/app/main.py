from fastapi import FastAPI

app = FastAPI(title="Lab API", version="1.0")

@app.get("/")
def root():
    return {
        "message": "Lab API is running 🚀"
    }
