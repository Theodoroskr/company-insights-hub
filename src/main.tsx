import { createRoot } from "react-dom/client";
import { TenantProvider } from "./lib/tenant";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <TenantProvider>
    <App />
  </TenantProvider>
);
