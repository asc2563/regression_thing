import "./main.css";

console.log(
    '👋 This message is being logged by "renderer.tsx", included via Vite'
);
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./render/App";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import CoolApp from "./render/cool/App";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <Router>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/cool" element={<CoolApp />} />
            </Routes>
        </Router>
    </React.StrictMode>
);
