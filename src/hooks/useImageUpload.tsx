import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
  size: number;
}

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<UploadedImage | null> => {
    setIsUploading(true);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return null;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 10MB.",
          variant: "destructive",
        });
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      const uploadedImage: UploadedImage = {
        id: data.path,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size
      };

      toast({
        title: "Image uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      return uploadedImage;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the image.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading
  };
};