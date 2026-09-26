import { createRoot } from "react-dom/client";
import { TenantProvider } from "./lib/tenant";
import App from "./App.tsx";
import { loadPricingSettings } from "./lib/pricing";
import "./index.css";

const timeout = new Promise((r) => setTimeout(r, 2500));
Promise.race([loadPricingSettings(), timeout]).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <TenantProvider>
      <App />
    </TenantProvider>
  );
});
