import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddProductDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductDialog({ onClose, onSuccess }: AddProductDialogProps) {
  const [activeTab, setActiveTab] = useState<"url" | "code">("url");
  const [url, setUrl] = useState("");
  const [productCode, setProductCode] = useState("");

  const createProductMutation = trpc.products.create.useMutation();

  const handleSubmit = async () => {
    try {
      if (activeTab === "url" && !url.trim()) {
        toast.error("Please enter a product URL");
        return;
      }

      if (activeTab === "code" && !productCode.trim()) {
        toast.error("Please enter a product code");
        return;
      }

      await createProductMutation.mutateAsync({
        url: activeTab === "url" ? url : undefined,
        productCode: activeTab === "code" ? productCode : undefined,
      });

      toast.success("Product added successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Add a product from morele.net by URL or product code
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "url" | "code")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">By URL</TabsTrigger>
            <TabsTrigger value="code">By Product Code</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Product URL</Label>
              <Input
                id="url"
                placeholder="https://morele.net/product-name-12345678.html"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={createProductMutation.isPending}
              />
              <p className="text-xs text-gray-500">
                Paste the full URL from morele.net product page
              </p>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Product Code</Label>
              <Input
                id="code"
                placeholder="12345678"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                disabled={createProductMutation.isPending}
              />
              <p className="text-xs text-gray-500">
                Enter the product code (number at the end of the URL)
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createProductMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Add Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
