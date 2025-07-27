import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DocumentCardProps {
  id: string;
  filename: string;
  thumbnailUrl?: string | null;
  uploadedAt: string;
}

export function DocumentCard({ id, filename, uploadedAt }: DocumentCardProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/documents/${id}`);
  }, [navigate, id]);

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer hover:shadow-lg transition-shadow"
    >
      <CardHeader className="p-4 pb-2 flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-sm truncate max-w-full">
          {filename}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground">
          Uploaded: {new Date(uploadedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
