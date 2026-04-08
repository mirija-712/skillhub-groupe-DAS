export const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Base Laravel pour /storage (ex. http://localhost:8000). Optionnel si le proxy Vite suffit. */
export const API_ORIGIN = String(import.meta.env.VITE_API_ORIGIN || "").replace(/\/$/, "");

export const IMG_PLACEHOLDER = "https://via.placeholder.com/300x180?text=Formation";
