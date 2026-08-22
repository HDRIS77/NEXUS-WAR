/* Design: Atlas Operations — the app opens directly into an asymmetric command room. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

export default function App() {
  return <ErrorBoundary><TooltipProvider><Toaster position="bottom-left" /><Home /></TooltipProvider></ErrorBoundary>;
}
