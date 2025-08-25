import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import NotificationsProvider from './contexts/NotificationsProvider';
import { HelmetProvider } from "@dr.pogodin/react-helmet";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationsProvider>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>
            <UserProvider>
              <App />
            </UserProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </NotificationsProvider>
  </React.StrictMode>
);