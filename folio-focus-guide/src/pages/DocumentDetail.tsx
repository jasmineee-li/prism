import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PDFViewer } from "@/components/PDFViewer";
import { ResultsTab } from "@/components/ResultsTab";
import { AssistantTab } from "@/components/AssistantTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
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
            <Tabs defaultValue="results" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                <TabsTrigger
                  value="results"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger
                  value="assistant"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Assistant
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="results"
                className="flex-1 m-0 overflow-hidden"
              >
                <ResultsTab documentId={doc.id} />
              </TabsContent>

              <TabsContent
                value="assistant"
                className="flex-1 m-0 overflow-hidden"
              >
                <AssistantTab documentId={doc.id} />
              </TabsContent>
            </Tabs>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
