"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getAllFaculty, getAllStudents } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';

type Student = {
  id: string;
  name: string;
  email: string;
  usn: string;
  class: string;
  semester: string;
  created_at: string;
};

type Faculty = {
  id: string;
  name: string;
  email: string;
  department: string;
  created_at: string;
};

export default function AdminDashboardTabs() {
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [facultyCount, setFacultyCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  
  // Search
  const [studentSearch, setStudentSearch] = useState("");
  const [facultySearch, setFacultySearch] = useState("");
  
  // Dialog states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  
  // New user form states
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentUSN, setNewStudentUSN] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("");
  const [newStudentSemester, setNewStudentSemester] = useState("");
  
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyEmail, setNewFacultyEmail] = useState("");
  const [newFacultyDepartment, setNewFacultyDepartment] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {      
      try {
        setIsLoading(true);
        
        // Fetch faculty
        const facultyData = await getAllFaculty();
        setFaculty(facultyData);
        setFacultyCount(facultyData.length);
        
        // Fetch students
        const studentsData = await getAllStudents();
        setStudents(studentsData);
        setStudentCount(studentsData.length);
        
        // Fetch group count
        const { count: groups } = await supabase
          .from('groups')
          .select('*', { count: 'exact', head: true });
        
        setGroupCount(groups || 0);
        
        // Fetch submission count
        const { count: submissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true });
        
        setSubmissionCount(submissions || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Filter students based on search
  const filteredStudents = students.filter(student => 
    (student.name?.toLowerCase() || '').includes(studentSearch.toLowerCase()) ||
    (student.email?.toLowerCase() || '').includes(studentSearch.toLowerCase()) ||
    (student.usn?.toLowerCase() || '').includes(studentSearch.toLowerCase())
  );

  // Filter faculty based on search
  const filteredFaculty = faculty.filter(f => 
    (f.name?.toLowerCase() || '').includes(facultySearch.toLowerCase()) ||
    (f.email?.toLowerCase() || '').includes(facultySearch.toLowerCase()) ||
    (f.department?.toLowerCase() || '').includes(facultySearch.toLowerCase())
  );

  // Mock functions for CRUD operations
  const handleAddStudent = () => {
    // In a real app, this would call an API to create a new student
    console.log('Adding student:', { 
      name: newStudentName, 
      email: newStudentEmail,
      usn: newStudentUSN,
      class: newStudentClass,
      semester: newStudentSemester
    });
    
    // Add to local state for demo purposes
    const newStudent = {
      id: `student-${Date.now()}`,
      name: newStudentName,
      email: newStudentEmail,
      usn: newStudentUSN,
      class: newStudentClass,
      semester: newStudentSemester,
      created_at: new Date().toISOString()
    };
    
    setStudents([...students, newStudent]);
    setStudentCount(studentCount + 1);
    
    // Reset form
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentUSN("");
    setNewStudentClass("");
    setNewStudentSemester("");
    setIsAddStudentOpen(false);
  };

  const handleAddFaculty = () => {
    // In a real app, this would call an API to create a new faculty member
    console.log('Adding faculty:', { 
      name: newFacultyName, 
      email: newFacultyEmail,
      department: newFacultyDepartment
    });
    
    // Add to local state for demo purposes
    const newFacultyMember = {
      id: `faculty-${Date.now()}`,
      name: newFacultyName,
      email: newFacultyEmail,
      department: newFacultyDepartment,
      created_at: new Date().toISOString()
    };
    
    setFaculty([...faculty, newFacultyMember]);
    setFacultyCount(facultyCount + 1);
    
    // Reset form
    setNewFacultyName("");
    setNewFacultyEmail("");
    setNewFacultyDepartment("");
    setIsAddFacultyOpen(false);
  };

  const handleDeleteStudent = (id: string) => {
    // In a real app, this would call an API to delete the student
    console.log('Deleting student:', id);
    
    // Update local state for demo purposes
    const updatedStudents = students.filter(student => student.id !== id);
    setStudents(updatedStudents);
    setStudentCount(studentCount - 1);
  };

  const handleDeleteFaculty = (id: string) => {
    // In a real app, this would call an API to delete the faculty member
    console.log('Deleting faculty:', id);
    
    // Update local state for demo purposes
    const updatedFaculty = faculty.filter(f => f.id !== id);
    setFaculty(updatedFaculty);
    setFacultyCount(facultyCount - 1);
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 mb-4 sm:mb-8">
        <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
        <TabsTrigger value="students" className="text-xs sm:text-sm">Students</TabsTrigger>
        <TabsTrigger value="faculty" className="text-xs sm:text-sm">Faculty</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
      </TabsList>
      
      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-blue-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Faculty
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold text-blue-700">{facultyCount}</div>
              <p className="text-xs text-blue-600">Registered members</p>
            </CardContent>
          </Card>
          
          <Card className="border-green-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center text-green-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Students
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-700">{studentCount}</div>
              <p className="text-xs text-green-600">Registered students</p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center text-purple-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold text-purple-700">{groupCount}</div>
              <p className="text-xs text-purple-600">Active study groups</p>
            </CardContent>
          </Card>
          
          <Card className="border-amber-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold text-amber-700">{submissionCount}</div>
              <p className="text-xs text-amber-600">Assignment submissions</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg text-blue-800">Recent Students</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest student registrations</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">USN</TableHead>
                      <TableHead className="text-xs sm:text-sm">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.slice(0, 5).map((student) => (
                      <TableRow key={student.id || `student-${Math.random()}`}>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div className="truncate max-w-[100px] sm:max-w-none">{student.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="truncate max-w-[80px] sm:max-w-none">{student.usn || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg text-green-800">Recent Faculty</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest faculty registrations</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Department</TableHead>
                      <TableHead className="text-xs sm:text-sm">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faculty.slice(0, 5).map((f) => (
                      <TableRow key={f.id || `faculty-${Math.random()}`}>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div className="truncate max-w-[100px] sm:max-w-none">{f.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="truncate max-w-[80px] sm:max-w-none">{f.department || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      {/* Students Tab */}
      <TabsContent value="students" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Students Management</CardTitle>
              <CardDescription>Manage all students in the system</CardDescription>
            </div>
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new student account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right">Name</label>
                    <Input id="name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="email" className="text-right">Email</label>
                    <Input id="email" type="email" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="usn" className="text-right">USN</label>
                    <Input id="usn" value={newStudentUSN} onChange={(e) => setNewStudentUSN(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="class" className="text-right">Class</label>
                    <Input id="class" value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="semester" className="text-right">Semester</label>
                    <Input id="semester" value={newStudentSemester} onChange={(e) => setNewStudentSemester(e.target.value)} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddStudent}>Add Student</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Table>
              <TableCaption>A list of all students in the system.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id || `student-${Math.random()}`}>
                    <TableCell className="font-medium">{student.name || 'N/A'}</TableCell>
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell>{student.usn || 'N/A'}</TableCell>
                    <TableCell>{student.class || 'N/A'}</TableCell>
                    <TableCell>{student.semester || 'N/A'}</TableCell>
                    <TableCell>{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDeleteStudent(student.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Faculty Tab */}
      <TabsContent value="faculty" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Faculty Management</CardTitle>
              <CardDescription>Manage all faculty members in the system</CardDescription>
            </div>
            <Dialog open={isAddFacultyOpen} onOpenChange={setIsAddFacultyOpen}>
              <DialogTrigger asChild>
                <Button>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Faculty
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Faculty</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new faculty account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="faculty-name" className="text-right">Name</label>
                    <Input id="faculty-name" value={newFacultyName} onChange={(e) => setNewFacultyName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="faculty-email" className="text-right">Email</label>
                    <Input id="faculty-email" type="email" value={newFacultyEmail} onChange={(e) => setNewFacultyEmail(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="department" className="text-right">Department</label>
                    <Input id="department" value={newFacultyDepartment} onChange={(e) => setNewFacultyDepartment(e.target.value)} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddFaculty}>Add Faculty</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search faculty..."
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Table>
              <TableCaption>A list of all faculty members in the system.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculty.map((f) => (
                  <TableRow key={f.id || `faculty-${Math.random()}`}>
                    <TableCell className="font-medium">{f.name || 'N/A'}</TableCell>
                    <TableCell>{f.email || 'N/A'}</TableCell>
                    <TableCell>{f.department || 'N/A'}</TableCell>
                    <TableCell>{f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDeleteFaculty(f.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Manage system-wide settings and configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <p className="text-sm text-gray-500 mb-2">Configure system email notifications</p>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="email-notifications" className="rounded" />
                  <label htmlFor="email-notifications">Enable email notifications</label>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">System Maintenance</h3>
                <p className="text-sm text-gray-500 mb-2">Schedule system maintenance</p>
                <Button variant="outline">
                  Schedule Maintenance
                </Button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Database Backup</h3>
                <p className="text-sm text-gray-500 mb-2">Manage database backups</p>
                <Button variant="outline">
                  Create Backup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
