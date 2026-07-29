/* eslint-disable react-refresh/only-export-components */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import "./styles.css";

const usesHashRouter = import.meta.env.VITE_ROUTER_MODE === "hash";
const Router = usesHashRouter ? HashRouter : BrowserRouter;
const basename = usesHashRouter ? "/" : import.meta.env.BASE_URL || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router basename={basename}>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </StrictMode>,
);
