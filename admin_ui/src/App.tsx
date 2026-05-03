import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ContentManagement from "./pages/ContentManagement";
import QuestionBank from "./pages/QuestionBank";
import CodingProblems from "./pages/CodingProblems";
import Templates from "./pages/Templates";
import Rubrics from "./pages/Rubrics";
import Scheduling from "./pages/Scheduling";
import LiveMonitoring from "./pages/LiveMonitoring";
import ReviewQueue from "./pages/ReviewQueue";
import Governance from "./pages/Governance";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><Layout><ContentManagement /></Layout></ProtectedRoute>} />
            <Route path="/content/questions" element={<ProtectedRoute><Layout><QuestionBank /></Layout></ProtectedRoute>} />
            <Route path="/content/coding" element={<ProtectedRoute><Layout><CodingProblems /></Layout></ProtectedRoute>} />
            <Route path="/content/templates" element={<ProtectedRoute><Layout><Templates /></Layout></ProtectedRoute>} />
            <Route path="/content/rubrics" element={<ProtectedRoute><Layout><Rubrics /></Layout></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute><Layout><Scheduling /></Layout></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute><Layout><LiveMonitoring /></Layout></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><Layout><ReviewQueue /></Layout></ProtectedRoute>} />
            <Route path="/governance" element={<ProtectedRoute><Layout><Governance /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
