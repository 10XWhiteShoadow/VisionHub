import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import {
  UserPlus,
  Trash2,
  Camera,
  ArrowLeft,
  Users,
  Search,
  Upload,
  X,
  CheckCircle2,
  Edit2,
  Sparkles,
  Loader2,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";

const StudentManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { students, loading: studentsLoading, addStudent, updateStudent, deleteStudent } = useStudents();
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newRollNo, setNewRollNo] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Convert data URL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
      setShowCamera(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new student
  const handleAddStudent = async () => {
    if (!newName.trim() || !newRollNo.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter name and roll number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const imageBlob = capturedImage ? dataURLtoBlob(capturedImage) : undefined;
    const result = await addStudent(newName.trim(), newRollNo.trim(), imageBlob);
    setIsSubmitting(false);

    if (result.success) {
      resetForm();
      setShowAddModal(false);
      toast({
        title: "Student Added!",
        description: `${newName} has been added successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add student",
        variant: "destructive",
      });
    }
  };

  // Update existing student
  const handleUpdateStudent = async () => {
    if (!editingStudentId || !newName.trim() || !newRollNo.trim()) return;

    setIsSubmitting(true);
    const imageBlob = capturedImage?.startsWith("data:") ? dataURLtoBlob(capturedImage) : undefined;
    const result = await updateStudent(editingStudentId, newName.trim(), newRollNo.trim(), imageBlob);
    setIsSubmitting(false);

    if (result.success) {
      resetForm();
      setEditingStudentId(null);
      setShowAddModal(false);
      toast({
        title: "Student Updated!",
        description: "Changes saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update student",
        variant: "destructive",
      });
    }
  };

  // Delete student
  const handleDeleteStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    const result = await deleteStudent(id);

    if (result.success) {
      toast({
        title: "Student Removed",
        description: `${student?.name} has been removed`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setNewName("");
    setNewRollNo("");
    setCapturedImage(null);
    setShowCamera(false);
  };

  // Start editing
  const startEditing = (student: { id: string; name: string; rollNo: string; imageUrl?: string }) => {
    setEditingStudentId(student.id);
    setNewName(student.name);
    setNewRollNo(student.rollNo);
    setCapturedImage(student.imageUrl || null);
    setShowAddModal(true);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Filter students
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || studentsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <Link to="/attendance" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Attendance
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="text-gradient-purple">Student</span> Management
                </h1>
                <p className="text-muted-foreground">
                  Add, edit, or remove students from your attendance list
                </p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingStudentId(null);
                  setShowAddModal(true);
                }}
                className="gap-2 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 hover-lift"
              >
                <UserPlus className="w-4 h-4" />
                Add Student
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="glass-card p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border focus:border-neon-purple transition-colors"
              />
            </div>
          </Card>

          {/* Students Grid */}
          {students.length === 0 ? (
            <Card className="glass-card p-12 text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neon-purple/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-neon-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Students Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by adding your first student to the attendance system
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2 bg-gradient-to-r from-neon-purple to-neon-pink"
              >
                <UserPlus className="w-4 h-4" />
                Add First Student
              </Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student, index) => (
                <Card
                  key={student.id}
                  className="glass-card p-5 group hover:border-neon-purple/50 transition-all duration-300 animate-fade-in-up hover-lift"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      {student.imageUrl ? (
                        <img
                          src={student.imageUrl}
                          alt={student.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-neon-purple/30"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center border-2 border-neon-purple/30">
                          <span className="text-2xl font-bold text-gradient-purple">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-green flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-background" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate group-hover:text-neon-purple transition-colors">
                        {student.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Roll: {student.rollNo}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Added {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(student)}
                      className="flex-1 gap-2 hover:border-neon-purple/50 hover:bg-neon-purple/5"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id)}
                      className="gap-2 hover:border-neon-pink/50 hover:bg-neon-pink/5 hover:text-neon-pink"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Stats Bar */}
          <Card className="glass-card p-4 mt-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-neon-purple">{students.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-yellow" />
                <span className="text-sm text-muted-foreground">
                  {filteredStudents.length} showing
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
                setEditingStudentId(null);
              }}
            />
            <Card className="relative z-10 w-full max-w-md glass-card p-6 animate-scale-in-bounce">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                  setEditingStudentId(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-6">
                {editingStudentId ? "Edit Student" : "Add New Student"}
              </h2>

              <div className="space-y-5">
                {/* Photo Section */}
                <div className="flex flex-col items-center">
                  {showCamera ? (
                    <div className="relative w-full rounded-xl overflow-hidden">
                      <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full rounded-xl"
                        videoConstraints={{
                          facingMode: "user",
                          width: 320,
                          height: 240,
                        }}
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        <Button
                          onClick={capturePhoto}
                          className="gap-2 bg-neon-green hover:bg-neon-green/80"
                        >
                          <Camera className="w-4 h-4" />
                          Capture
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCamera(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : capturedImage ? (
                    <div className="relative">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-32 h-32 rounded-xl object-cover border-2 border-neon-purple/50"
                      />
                      <button
                        onClick={() => setCapturedImage(null)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-neon-pink text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowCamera(true)}
                        className="gap-2 hover:border-neon-cyan/50"
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 hover:border-neon-purple/50"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Photo is optional but helps with face recognition
                  </p>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-background/50 focus:border-neon-purple"
                  />
                </div>

                {/* Roll Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="rollNo">Roll Number</Label>
                  <Input
                    id="rollNo"
                    placeholder="Enter roll number"
                    value={newRollNo}
                    onChange={(e) => setNewRollNo(e.target.value)}
                    className="bg-background/50 focus:border-neon-purple"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={editingStudentId ? handleUpdateStudent : handleAddStudent}
                  disabled={isSubmitting}
                  className="w-full gap-2 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingStudentId ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Update Student
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Student
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentManagement;
