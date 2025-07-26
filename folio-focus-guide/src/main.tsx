import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Configure PDF.js worker
import { pdfjs } from "react-pdf";
// Resolve worker file URL via import.meta.url
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

createRoot(document.getElementById("root")!).render(<App />);
