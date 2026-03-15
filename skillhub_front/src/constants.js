// Constantes utilisées un peu partout dans l'app.

// En dev avec Vite, /api est proxyfié vers le back. En prod on peut mettre VITE_API_URL dans .env.
export const API_URL = import.meta.env.VITE_API_URL || "/api";

// Quand une formation n'a pas d'image, on affiche ce placeholder à la place.
export const IMG_PLACEHOLDER = "https://via.placeholder.com/300x180?text=Formation";
