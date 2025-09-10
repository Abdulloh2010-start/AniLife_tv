import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import NotificationsProvider from './contexts/NotificationsProvider';
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { registerSW } from "virtual:pwa-register";

registerSW({immediate: true});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);