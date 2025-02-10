import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";
import { Loader2, Download, Eye, File } from "lucide-react";

export default function RequestAccessPage() {
  const { userId } = useParams();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [pin, setPin] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Fetch documents for the owner
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/${userId}`],
    enabled: !!userId,
  });

  // Verify PIN mutation
  const verifyPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", `/api/verify-pin/${userId}`, { pin });
      return res.ok;
    },
    onSuccess: (isValid) => {
      if (isValid) {
        setIsOwner(true);
        toast({
          title: "Authentication successful",
          description: "You have been verified as the document owner.",
        });
      } else {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleRequestAccess = async () => {
    if (!selectedDocs.length) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to request access.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRequesting(true);
      await apiRequest("POST", "/api/access-requests", {
        userId: Number(userId),
        requestedDocuments: selectedDocs,
        location: window.location.hostname,
      });

      toast({
        title: "Access request sent",
        description: "The document owner will review your request.",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCheckboxChange = (docId: number) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleDownload = (docId: number, format?: string) => {
    let url = `/api/documents/${docId}/download`;
    if (format) {
      url += `?format=${format}`;
    }
    window.open(url);
  };

  const handleView = (doc: Document) => {
    setViewingDoc(doc);
    setShowViewer(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request Document Access</CardTitle>
        </CardHeader>
        <CardContent>
          {!isOwner && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Enter your PIN if you are the document owner:
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                />
                <Button 
                  onClick={() => verifyPinMutation.mutate(pin)}
                  disabled={!pin || verifyPinMutation.isPending}
                >
                  {verifyPinMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Verify
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isOwner 
                ? "Your documents - You have full access:"
                : "Select documents to request access:"}
            </p>

            {documents?.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {!isOwner && (
                    <Checkbox
                      id={`doc-${doc.id}`}
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => handleCheckboxChange(doc.id)}
                    />
                  )}
                  <label
                    htmlFor={`doc-${doc.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {doc.name}
                  </label>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Select onValueChange={(format) => handleDownload(doc.id, format)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Download as..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word (DOCX)</SelectItem>
                        <SelectItem value="png">Image (PNG)</SelectItem>
                        <SelectItem value="original">Original Format</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isOwner && (
            <Button
              className="w-full mt-6"
              onClick={handleRequestAccess}
              disabled={isRequesting || selectedDocs.length === 0}
            >
              {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Access
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              {viewingDoc?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingDoc && (
            <div className="flex-1 h-full overflow-auto">
              <iframe
                src={`/api/documents/${viewingDoc.id}/view`}
                className="w-full h-full border-0"
                title={viewingDoc.name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}