import "./main.css";

console.log(
    '👋 This message is being logged by "renderer.tsx", included via Vite'
);
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
