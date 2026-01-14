import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.products.importFromCsv.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      if (result.errors.length > 0) {
        toast.error(
          `${result.errors.length} rows failed: ${result.errors.map((e) => `Row ${e.row}: ${e.error}`).join("; ")}`
        );
      }
      setCsvContent("");
      setOpen(false);
      // Refetch products
      trpc.useUtils().products.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import CSV");
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content or select a file");
      return;
    }

    setIsLoading(true);
    try {
      await importMutation.mutateAsync({ csvContent });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = () => {
    const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10
https://morele.net/another-product/,10751840,120,15
,10751841,60,10
https://morele.net/third-product/,,90,5`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-products.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with product URLs or codes. Format: url,productCode,checkIntervalMinutes,priceAlertThreshold
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>

          {/* Or paste CSV */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Or Paste CSV Content</label>
            <Textarea
              placeholder="url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10
,10751840,120,15"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="h-32 font-mono text-xs"
            />
          </div>

          {/* Sample Download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadSample}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Sample CSV
          </Button>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isLoading || !csvContent.trim()}
            className="w-full gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Importing..." : "Import Products"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
