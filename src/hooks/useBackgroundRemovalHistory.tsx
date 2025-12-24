import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface BackgroundRemovalRecord {
  id: string;
  original_image_url: string;
  processed_image_url: string;
  created_at: string;
}

export function useBackgroundRemovalHistory() {
  const [history, setHistory] = useState<BackgroundRemovalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("background_removal_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("useBackgroundRemovalHistory", error);
    } else {
      setHistory(data || []);
    }
    setIsLoading(false);
  };

  const saveToHistory = async (originalBlob: Blob, processedBlob: Blob) => {
    const timestamp = Date.now();
    const originalPath = `original/${timestamp}.png`;
    const processedPath = `processed/${timestamp}.png`;

    // Upload original image
    const { error: origError } = await supabase.storage
      .from("background-removal")
      .upload(originalPath, originalBlob, { contentType: "image/png" });

    if (origError) {
      logger.error("useBackgroundRemovalHistory", origError);
      return null;
    }

    // Upload processed image
    const { error: procError } = await supabase.storage
      .from("background-removal")
      .upload(processedPath, processedBlob, { contentType: "image/png" });

    if (procError) {
      logger.error("useBackgroundRemovalHistory", procError);
      return null;
    }

    // Get signed URLs since bucket is private
    const { data: origUrlData, error: origUrlError } = await supabase.storage
      .from("background-removal")
      .createSignedUrl(originalPath, 3600);

    const { data: procUrlData, error: procUrlError } = await supabase.storage
      .from("background-removal")
      .createSignedUrl(processedPath, 3600);

    if (origUrlError || procUrlError || !origUrlData?.signedUrl || !procUrlData?.signedUrl) {
      logger.error("useBackgroundRemovalHistory", origUrlError || procUrlError);
      return null;
    }

    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error("useBackgroundRemovalHistory", new Error("User not authenticated"));
      return null;
    }

    // Save to database
    const { data, error } = await supabase
      .from("background_removal_history")
      .insert({
        original_image_url: origUrlData.signedUrl,
        processed_image_url: procUrlData.signedUrl,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("useBackgroundRemovalHistory", error);
      return null;
    }

    // Refresh history
    fetchHistory();
    return data;
  };

  const deleteFromHistory = async (id: string, originalUrl: string, processedUrl: string) => {
    // Extract paths from URLs
    const extractPath = (url: string) => {
      const match = url.match(/background-removal\/(.+)$/);
      return match ? match[1] : null;
    };

    const origPath = extractPath(originalUrl);
    const procPath = extractPath(processedUrl);

    // Delete from storage
    if (origPath) {
      await supabase.storage.from("background-removal").remove([origPath]);
    }
    if (procPath) {
      await supabase.storage.from("background-removal").remove([procPath]);
    }

    // Delete from database
    const { error } = await supabase
      .from("background_removal_history")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("useBackgroundRemovalHistory", error);
      return false;
    }

    fetchHistory();
    return true;
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    isLoading,
    saveToHistory,
    deleteFromHistory,
    refreshHistory: fetchHistory,
  };
}
