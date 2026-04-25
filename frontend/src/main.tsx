import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAuth } from "./services/authService";

// Restore JWT from localStorage into the in-memory apiClient on app startup
initAuth();

createRoot(document.getElementById("root")!).render(<App />);
