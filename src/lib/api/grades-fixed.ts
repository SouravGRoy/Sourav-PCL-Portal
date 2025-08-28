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
 * Calculate GPA for students in a group based on their assignment scores
 */
export async function getGroupStudentGrades(groupId: string): Promise<GroupGradeStats | null> {
  try {
    console.log('Fetching grade data for group:', groupId);

    // Get all group members first
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select(`
        student_id,
        profiles!inner(
          id,
          email
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return null;
    }

    if (!groupMembers || groupMembers.length === 0) {
      console.log('No group members found');
      return {
        group_id: groupId,
        students: [],
        class_average_gpa: 0,
        class_average_score: 0,
        total_students: 0,
        assignment_completion_rate: 0
      };
    }

    // Get student profile data
    const studentIds = groupMembers.map(m => m.student_id);
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('student_profiles')
      .select('user_id, name, usn')
      .in('user_id', studentIds);

    if (profilesError) {
      console.error('Error fetching student profiles:', profilesError);
    }

    // Get all assignments for this group (not just active ones)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, max_score, status')
      .eq('group_id', groupId);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return null;
    }

    console.log('Found assignments for group', groupId, ':', assignments?.length || 0);

    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for group');
      return {
        group_id: groupId,
        students: [],
        class_average_gpa: 0,
        class_average_score: 0,
        total_students: 0,
        assignment_completion_rate: 0
      };
    }

    // Get all submissions for these assignments that have grades (any status with total_score)
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
      .in('student_id', studentIds)
      .not('total_score', 'is', null);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
    }

    console.log('Found submissions with scores for group', groupId, ':', submissions?.length || 0);

    const students: StudentGradeData[] = [];

    // Calculate grades for each student
    for (const member of groupMembers) {
      const studentId = member.student_id;
      const profile = studentProfiles?.find(p => p.user_id === studentId);
      const memberProfile = member.profiles as any;

      // Get submissions for this student
      const studentSubmissions = submissions?.filter(s => s.student_id === studentId) || [];
      
      let totalPoints = 0;
      let maxPossiblePoints = 0;
      let completedAssignments = 0;

      // Calculate total score from submissions
      for (const submission of studentSubmissions) {
        if (submission.total_score !== null && submission.total_score !== undefined) {
          const assignment = assignments.find(a => a.id === submission.assignment_id);
          if (assignment) {
            totalPoints += submission.total_score;
            maxPossiblePoints += assignment.max_score;
            completedAssignments++;
          }
        }
      }

      // Calculate percentage and GPA
      const averageScore = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
      const gpa = calculateGPAFromPercentage(averageScore);
      const completionRate = assignments.length > 0 ? (completedAssignments / assignments.length) * 100 : 0;

      students.push({
        student_id: studentId,
        student_name: profile?.name || 'Unknown Student',
        student_email: memberProfile?.email || '',
        usn: profile?.usn || '',
        gpa: parseFloat(gpa.toFixed(2)),
        average_score: parseFloat(averageScore.toFixed(1)),
        total_assignments: assignments.length,
        completed_assignments: completedAssignments,
        completion_rate: parseFloat(completionRate.toFixed(1))
      });
    }

    // Calculate class statistics
    const hasGradedStudents = students.filter(s => s.completed_assignments > 0);
    const classAverageGPA = hasGradedStudents.length > 0 
      ? hasGradedStudents.reduce((sum, student) => sum + student.gpa, 0) / hasGradedStudents.length 
      : 0;
    
    const classAverageScore = hasGradedStudents.length > 0 
      ? hasGradedStudents.reduce((sum, student) => sum + student.average_score, 0) / hasGradedStudents.length 
      : 0;

    const classCompletionRate = students.length > 0 
      ? students.reduce((sum, student) => sum + student.completion_rate, 0) / students.length 
      : 0;

    console.log('Calculated grade data:', {
      totalStudents: students.length,
      gradedStudents: hasGradedStudents.length,
      classAverageGPA,
      classAverageScore
    });

    return {
      group_id: groupId,
      students: students.sort((a, b) => b.gpa - a.gpa), // Sort by GPA descending
      class_average_gpa: parseFloat(classAverageGPA.toFixed(2)),
      class_average_score: parseFloat(classAverageScore.toFixed(1)),
      total_students: students.length,
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
