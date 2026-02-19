import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./context/ThemeContext";
import VisitorChat from "./pages/VisitorChat";
import AgentLogin from "./pages/AgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<VisitorChat />} />
            <Route path="/chat" element={<VisitorChat />} />
            <Route path="/chat/:sessionId" element={<VisitorChat />} />
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </ThemeProvider>
  );
}

export default App;
