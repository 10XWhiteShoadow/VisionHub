import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

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

  // Refresh signed URLs for students with photos
  const refreshSignedUrls = async (studentList: Student[]): Promise<Student[]> => {
    const updatedStudents = await Promise.all(
      studentList.map(async (student) => {
        if (student.imageUrl) {
          // Extract the file path from the URL or use the student ID
          const filePath = `${student.id}.jpg`;
          const { data, error } = await supabase.storage
            .from("student-photos")
            .createSignedUrl(filePath, 3600);
          
          if (data?.signedUrl) {
            return { ...student, imageUrl: data.signedUrl };
          }
        }
        return student;
      })
    );
    return updatedStudents;
  };

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
      logger.error("useStudents", error);
    } else {
      const mappedStudents = (data as DbStudent[]).map(mapDbToStudent);
      // Refresh signed URLs for all students with photos
      const studentsWithUrls = await refreshSignedUrls(mappedStudents);
      setStudents(studentsWithUrls);
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
      logger.error("useStudents", uploadError);
      return null;
    }

    // Use signed URL since bucket is private
    const { data, error } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      logger.error("useStudents", error);
      return null;
    }

    return data.signedUrl;
  };

  // Get signed URL for a student photo
  const getSignedPhotoUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(filePath, 3600);
    
    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
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
      logger.error("useStudents", error);
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
      logger.error("useStudents", error);
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
      logger.error("useStudents", error);
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
