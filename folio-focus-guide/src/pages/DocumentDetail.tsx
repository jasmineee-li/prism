import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PDFViewer } from "@/components/PDFViewer";
import { ResultsTab } from "@/components/ResultsTab";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface DocumentRecord {
  id: string;
  filename: string;
  public_url: string;
  results: any;
}

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`http://127.0.0.1:5000/api/documents/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setDoc(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="p-8 text-center">Loading...</p>;
  }
  if (error) {
    return <p className="p-8 text-center text-red-500">{error}</p>;
  }
  if (!doc) {
    return <p className="p-8 text-center">Document not found.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">{doc.filename}</h2>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-[calc(100vh-160px)]"
      >
        <ResizablePanel defaultSize={65} minSize={30}>
          <PDFViewer url={doc.public_url} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={25}>
          <Card className="h-full flex flex-col bg-surface border-border-light shadow-medium ml-2">
            <div className="flex items-center gap-2 p-4 border-b border-border-light">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Results</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ResultsTab documentId={doc.id} />
            </div>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
