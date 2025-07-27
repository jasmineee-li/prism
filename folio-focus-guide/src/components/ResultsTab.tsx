import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  BarChart3,
  FileText,
  Loader2,
} from "lucide-react";

interface ResultsTabProps {
  file?: File | null;
  documentId?: string | null;
}

interface StatTestResult {
  test: string;
  p_value?: number;
  reported_p?: number;
  significant: boolean;
  note: string;
  source?: string;
  df1?: number;
  df2?: number;
  test_statistic?: number;
}

interface GrimResult {
  sentence: string;
  mean: number;
  n: number;
  passed: boolean | null;
  reason: string;
  confidence: number;
}

interface AnalysisResults {
  stat_tests: StatTestResult[];
  grim_checks: GrimResult[];
}

async function uploadAndAnalyze(file: File): Promise<AnalysisResults> {
  console.log(
    "uploadAndAnalyze called with file:",
    file.name,
    "size:",
    file.size
  );

  const formData = new FormData();
  formData.append("file", file);

  console.log("FormData created, making POST request to /api/upload");

  try {
    const response = await fetch("http://127.0.0.1:5000/api/upload", {
      method: "POST",
      body: formData,
      mode: "cors",
    });

    console.log("Response received:", response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      // Clone the response to read it multiple times if needed
      const responseClone = response.clone();

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        console.error("Failed to parse error response as JSON:", jsonError);
        try {
          const textResponse = await responseClone.text();
          console.error("Error response text:", textResponse);
          errorMessage = textResponse || errorMessage;
        } catch (textError) {
          console.error("Failed to parse error response as text:", textError);
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("Upload successful, received data:", data);
    return data.results;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export function ResultsTab({
  file = null,
  documentId = null,
}: ResultsTabProps) {
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);

      uploadAndAnalyze(file)
        .then((analysisResults) => {
          setResults(analysisResults);
        })
        .catch((err) => {
          setError(err.message);
          console.error("Analysis failed:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (documentId) {
      // Fetch analysis results for stored document
      setLoading(true);
      setError(null);
      fetch(`http://127.0.0.1:5000/api/documents/${documentId}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const data = await res.json();
          return data.results;
        })
        .then((analysisResults) => {
          setResults(analysisResults);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => setLoading(false));
    } else {
      setResults(null);
      setError(null);
    }
  }, [file, documentId]);

  if (!file && !documentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Document Uploaded</h3>
        <p className="text-muted-foreground">
          Upload a PDF document to run StatCheck and GRIM tests
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Loader2 className="h-16 w-16 text-muted-foreground mb-4 animate-spin" />
        <h3 className="text-lg font-semibold mb-2">Analyzing Document</h3>
        <p className="text-muted-foreground">
          Running StatCheck and GRIM tests on your PDF...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Analysis Failed</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <p className="text-sm text-muted-foreground">
          Please try uploading a different PDF or contact support if the issue
          persists.
        </p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
        <p className="text-muted-foreground">
          Upload a PDF document to see analysis results
        </p>
      </div>
    );
  }

  const grimResults = results.grim_checks;
  const statResults = results.stat_tests;

  return (
    <div className="space-y-6 p-4">
      {/* GRIM Test Results */}
      {grimResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              GRIM Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {grimResults.map((grim, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {grim.passed === true ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : grim.passed === false ? (
                      <XCircle className="h-6 w-6 text-red-600" />
                    ) : (
                      <div className="h-6 w-6 bg-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">?</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {grim.passed === true
                          ? "GRIM Test Passed"
                          : grim.passed === false
                          ? "GRIM Test Failed"
                          : "GRIM Test Inconclusive"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mean: {grim.mean}, N: {grim.n}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {grim.reason}
                      </p>
                      {grim.sentence && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{grim.sentence.substring(0, 100)}..."
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      grim.passed === true
                        ? "default"
                        : grim.passed === false
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {Math.round(grim.confidence * 100)}% confidence
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* StatCheck Results */}
      {statResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              StatCheck Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border-light"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{result.test}</span>
                      {result.significant ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result.note}
                    </p>
                    {result.source && (
                      <p className="text-xs text-muted-foreground">
                        Source: {result.source}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    {result.p_value !== null && (
                      <div className="text-sm font-mono">
                        p = {result.p_value?.toFixed(4)}
                      </div>
                    )}
                    {result.reported_p !== null && (
                      <div className="text-sm font-mono text-muted-foreground">
                        reported: {result.reported_p?.toFixed(4)}
                      </div>
                    )}
                    {result.test_statistic !== null && (
                      <div className="text-sm font-mono">
                        {result.test.includes("t")
                          ? "t"
                          : result.test.includes("F")
                          ? "F"
                          : "stat"}{" "}
                        = {result.test_statistic?.toFixed(3)}
                      </div>
                    )}
                    {(result.df1 !== null || result.df2 !== null) && (
                      <div className="text-sm font-mono text-muted-foreground">
                        df: {result.df1 || "?"}, {result.df2 || "?"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total StatCheck tests:</span>
              <span className="font-medium">{statResults.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">StatCheck tests passed:</span>
              <span className="font-medium text-green-600">
                {statResults.filter((r) => r.significant).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total GRIM tests:</span>
              <span className="font-medium">{grimResults.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">GRIM tests passed:</span>
              <span className="font-medium text-green-600">
                {grimResults.filter((g) => g.passed === true).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">GRIM tests failed:</span>
              <span className="font-medium text-red-600">
                {grimResults.filter((g) => g.passed === false).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
