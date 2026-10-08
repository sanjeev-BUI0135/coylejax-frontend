import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Projects from "./Projects";

import Customers from "./Customers";

import Estimates from "./Estimates";

import ProjectDetails from "./ProjectDetails";

import EstimatePrint from "./EstimatePrint";

import Invoices from "./Invoices";

import InvoicePrint from "./InvoicePrint";

import CustomerDetails from "./CustomerDetails";

import MaterialOrders from "./MaterialOrders";

import MaterialOrderDetails from "./MaterialOrderDetails";

import Inventory from "./Inventory";

import EstimateAccepted from "./EstimateAccepted";

import TimeEntry from "./TimeEntry";

import UserManagement from "./UserManagement";

import InvoiceDetails from "./InvoiceDetails";

import PublicInvoice from "./PublicInvoice";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Projects: Projects,
    
    Customers: Customers,
    
    Estimates: Estimates,
    
    ProjectDetails: ProjectDetails,
    
    EstimatePrint: EstimatePrint,
    
    Invoices: Invoices,
    
    InvoicePrint: InvoicePrint,
    
    CustomerDetails: CustomerDetails,
    
    MaterialOrders: MaterialOrders,
    
    MaterialOrderDetails: MaterialOrderDetails,
    
    Inventory: Inventory,
    
    EstimateAccepted: EstimateAccepted,
    
    TimeEntry: TimeEntry,
    
    UserManagement: UserManagement,
    
    InvoiceDetails: InvoiceDetails,
    
    PublicInvoice: PublicInvoice,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/Customers" element={<Customers />} />
                
                <Route path="/Estimates" element={<Estimates />} />
                
                <Route path="/ProjectDetails" element={<ProjectDetails />} />
                
                <Route path="/EstimatePrint" element={<EstimatePrint />} />
                
                <Route path="/Invoices" element={<Invoices />} />
                
                <Route path="/InvoicePrint" element={<InvoicePrint />} />
                
                <Route path="/CustomerDetails" element={<CustomerDetails />} />
                
                <Route path="/MaterialOrders" element={<MaterialOrders />} />
                
                <Route path="/MaterialOrderDetails" element={<MaterialOrderDetails />} />
                
                <Route path="/Inventory" element={<Inventory />} />
                
                <Route path="/EstimateAccepted" element={<EstimateAccepted />} />
                
                <Route path="/TimeEntry" element={<TimeEntry />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/InvoiceDetails" element={<InvoiceDetails />} />
                
                <Route path="/PublicInvoice" element={<PublicInvoice />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}