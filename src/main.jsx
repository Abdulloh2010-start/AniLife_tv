import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import NotificationsProvider from "./contexts/NotificationsProvider";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

function TelegramProvider({ children }) {
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.MainButton.setText("Отправить в бота");
      tg.MainButton.onClick(() => {
        tg.sendData(JSON.stringify({ action: "hello_from_webapp", time: Date.now() }));
      });
    }
  }, []);

  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider>
            <NotificationsProvider>
              <TelegramProvider>
                <App />
              </TelegramProvider>
            </NotificationsProvider>
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);