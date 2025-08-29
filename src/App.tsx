import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Daylin from "./pages/Daylin";
import Premios from "./pages/Premios";
import Ranking from "./pages/Ranking";
import AssistenteAI from "./pages/AssistenteAI";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/daylin" element={<Layout />}>
              <Route index element={<Daylin />} />
            </Route>
            <Route path="/premios" element={<Layout />}>
              <Route index element={<Premios />} />
            </Route>
            <Route path="/ranking" element={<Layout />}>
              <Route index element={<Ranking />} />
            </Route>
            <Route path="/assistente" element={<Layout />}>
              <Route index element={<AssistenteAI />} />
            </Route>
            <Route path="/configuracoes" element={<Layout />}>
              <Route index element={<Configuracoes />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
