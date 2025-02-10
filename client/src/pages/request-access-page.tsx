import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function RequestAccessPage() {
  const { userId } = useParams();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAccess = async () => {
    try {
      setIsRequesting(true);
      await apiRequest("POST", "/api/access-requests", {
        userId: Number(userId),
        requestedDocuments: ["all"],
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request Document Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            You are requesting access to documents from user ID: {userId}
          </p>
          <Button
            className="w-full"
            onClick={handleRequestAccess}
            disabled={isRequesting}
          >
            {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Access
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
