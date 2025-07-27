import { DocumentGallery } from "@/components/DocumentGallery";

export default function DocumentsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">My Documents</h2>
      <DocumentGallery />
    </div>
  );
}
