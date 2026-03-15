import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import OfflineBanner from "./components/OfflineBanner";

// Lazy-loaded pages for code splitting (better Core Web Vitals)
const Browse = lazy(() => import("./pages/Browse"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const MyListings = lazy(() => import("./pages/MyListings"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminListings = lazy(() => import("./pages/admin/AdminListings"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const AdminWARelay = lazy(() => import("./pages/admin/AdminWARelay"));
const AdminSearchAnalytics = lazy(() => import("./components/admin/SearchAnalytics"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminStats = lazy(() => import("./pages/admin/AdminStats"));
const About = lazy(() => import("./pages/About"));
const Safety = lazy(() => import("./pages/Safety"));
const Rules = lazy(() => import("./pages/Rules"));
const VIP = lazy(() => import("./pages/VIP"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Messages = lazy(() => import("./pages/Messages"));
const TrustBadges = lazy(() => import("./pages/TrustBadges"));
const PointsShop = lazy(() => import("./pages/PointsShop"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const ProSubscription = lazy(() => import("./pages/ProSubscription"));
const Contact = lazy(() => import("./pages/Contact"));
const BlockedUsers = lazy(() => import("./pages/BlockedUsers"));
const BusinessServices = lazy(() => import("./pages/BusinessServices"));
const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const FAQ = lazy(() => import("./pages/FAQ"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min — avoid refetch on every navigation
      gcTime: 10 * 60 * 1000,      // 10 min garbage collection
      retry: 1,                     // single retry on failure
      refetchOnWindowFocus: false,  // no auto-refetch on tab switch
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Prefetch critical routes after initial load
const usePrefetchRoutes = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./pages/Browse");
      import("./pages/ListingDetail");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
};

const App = () => {
  usePrefetchRoutes();
  return (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineBanner />
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/create" element={<CreateListing />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="listings" element={<AdminListings />} />
                    <Route path="security" element={<AdminSecurity />} />
                    <Route path="wa-relay" element={<AdminWARelay />} />
                    <Route path="search-analytics" element={<AdminSearchAnalytics />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="stats" element={<AdminStats />} />
                  </Route>
                  <Route path="/about" element={<About />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/vip" element={<VIP />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/trust-badges" element={<TrustBadges />} />
                  <Route path="/points" element={<PointsShop />} />
                  <Route path="/dashboard" element={<SellerDashboard />} />
                  <Route path="/pro-subscription" element={<ProSubscription />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blocked-users" element={<BlockedUsers />} />
                  <Route path="/business-services" element={<BusinessServices />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/coming-soon" element={<ComingSoon />} />
                  
                  <Route path="/seller/:id" element={<SellerProfile />} />
                  <Route path="/business/:id" element={<BusinessPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
