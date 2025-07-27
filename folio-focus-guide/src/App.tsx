import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecoilRoot } from "recoil";
import { ChainlitAPI, ChainlitContext } from "@chainlit/react-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DocumentsPage from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const chainlitApi = new ChainlitAPI("http://localhost:8000", "webapp");

const App = () => (
  <ChainlitContext.Provider value={chainlitApi}>
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </RecoilRoot>
  </ChainlitContext.Provider>
);

export default App;
