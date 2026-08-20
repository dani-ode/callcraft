import uvicorn
from callcraft_api import app, settings

if __name__ == "__main__":
    uvicorn.run("callcraft_api:app", host="0.0.0.0", port=settings.port, reload=True)
