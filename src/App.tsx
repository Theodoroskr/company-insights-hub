import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

// Cart + currency context
import { CartProvider } from "./contexts/CartContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";

// Route Guards
import { ProtectedRoute, AdminRoute } from "./components/auth/RouteGuards";

// Public pages
import HomePage from "./pages/HomePage";
import SearchResultsPage from "./pages/SearchResultsPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import CompanyBrowseByLetterPage from "./pages/CompanyBrowseByLetterPage";
import ProductLandingPage from "./pages/ProductLandingPage";
import CompanySetUpPage from "./pages/CompanySetUpPage";
import BusinessNameApprovalPage from "./pages/BusinessNameApprovalPage";
import PricingPage from "./pages/PricingPage";
import CertificatesPage from "./pages/CertificatesPage";
import CartPage from "./pages/CartPage";
import CheckoutDetailsPage from "./pages/CheckoutDetailsPage";
import CheckoutPaymentPage from "./pages/CheckoutPaymentPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import CountryDashboardPage from "./pages/CountryDashboardPage";

// Account pages
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountOrdersPage from "./pages/account/AccountOrdersPage";
import AccountOrderDetailPage from "./pages/account/AccountOrderDetailPage";
import AccountDownloadsPage from "./pages/account/AccountDownloadsPage";
import AccountMonitoringPage from "./pages/account/AccountMonitoringPage";
import AccountProfilePage from "./pages/account/AccountProfilePage";
import AccountInvoicesPage from "./pages/account/AccountInvoicesPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage";
import AdminFulfillmentPage from "./pages/admin/AdminFulfillmentPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminPromoCodesPage from "./pages/admin/AdminPromoCodesPage";
import AdminSourceHealthPage from "./pages/admin/AdminSourceHealthPage";
import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminTenantsPage from "./pages/admin/AdminTenantsPage";

// Dev-only tenant switcher (visible on localhost / lovable.app preview)
import TenantSwitcher from "./components/dev/TenantSwitcher";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TenantSwitcher />
          <BrowserRouter>
            <Routes>
              {/* ── Public ── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/company/search" element={<SearchResultsPage />} />
              <Route path="/search" element={<Navigate to="/company/search" replace />} />
              <Route path="/report" element={<ProductLandingPage />} />
              <Route path="/company-set-up" element={<CompanySetUpPage />} />
              <Route path="/business-name-approval" element={<BusinessNameApprovalPage />} />
              <Route path="/company/:slug" element={<CompanyProfilePage />} />
              <Route path="/companies/:letter" element={<CompanyBrowseByLetterPage />} />
              <Route path="/country/:code" element={<CountryDashboardPage />} />

              {/* ── Static pages ── */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />

              {/* ── Cart & Checkout ── */}
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<Navigate to="/cart" replace />} />
              <Route path="/checkout/details" element={<CheckoutDetailsPage />} />
              <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* ── Protected: Account ── */}
              <Route path="/account" element={<ProtectedRoute><AccountDashboard /></ProtectedRoute>} />
              <Route path="/account/profile" element={<ProtectedRoute><AccountProfilePage /></ProtectedRoute>} />
              <Route path="/account/orders" element={<ProtectedRoute><AccountOrdersPage /></ProtectedRoute>} />
              <Route path="/account/orders/:id" element={<ProtectedRoute><AccountOrderDetailPage /></ProtectedRoute>} />
              <Route path="/account/invoices" element={<ProtectedRoute><AccountInvoicesPage /></ProtectedRoute>} />
              <Route path="/account/downloads" element={<ProtectedRoute><AccountDownloadsPage /></ProtectedRoute>} />
              <Route path="/account/monitoring" element={<ProtectedRoute><AccountMonitoringPage /></ProtectedRoute>} />

              {/* ── Legacy dashboard redirects ── */}
              <Route path="/dashboard/profile" element={<Navigate to="/account/profile" replace />} />
              <Route path="/dashboard/reports" element={<Navigate to="/account/orders" replace />} />
              <Route path="/dashboard/invoices" element={<Navigate to="/account/invoices" replace />} />

              {/* ── Admin only ── */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
              <Route path="/admin/orders/:id" element={<AdminRoute><AdminOrderDetailPage /></AdminRoute>} />
              <Route path="/admin/fulfillment" element={<AdminRoute><AdminFulfillmentPage /></AdminRoute>} />
              <Route path="/admin/products" element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
              <Route path="/admin/customers" element={<AdminRoute><AdminCustomersPage /></AdminRoute>} />
              <Route path="/admin/promo-codes" element={<AdminRoute><AdminPromoCodesPage /></AdminRoute>} />
              <Route path="/admin/source-health" element={<AdminRoute><AdminSourceHealthPage /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
              <Route path="/admin/tenants" element={<AdminRoute><AdminTenantsPage /></AdminRoute>} />

              {/* ── Catch-all ── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
