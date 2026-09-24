import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Point d'entrée Vite (référencé par index.html). src/index.js reste
// l'ancien point d'entrée Create React App et n'est plus chargé.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
