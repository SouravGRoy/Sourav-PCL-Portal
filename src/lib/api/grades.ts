import { supabase } from '@/lib/supabase';

export interface StudentGradeData {
  student_id: string;
  student_name: string;
  student_email: string;
  usn: string;
  gpa: number;
  average_score: number;
  total_assignments: number;
  completed_assignments: number;
  completion_rate: number;
}

export interface GroupGradeStats {
  group_id: string;
  students: StudentGradeData[];
  class_average_gpa: number;
  class_average_score: number;
  total_students: number;
  assignment_completion_rate: number;
}

/**
 * Simple function to get student grades - focuses on existing submissions
 */
export async function getGroupStudentGrades(groupId: string): Promise<GroupGradeStats | null> {
  try {
    // Get all assignments for this group first
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, max_score, status')
      .eq('group_id', groupId);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return null;
    }

    if (!assignments || assignments.length === 0) {
      return {
        group_id: groupId,
        students: [],
        class_average_gpa: 0,
        class_average_score: 0,
        total_students: 0,
        assignment_completion_rate: 0
      };
    }

    // Get all submissions for these assignments
    const assignmentIds = assignments.map(a => a.id);
    const { data: submissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select(`
        student_id,
        assignment_id,
        total_score,
        status
      `)
      .in('assignment_id', assignmentIds)
      .not('total_score', 'is', null);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return null;
    }

    if (!submissions || submissions.length === 0) {
      return {
        group_id: groupId,
        students: [],
        class_average_gpa: 0,
        class_average_score: 0,
        total_students: 0,
        assignment_completion_rate: 0
      };
    }

    // Get student details
    const studentIds = [...new Set(submissions.map(s => s.student_id))];
    const { data: studentProfiles, error: studentsError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        student_profiles (
          name,
          usn
        )
      `)
      .in('id', studentIds);

    if (studentsError) {
      console.error('Error fetching student profiles:', studentsError);
      return null;
    }

    // Calculate grades for each student
    const studentGrades: StudentGradeData[] = [];
    
    for (const student of studentProfiles || []) {
      const studentSubmissions = submissions.filter(s => s.student_id === student.id);
      
      let totalPoints = 0;
      let maxPossiblePoints = 0;
      let completedAssignments = 0;

      for (const submission of studentSubmissions) {
        const assignment = assignments.find(a => a.id === submission.assignment_id);
        if (assignment && submission.total_score !== null) {
          totalPoints += submission.total_score;
          maxPossiblePoints += assignment.max_score || 100;
          completedAssignments++;
        }
      }

      const averageScore = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
      const gpa = calculateGPAFromPercentage(averageScore);
      const completionRate = assignments.length > 0 ? (completedAssignments / assignments.length) * 100 : 0;

      const studentProfile = (student as any).student_profiles;
      const studentName = Array.isArray(studentProfile) ? studentProfile[0]?.name : studentProfile?.name;
      const studentUSN = Array.isArray(studentProfile) ? studentProfile[0]?.usn : studentProfile?.usn;

      studentGrades.push({
        student_id: student.id,
        student_name: studentName || 'Unknown',
        student_email: student.email || '',
        usn: studentUSN || '',
        gpa: parseFloat(gpa.toFixed(2)),
        average_score: parseFloat(averageScore.toFixed(1)),
        total_assignments: assignments.length,
        completed_assignments: completedAssignments,
        completion_rate: parseFloat(completionRate.toFixed(1))
      });
    }

    // Calculate class statistics
    const classAverageGPA = studentGrades.length > 0 
      ? studentGrades.reduce((sum, student) => sum + student.gpa, 0) / studentGrades.length 
      : 0;
    
    const classAverageScore = studentGrades.length > 0 
      ? studentGrades.reduce((sum, student) => sum + student.average_score, 0) / studentGrades.length 
      : 0;

    const classCompletionRate = studentGrades.length > 0 
      ? studentGrades.reduce((sum, student) => sum + student.completion_rate, 0) / studentGrades.length 
      : 0;

    return {
      group_id: groupId,
      students: studentGrades.sort((a, b) => b.gpa - a.gpa), // Sort by GPA descending
      class_average_gpa: parseFloat(classAverageGPA.toFixed(2)),
      class_average_score: parseFloat(classAverageScore.toFixed(1)),
      total_students: studentGrades.length,
      assignment_completion_rate: parseFloat(classCompletionRate.toFixed(1))
    };

  } catch (error) {
    console.error('Error calculating group student grades:', error);
    return null;
  }
}

/**
 * Convert percentage score to 4.0 GPA scale
 */
function calculateGPAFromPercentage(percentage: number): number {
  if (percentage >= 90) return 4.0;
  if (percentage >= 85) return 3.7;
  if (percentage >= 80) return 3.3;
  if (percentage >= 75) return 3.0;
  if (percentage >= 70) return 2.7;
  if (percentage >= 65) return 2.3;
  if (percentage >= 60) return 2.0;
  if (percentage >= 55) return 1.7;
  if (percentage >= 50) return 1.3;
  if (percentage >= 45) return 1.0;
  return 0.0;
}

/**
 * Get individual student's grade details
 */
export async function getStudentGradeDetails(studentId: string, groupId: string): Promise<StudentGradeData | null> {
  try {
    const groupGrades = await getGroupStudentGrades(groupId);
    if (!groupGrades) return null;
    
    return groupGrades.students.find(student => student.student_id === studentId) || null;
  } catch (error) {
    console.error('Error fetching student grade details:', error);
    return null;
  }
}

/**
 * Get top performers for a group
 */
export async function getTopPerformers(groupId: string, limit: number = 3): Promise<StudentGradeData[]> {
  try {
    const groupGrades = await getGroupStudentGrades(groupId);
    if (!groupGrades) return [];
    
    return groupGrades.students.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return [];
  }
}
