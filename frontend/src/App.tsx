import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Initialize recording uploader queue on app load
import "@/lib/recordingUploader";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import Profile from "./pages/candidate/Profile";
import Interviews from "./pages/candidate/Interviews";
import InterviewWindowDetail from "./pages/candidate/InterviewWindowDetail";
import Practice from "./pages/candidate/Practice";
import Roadmap from "./pages/candidate/Roadmap";
import InterviewPrep from "./pages/candidate/InterviewPrep";
import Reports from "./pages/candidate/Reports";
import InterviewLobby from "./pages/InterviewLobby";
import InterviewSession from "./pages/InterviewSession";
import InterviewComplete from "./pages/InterviewComplete";
import InterviewReport from "./pages/InterviewReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signup" element={<Register />} />

          {/* Candidate Routes */}
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/profile" element={<Profile />} />
          <Route path="/candidate/interviews" element={<Interviews />} />
          <Route path="/candidate/interviews/:id" element={<InterviewWindowDetail />} />
          <Route path="/candidate/practice" element={<Practice />} />
          <Route path="/candidate/roadmap" element={<Roadmap />} />
          <Route path="/candidate/interview-prep" element={<InterviewPrep />} />
          <Route path="/candidate/reports" element={<Reports />} />
          <Route path="/candidate/reports/:id" element={<InterviewReport />} />
          <Route path="/candidate/settings" element={<Navigate to="/candidate/profile?section=notifications" replace />} />

          {/* Interview Runtime */}
          <Route path="/interview/lobby" element={<InterviewLobby />} />
          <Route path="/interview/session" element={<InterviewSession />} />
          <Route path="/interview/complete" element={<InterviewComplete />} />

          {/* Legacy routes — redirect to candidate portal */}
          <Route path="/dashboard" element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="/roadmap" element={<Navigate to="/candidate/roadmap" replace />} />
          <Route path="/prep" element={<Navigate to="/candidate/interview-prep" replace />} />
          <Route path="/reports/:id" element={<InterviewReport />} />
          <Route path="/reports" element={<Navigate to="/candidate/reports" replace />} />
          <Route path="/interviews" element={<Navigate to="/candidate/interviews" replace />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
