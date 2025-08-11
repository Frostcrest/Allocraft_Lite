# Allocraft Lite

This is **Allocraft Lite**, a lightweight portfolio tracker app built with Vite and React.  
_Note: This is not the main Allocraft project. If you are looking for the full Allocraft project, please check your repository for the appropriate folder._

## Getting Started

Fastest path on Windows: from the repo root, run `start-dev.bat`.
It will open both the backend (http://127.0.0.1:8000) and frontend (http://localhost:5173) for you.

Follow these steps to launch Allocraft Lite on your local machine:

### 1. Clone the Repository

If you haven't already, clone the repository:

```sh
git clone <your-repo-url>
cd allocraft_lite
```

### 2. Install Dependencies

Install all required packages using npm:

```sh
npm install
```

### 3. Start the Development Server

Launch the app in development mode:

```sh
npm run dev
```

You should see output similar to:

```
  VITE vX.X.X  ready in Y ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser to view the app.

If your backend runs on a different URL/port, create `.env.local` with:

```
VITE_API_BASE_URL=http://localhost:8000

Note: When running locally via Vite (http://localhost:5173), the app automatically targets
the local backend (http://localhost:8000) and shows a small "DEV API" badge in the header.
```

### 4. Build for Production (Optional)

To create an optimized production build:

```sh
npm run build
```

To preview the production build locally:

```sh
npm run preview
```

---

For questions or support, contact Base44 at [app@base44.com](mailto:app@base44.com).