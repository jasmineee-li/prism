import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  file?: File | null;
  url?: string | null;
}

export function PDFViewer({ file = null, url = null }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const { toast } = useToast();

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    },
    []
  );

  const onDocumentLoadError = useCallback(() => {
    toast({
      title: "Error loading PDF",
      description: "Please make sure the file is a valid PDF document.",
      variant: "destructive",
    });
  }, [toast]);

  const changeScale = useCallback((delta: number) => {
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const source = file ? file : url ? url : null;

  if (!source) {
    return (
      <div className="flex items-center justify-center h-full bg-surface border border-border-light rounded-lg">
        <p className="text-muted-foreground">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface border border-border-light rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-surface border-b border-border-light">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeScale(-0.2)}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeScale(0.2)}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="flex justify-center p-4">
          <Document
            file={source}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            {/* Render all pages */}
            <div className="space-y-4">
              {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-medium rounded-lg overflow-hidden"
                />
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
