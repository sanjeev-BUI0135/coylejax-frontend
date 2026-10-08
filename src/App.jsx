import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./pages/Layout.jsx";
import PageSkeleton from "./components/ui/pageskeleton.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

/* ------------------ LAZY IMPORTS ------------------ */

// Public Pages
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const PublicInvoice = lazy(() => import("./pages/PublicInvoice"));
const PublicPay = lazy(() => import("./pages/PublicPay"));
const PublicPaymentPage = lazy(() => import("./pages/PublicPaymentPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.jsx"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions.jsx"));
const SmsPolicy = lazy(() => import("./pages/SmsPolicy.jsx"));
const AboutUs = lazy(() => import("./pages/AboutUs.jsx"));

// Main Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails"));
const Estimates = lazy(() => import("./pages/Estimates"));
const EstimateDetails = lazy(() => import("./pages/EstimateDetails.jsx"));
const EstimateAccepted = lazy(() => import("./pages/EstimateAccepted.jsx"));
const EstimatePrint = lazy(() => import("./pages/EstimatePrint.jsx"));

const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetails = lazy(() => import("./pages/InvoiceDetails"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));

const MaterialOrders = lazy(() => import("./pages/MaterialOrders"));
const MaterialOrderDetails = lazy(() => import("./pages/MaterialOrderDetails"));
const Inventory = lazy(() => import("./pages/Inventory"));
const TimeEntry = lazy(() => import("./pages/TimeEntry"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const MasterDataManagement = lazy(() => import("./pages/MasterDataManagement .jsx"));
const Suppliers = lazy(() => import("./pages/Suppliers.jsx"));
const UserProfile = lazy(() => import("./pages/UserProfile.jsx"));
const PaymentSettings = lazy(() => import("./pages/PaymentSettings.jsx"));
const Leads = lazy(() => import("./pages/Leads.jsx"));
const InactiveProjects = lazy(() => import("./pages/InactiveProjects.jsx"));
const MessagePage = lazy(() => import("./pages/MessagePage.jsx"));
const SmsSettingsPage = lazy(() => import("./pages/SmsSettingsPage.jsx"));
const GlaciersAiSettings = lazy(() => import("./pages/GlaciersAiSettings.jsx"));
const ProjectReport = lazy(() => import("./pages/ProjectReport.jsx"));
const EstimateReport = lazy(() => import("./pages/EstimateReport.jsx"));
const InvoiceReport = lazy(() => import("./pages/InvoiceReport.jsx"));
const InventoryLogReport = lazy(() => import("./pages/InventoryLogReport"));
const MaterialOrderReport = lazy(() => import("./pages/MaterialOrderReport"));
const CustomReport = lazy(() => import("./pages/CustomReport"));
const AddCustomReport = lazy(() => import("./pages/AddCustomReport"));
const CustomReportHistory = lazy(() => import("./pages/CustomReportHistory"));
const CustomReportView = lazy(() => import("./pages/CustomReportView"));



// Super Admin
const SuperDashboard = lazy(() => import("./pages/super-admin/SuperDashboard.jsx"));
const Tenant = lazy(() => import("./pages/super-admin/Tenant.jsx"));
const SuperAdminProfile = lazy(() => import("./pages/super-admin/ProfilePage.jsx"));

/* ------------------ LOADER ------------------ */

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-lg font-semibold animate-pulse">Loading...</div>
  </div>
);

/* ------------------ LAYOUT ------------------ */

function AppLayout() {
  const location = useLocation();
  const currentPageName = location.pathname.split("/").pop() || "Dashboard";
  const capitalizedPageName =
    currentPageName.charAt(0).toUpperCase() + currentPageName.slice(1);

  return (
    <Layout currentPageName={capitalizedPageName}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

/* ------------------ APP ------------------ */

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>

          {/* -------- PUBLIC ROUTES -------- */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/publicinvoice" element={<PublicInvoice />} />
          <Route path="/publicpay" element={<PublicPay />} />
          <Route path="/pay" element={<PublicPaymentPage />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/resetPassword" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/sms-policy" element={<SmsPolicy />} />
          <Route path="/" element={<AboutUs />} />

          {/* -------- PROTECTED ROUTES -------- */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/projects" element={<Projects />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />

              <Route path="/customers/:id" element={<CustomerDetails />} />

              <Route path="/estimates" element={<Estimates />} />
              <Route path="/estimate/:id" element={<EstimateDetails />} />
              <Route path="/estimate-accepted" element={<EstimateAccepted />} />

              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:id" element={<InvoiceDetails />} />
              <Route path="/payment-history" element={<PaymentHistory />} />

              <Route path="/material-orders" element={<MaterialOrders />} />
              <Route path="/material-orders/:id" element={<MaterialOrderDetails />} />

              <Route path="/inventory" element={<Inventory />} />
              <Route path="/time-entry" element={<TimeEntry />} />
              <Route path="/user-management" element={<UserManagement />} />

              <Route path="/master-data-management" element={<MasterDataManagement />} />
              <Route path="/suppliers" element={<Suppliers />} />

              <Route path="/userProfile/:id" element={<UserProfile />} />
              <Route path="/payment-settings" element={<PaymentSettings />} />
              <Route path="/sms-settings" element={<SmsSettingsPage />} />
              <Route path="/glaciers-ai" element={<GlaciersAiSettings />} />

              <Route path="/leads" element={<Leads />} />
              <Route path="/message" element={<MessagePage />} />
              <Route path="/inactive-projects" element={<InactiveProjects />} />
              <Route path="/inactive-projects/:id" element={<ProjectDetails />} />
              <Route path="/project-report" element={<ProjectReport />} />
              <Route path="/estimate-report" element={<EstimateReport />} />
              <Route path="/invoice-report" element={<InvoiceReport />} />
              <Route path="/material-order-report" element={<MaterialOrderReport />} />
              <Route path="/inventory-log-report" element={<InventoryLogReport />} />
              <Route path="/custom-report" element={<CustomReport />} />
              <Route path="/custom-report/create" element={<AddCustomReport />} />
              <Route path="/custom-report/edit/:id" element={<AddCustomReport />} />
              <Route path="/custom-report/history/:id" element={<CustomReportHistory />} />
              <Route path="/custom-report/view/:id" element={<CustomReportView />} />


              {/* SUPER ADMIN */}
              <Route path="/super-admin/dashboard" element={<SuperDashboard />} />
              <Route path="/super-admin/tenant" element={<Tenant />} />
              <Route path="/super-admin/profile" element={<SuperAdminProfile />} />

            </Route>
          </Route>

          {/* -------- PRINT / PAYMENT ROUTES -------- */}
          <Route path="/estimate-print" element={<EstimatePrint />} />
          <Route path="/estimate/estimate-print/:id" element={<EstimatePrint />} />

          {/* -------- FALLBACK -------- */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>

      <Toaster />
    </BrowserRouter>
  );
}

export default App;
