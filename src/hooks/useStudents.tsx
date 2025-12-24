import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  imageUrl?: string;
  createdAt: string;
}

interface DbStudent {
  id: string;
  name: string;
  roll_no: string;
  image_url: string | null;
  created_at: string;
}

export const useStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const mapDbToStudent = (db: DbStudent): Student => ({
    id: db.id,
    name: db.name,
    rollNo: db.roll_no,
    imageUrl: db.image_url || undefined,
    createdAt: db.created_at,
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
      console.error("Error fetching students:", error);
    } else {
      setStudents((data as DbStudent[]).map(mapDbToStudent));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const uploadPhoto = async (file: Blob, studentId: string): Promise<string | null> => {
    const fileExt = "jpg";
    const fileName = `${studentId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("student-photos")
      .getPublicUrl(filePath);

    return data.publicUrl + `?t=${Date.now()}`;
  };

  const addStudent = async (
    name: string,
    rollNo: string,
    imageBlob?: Blob
  ): Promise<{ success: boolean; error?: string }> => {
    // Check for duplicate roll number
    const existing = students.find((s) => s.rollNo === rollNo);
    if (existing) {
      return { success: false, error: "A student with this roll number already exists" };
    }

    const id = crypto.randomUUID();
    let imageUrl: string | null = null;

    if (imageBlob) {
      imageUrl = await uploadPhoto(imageBlob, id);
    }

    const { error } = await supabase.from("students").insert({
      id,
      name,
      roll_no: rollNo,
      image_url: imageUrl,
    });

    if (error) {
      console.error("Insert error:", error);
      return { success: false, error: "Failed to add student" };
    }

    await fetchStudents();
    return { success: true };
  };

  const updateStudent = async (
    id: string,
    name: string,
    rollNo: string,
    imageBlob?: Blob
  ): Promise<{ success: boolean; error?: string }> => {
    // Check for duplicate roll number (excluding current student)
    const existing = students.find((s) => s.rollNo === rollNo && s.id !== id);
    if (existing) {
      return { success: false, error: "A student with this roll number already exists" };
    }

    let imageUrl: string | undefined;
    if (imageBlob) {
      imageUrl = (await uploadPhoto(imageBlob, id)) || undefined;
    }

    const updateData: { name: string; roll_no: string; image_url?: string } = {
      name,
      roll_no: rollNo,
    };
    if (imageUrl) {
      updateData.image_url = imageUrl;
    }

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      return { success: false, error: "Failed to update student" };
    }

    await fetchStudents();
    return { success: true };
  };

  const deleteStudent = async (id: string): Promise<{ success: boolean }> => {
    // Delete photo from storage
    await supabase.storage.from("student-photos").remove([`${id}.jpg`]);

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return { success: false };
    }

    await fetchStudents();
    return { success: true };
  };

  return {
    students,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents,
  };
};
