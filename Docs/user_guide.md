# IGCAR Electrical Inventory Management System

## Execution Steps

This document explains how to start and test the current React frontend
and FastAPI backend on Windows using VS Code.

> **Current project status:** The login flow has been tested
> successfully. The dashboard is currently a frontend page with
> placeholder statistics. Inventory database operations and inventory
> APIs have not yet been implemented.

------------------------------------------------------------------------

## 1. Prerequisites

Install the following:

-   [Node.js](https://nodejs.org/) (includes npm)
-   Python 3
-   Visual Studio Code

Open the project folder (`MAAM`) in VS Code.

Expected basic structure:

``` text
MAAM/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── style.css
│       └── pages/
│           ├── Login.jsx
│           └── Dashboard.jsx
└── backend/
    ├── main.py
    └── requirements.txt
```

Your actual folder names and files may differ. Check them in VS Code if
a command or import fails.

## 2. Start the Backend (Terminal 1)

1.  In VS Code, select **Terminal → New Terminal**.

2.  Change to the backend folder:

    ``` powershell
    cd backend
    ```

3.  Install backend dependencies if this is the first run, or if
    dependencies have changed:

    ``` powershell
    python -m pip install -r requirements.txt
    ```

4.  Start FastAPI:

    ``` powershell
    python -m uvicorn main:app --reload
    ```

5.  Keep this terminal open while using the application.

The backend should be available at:

-   API base: `http://localhost:8000`
-   Interactive API documentation: `http://localhost:8000/docs`

If `uvicorn` is not installed, make sure `requirements.txt` contains
`fastapi` and `uvicorn`, then run the installation command above.

## 3. Start the Frontend (Terminal 2)

1.  In VS Code, click the **+** button in the Terminal panel to open a
    second terminal.

2.  Change to the frontend folder:

    ``` powershell
    cd frontend
    ```

3.  Install frontend dependencies only on the first run, or after
    dependencies have changed:

    ``` powershell
    npm install
    ```

4.  Start Vite:

    ``` powershell
    npm run dev
    ```

5.  Keep this terminal open while using the application.

6.  Open the Local URL printed by Vite. It is usually:

    `http://localhost:5173/`

## 4. Test the Current Login Flow

1.  Confirm both backend and frontend terminals are still running.

2.  Open `http://localhost:5173/` in Chrome or Edge.

3.  Enter the demo credentials currently configured in the example
    backend:

    -   Username: `admin`
    -   Password: `admin123`

4.  Click **Sign In**.

5.  On successful authentication, the current frontend stores an
    `isLoggedIn` flag in browser `localStorage` and displays the
    Dashboard.

These are demo credentials for local development only. The current
hardcoded login and browser-side login flag are **not production-grade
authentication**. Do not use them to protect a real deployment or
sensitive data.

## 5. Check the Backend Separately

Open:

`http://localhost:8000/docs`

The FastAPI Swagger page should appear. It lists the API endpoints
currently registered by the backend. You can expand an endpoint and use
**Try it out** to test it.

The current login request is sent from React to:

``` text
POST http://localhost:8000/login
```

The frontend sends the username and password as JSON. FastAPI validates
them and returns a JSON response. The frontend reads that response and
decides whether to show the login error or Dashboard.

## 6. How Frontend and Backend Connect

-   **React frontend:** displays the login page and dashboard in the
    browser.
-   **FastAPI backend:** receives HTTP requests, runs backend logic, and
    returns JSON responses.
-   **Database:** not yet connected in the current basic version. It
    will be added for persistent inventory records.

Current flow:

``` text
Browser (React)
    |
    | POST /login (JSON credentials)
    v
FastAPI backend
    |
    | JSON login response
    v
Browser (React)
    |
    v
Dashboard page
```

The Dashboard's current totals (Total Items, Available Items, Issued
Items, and Low Stock Items) are placeholder values in React. They are
not yet being fetched from FastAPI or calculated from a database.

## 7. See Code Updates

While Vite is running:

1.  Edit a frontend file in VS Code.
2.  Save it with **Ctrl + S**.
3.  Vite normally refreshes the browser automatically.

For backend changes, Uvicorn's `--reload` option normally restarts the
backend automatically when Python files are saved.

## 8. Stop the Application

When finished:

1.  Select the backend terminal and press **Ctrl + C**.
2.  Select the frontend terminal and press **Ctrl + C**.

Close the terminals only after stopping the servers.

## 9. Common Problems

### `npm run dev` says `Missing script: "dev"`

Open `frontend/package.json` and confirm it contains:

``` json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Save the file and run `npm run dev` again.

### `'vite' is not recognized`

From the `frontend` folder, run:

``` powershell
npm install
```

If Vite is still missing, run:

``` powershell
npm install -D vite @vitejs/plugin-react
```

Then try `npm run dev` again.

### `Failed to resolve import`

Check that the imported file exists and that the relative path is
correct. For example, if `App.jsx` and `pages` are both inside `src`,
use:

``` jsx
import Login from "./pages/Login.jsx";
```

### `Failed to fetch` or backend connection error

-   Confirm the backend terminal is running without errors.
-   Open `http://localhost:8000/docs`.
-   Confirm the frontend fetch URL uses the correct backend address and
    route.
-   Confirm FastAPI CORS configuration allows `http://localhost:5173`.

### Port already in use

Stop the earlier server with **Ctrl + C** before starting it again. If
another application is using the port, use the alternate port printed by
the development server and open that URL.

## 10. Daily Quick Start

After the initial dependency installation, the normal daily routine is:

**Terminal 1 --- Backend**

``` powershell
cd backend
python -m uvicorn main:app --reload
```

**Terminal 2 --- Frontend**

``` powershell
cd frontend
npm run dev
```

Then open:

`http://localhost:5173/`

You do not need to run `npm install` or `pip install` every day. Run
those commands only for a first-time setup or when dependencies change.

------------------------------------------------------------------------

## 11. Planned Next Development Steps

The following are future implementation tasks, not features that are
already complete:

1.  Connect a database to FastAPI.
2.  Create an electrical-item data model and API endpoints.
3.  Build an Add New Item form in React.
4.  Retrieve and display inventory records from the backend.
5.  Add search, filtering, editing, and deletion.
6.  Implement issue and return workflows.
7.  Calculate dashboard statistics from database records.
8.  Add secure authentication and role-based access.
9.  Test, document, and deploy the application.
