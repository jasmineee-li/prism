import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ArxivPaper {
  id?: string;
  title: string;
  authors: string[];
  abstract: string;
  pdf_url: string;
  arxiv_id: string;
  updated: string;
  filename?: string;
  public_url?: string;
  analysis_complete: boolean;
  error?: string;
}

export function ArxivGallery() {
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArxivPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/arxiv");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch papers");
      }

      setPapers(data.papers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const truncateAbstract = (abstract: string, maxLength: number = 200) => {
    if (abstract.length <= maxLength) return abstract;
    return abstract.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Recent Statistics Papers from arXiv
          </h2>
          <p className="text-muted-foreground">
            Latest 10 papers from stat.AP (Statistics - Applications) category
          </p>
        </div>
        <Button onClick={fetchArxivPapers} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching & Analyzing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Fetch Latest Papers
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Papers Grid */}
      {papers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {papers.map((paper, index) => (
            <Card
              key={paper.arxiv_id || index}
              className="h-full flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {paper.title}
                  </CardTitle>
                  <div className="flex gap-2 shrink-0">
                    {paper.analysis_complete ? (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Analyzed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>arXiv:{paper.arxiv_id}</span>
                  <span>{formatDate(paper.updated)}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                {/* Authors */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Authors:
                  </p>
                  <p className="text-sm">
                    {paper.authors.slice(0, 3).join(", ")}
                    {paper.authors.length > 3 &&
                      ` +${paper.authors.length - 3} more`}
                  </p>
                </div>

                {/* Abstract */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Abstract:
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {truncateAbstract(paper.abstract)}
                  </p>
                </div>

                {/* Error Message */}
                {paper.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {paper.error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {paper.analysis_complete && paper.id ? (
                    <Button asChild size="sm" className="flex-1">
                      <a href={`/documents/${paper.id}`}>View Analysis</a>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on arXiv
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && papers.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Click "Fetch Latest Papers" to load recent statistics papers from
            arXiv
          </p>
        </div>
      )}
    </div>
  );
}
