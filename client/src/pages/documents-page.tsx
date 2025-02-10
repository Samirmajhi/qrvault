import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Pencil, Trash2, Download, QrCode } from "lucide-react";

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/documents", formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully" });
      setSelectedFile(null);
      setCustomName("");
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Delete failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/documents/${id}`, { name });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to rename document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document renamed successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Rename failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCustomName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !customName || isUploading) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", customName);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Document Management</h1>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid gap-4">
              <Input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt"
                disabled={isUploading}
              />
              <Input
                placeholder="Custom document name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={isUploading}
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !customName || isUploading}
              >
                {isUploading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload Document
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.name}</TableCell>
                  <TableCell>{doc.contentType}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newName = prompt("Enter new name:", doc.name);
                          if (newName && newName !== doc.name) {
                            renameMutation.mutate({ id: doc.id, name: newName });
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/api/documents/${doc.id}/download`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this document?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => setShowQRDialog(true)}
            disabled={!documents?.length}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Generate QR Code
          </Button>
        </div>

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Document Access QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG
                value={`${window.location.origin}/request-access/${user?.id}`}
                size={256}
              />
              <Button onClick={() => setShowQRDialog(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}