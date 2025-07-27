import { useEffect, useState } from "react";
import { DocumentCard } from "./DocumentCard";
import { Loader2 } from "lucide-react";

interface DocumentMeta {
  id: string;
  filename: string;
  public_url: string;
  uploaded_at: string;
}

export function DocumentGallery() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/documents")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setDocs(data.documents ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground">
          No documents uploaded yet. Upload a PDF to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {docs.map((doc) => (
        <DocumentCard
          key={doc.id}
          id={doc.id}
          filename={doc.filename}
          uploadedAt={doc.uploaded_at}
        />
      ))}
    </div>
  );
}
