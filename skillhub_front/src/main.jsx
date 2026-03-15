// Point d'entrée : on monte l'app React dans le div#root.
// BrowserRouter permet d'utiliser les routes (Link, useNavigate, etc.) dans toute l'app.
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);