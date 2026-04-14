import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export interface DetectedTemplate {
  id: number;
  websiteName: string;
  selectors: Record<string, string>;
  defaultCategory: string | null;
  defaultImageUrl: string | null;
}

export interface TemplateDetectionResult {
  exists: boolean;
  template: DetectedTemplate | null;
}

export function useTemplateDetection() {
  const [productUrl, setProductUrl] = useState<string>("");
  const [detectedTemplate, setDetectedTemplate] = useState<DetectedTemplate | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Query is disabled until we have a valid URL
  const { data, isLoading, error } = trpc.templates.checkExists.useQuery(
    { productUrl },
    { enabled: productUrl.length > 0 }
  );

  useEffect(() => {
    if (data) {
      if (data.exists && data.template) {
        setDetectedTemplate(data.template);
        setDetectionError(null);
      } else {
        setDetectedTemplate(null);
        setDetectionError(null);
      }
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setDetectionError(error.message || "Failed to detect template");
      setDetectedTemplate(null);
    }
  }, [error]);

  const detectTemplate = useCallback((url: string) => {
    if (!url.trim()) {
      setProductUrl("");
      setDetectedTemplate(null);
      setDetectionError(null);
      return;
    }

    // Validate URL format
    let urlToCheck = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      urlToCheck = "https://" + url;
    }

    setProductUrl(urlToCheck);
  }, []);

  const clearDetection = useCallback(() => {
    setProductUrl("");
    setDetectedTemplate(null);
    setDetectionError(null);
  }, []);

  return {
    detectedTemplate,
    isDetecting: isLoading,
    detectionError,
    detectTemplate,
    clearDetection,
  };
}
