import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { PDFViewer } from "./PDFViewer";
import { FileUpload } from "./FileUpload";
import { ResultsTab } from "./ResultsTab";
import { AssistantTab } from "./AssistantTab";
import { DocumentGallery } from "./DocumentGallery";
import { BarChart3, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function MainLayout() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="bg-surface border-b border-border-light">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-text-primary">Prism</h1>
          <p className="text-muted-foreground">
            Upload and analyze research papers with StatCheck and GRIM tests
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {!selectedFile ? (
          /* Home State: Upload + Gallery */
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="max-w-2xl mx-auto">
              <FileUpload
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground font-medium">
                Previously Analyzed Documents
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Gallery */}
            <DocumentGallery />
          </div>
        ) : (
          /* Analysis State */
          <div className="h-[calc(100vh-80px)]">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* PDF Viewer - Left Side */}
              <ResizablePanel defaultSize={65} minSize={30}>
                <div className="h-full overflow-y-auto">
                  <PDFViewer file={selectedFile} />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Sidebar - Right Side */}
              <ResizablePanel defaultSize={35} minSize={25}>
                <Card className="h-full flex flex-col bg-surface border-border-light shadow-medium ml-2">
                  <Tabs defaultValue="results" className="h-full">
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
                      className="h-[calc(100%-80px)] overflow-y-auto"
                    >
                      <ResultsTab file={selectedFile} />
                    </TabsContent>

                    <TabsContent
                      value="assistant"
                      className="h-[calc(100%-80px)] overflow-y-auto"
                    >
                      <AssistantTab file={selectedFile} />
                    </TabsContent>
                  </Tabs>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </main>
    </div>
  );
}
