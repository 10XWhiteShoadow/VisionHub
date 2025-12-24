import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  status: "present" | "absent";
  markedAt: string;
  date: string;
}

interface DbAttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  roll_no: string;
  status: string;
  marked_at: string;
  date: string;
}

export const useAttendance = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const mapDbToRecord = (db: DbAttendanceRecord): AttendanceRecord => ({
    id: db.id,
    studentId: db.student_id,
    studentName: db.student_name,
    rollNo: db.roll_no,
    status: db.status as "present" | "absent",
    markedAt: db.marked_at,
    date: db.date,
  });

  const fetchTodayAttendance = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", today)
      .order("marked_at", { ascending: true });

    if (error) {
      logger.error("useAttendance", error);
    } else {
      setRecords((data as DbAttendanceRecord[]).map(mapDbToRecord));
    }
    setLoading(false);
  }, [today]);

  const fetchAttendanceByDate = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", date)
      .order("marked_at", { ascending: true });

    if (error) {
      logger.error("useAttendance", error);
      return [];
    }
    return (data as DbAttendanceRecord[]).map(mapDbToRecord);
  }, []);

  const fetchAllAttendance = useCallback(async () => {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false })
      .order("marked_at", { ascending: true });

    if (error) {
      logger.error("useAttendance", error);
      return [];
    }
    return (data as DbAttendanceRecord[]).map(mapDbToRecord);
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const markPresent = async (
    studentId: string,
    studentName: string,
    rollNo: string
  ): Promise<{ success: boolean; record?: AttendanceRecord }> => {
    // Check if already marked today
    const existing = records.find((r) => r.studentId === studentId);
    if (existing) {
      return { success: false };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .insert({
        student_id: studentId,
        student_name: studentName,
        roll_no: rollNo,
        status: "present",
        date: today,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate key error gracefully
      if (error.code === "23505") {
        return { success: false };
      }
      logger.error("useAttendance", error);
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive",
      });
      return { success: false };
    }

    const record = mapDbToRecord(data as DbAttendanceRecord);
    setRecords((prev) => [...prev, record]);
    return { success: true, record };
  };

  const saveAllAttendance = async (
    attendanceList: { studentId: string; studentName: string; rollNo: string }[]
  ): Promise<{ success: boolean; savedCount: number }> => {
    setSaving(true);
    let savedCount = 0;

    for (const item of attendanceList) {
      const existing = records.find((r) => r.studentId === item.studentId);
      if (!existing) {
        const { error } = await supabase.from("attendance_records").insert({
          student_id: item.studentId,
          student_name: item.studentName,
          roll_no: item.rollNo,
          status: "present",
          date: today,
        });

        if (!error) {
          savedCount++;
        }
      }
    }

    await fetchTodayAttendance();
    setSaving(false);
    return { success: true, savedCount };
  };

  const exportToCSV = (recordsToExport: AttendanceRecord[], filename?: string) => {
    if (recordsToExport.length === 0) {
      toast({
        title: "No Records",
        description: "No attendance records to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Date", "Roll No", "Student Name", "Status", "Time Marked"];
    const rows = recordsToExport.map((r) => [
      r.date,
      r.rollNo,
      r.studentName,
      r.status,
      new Date(r.markedAt).toLocaleTimeString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `attendance_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported!",
      description: `${recordsToExport.length} records exported to CSV`,
    });
  };

  return {
    records,
    loading,
    saving,
    markPresent,
    saveAllAttendance,
    exportToCSV,
    fetchTodayAttendance,
    fetchAttendanceByDate,
    fetchAllAttendance,
  };
};
