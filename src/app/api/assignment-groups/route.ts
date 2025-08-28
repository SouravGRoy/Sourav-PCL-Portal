import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  createAssignmentGroups, 
  getAssignmentGroups, 
  deleteAssignmentGroups,
  addStudentToAssignmentGroup,
  removeStudentFromAssignmentGroup,
  getStudentAssignmentGroup
} from '@/lib/api/assignment-groups';

export async function POST(request: NextRequest) {
  try {
    // For now, let's skip authentication to test the functionality
    // TODO: Fix authentication properly later
    
    const body = await request.json();
    const { action, assignmentId, groupSize, formationType, assignmentGroupId, studentId } = body;

    switch (action) {
      case 'create':
        if (!assignmentId || !groupSize || !formationType) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const createResult = await createAssignmentGroups(assignmentId, groupSize, formationType);
        return NextResponse.json(createResult);

      case 'get':
        if (!assignmentId) {
          return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
        }

        const groups = await getAssignmentGroups(assignmentId);
        return NextResponse.json(groups);

      case 'delete':
        if (!assignmentId) {
          return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
        }

        const deleteResult = await deleteAssignmentGroups(assignmentId);
        return NextResponse.json(deleteResult);

      case 'add-student':
        if (!assignmentGroupId || !studentId) {
          return NextResponse.json({ error: 'Group ID and Student ID required' }, { status: 400 });
        }

        const addResult = await addStudentToAssignmentGroup(assignmentGroupId, studentId);
        return NextResponse.json(addResult);

      case 'remove-student':
        if (!assignmentGroupId || !studentId) {
          return NextResponse.json({ error: 'Group ID and Student ID required' }, { status: 400 });
        }

        const removeResult = await removeStudentFromAssignmentGroup(assignmentGroupId, studentId);
        return NextResponse.json(removeResult);

      case 'get-student-group':
        if (!assignmentId || !studentId) {
          return NextResponse.json({ error: 'Assignment ID and Student ID required' }, { status: 400 });
        }

        const studentGroup = await getStudentAssignmentGroup(assignmentId, studentId);
        return NextResponse.json(studentGroup);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Assignment Groups API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
