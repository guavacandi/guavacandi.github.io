import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "/src/styles/calculator.css";
import "./index.css";

// ✅ System 7 CSS LAST so it overrides everything else:
import "./styles/system7.css";
import "./styles/scrollbars.css";
// optional:
// import "./styles/calculator.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
