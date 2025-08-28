import { supabase } from '../supabase';
import {
  AttendanceSession,
  AttendanceRecord,
  ClassAttendanceSettings,
  AttendanceSummary,
  CreateAttendanceSessionRequest,
  QRScanRequest,
  ManualAttendanceRequest,
  AttendanceStatus,
  CheckInMethod
} from '@/types';

// ===================================================================
// ATTENDANCE SESSION MANAGEMENT
// ===================================================================

/**
 * Get active attendance session for a group
 */
export const getGroupActiveSession = async (groupId: string): Promise<AttendanceSession | null> => {
  try {
    // Query the attendance_sessions table directly for active sessions
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        groups!inner(name, subject, subject_code)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active session:', error);
      return null;
    }

    if (!data) return null;

    // Calculate QR status and time remaining
    const now = new Date();
    const qrExpiresAt = new Date(data.qr_expires_at);
    const isQrActive = qrExpiresAt > now;
    const minutesUntilExpiry = Math.max(0, (qrExpiresAt.getTime() - now.getTime()) / (1000 * 60));

    return {
      ...data,
      group_name: data.groups?.name,
      subject: data.groups?.subject, 
      subject_code: data.groups?.subject_code,
      qr_status: isQrActive ? 'active' : 'expired',
      minutes_until_qr_expiry: minutesUntilExpiry
    };
  } catch (error) {
    console.error('Error fetching active attendance session:', error);
    return null;
  }
};

/**
 * Create a new attendance session with QR code and geolocation
 */
export const createAttendanceSession = async (
  data: CreateAttendanceSessionRequest
): Promise<AttendanceSession> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get class settings for defaults
    const { data: settings } = await supabase
      .from('class_attendance_settings')
      .select('*')
      .eq('group_id', data.group_id)
      .single();

    // Generate QR token
    const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const qrDurationMinutes = data.qr_duration_minutes || settings?.default_qr_duration_minutes || 5;
    const qrExpiresAt = new Date(Date.now() + qrDurationMinutes * 60 * 1000);

    const sessionData = {
      group_id: data.group_id,
      faculty_id: user.id,
      session_name: data.session_name,
      session_type: data.session_type,
      qr_code_token: qrToken,
      qr_expires_at: qrExpiresAt.toISOString(),
      qr_duration_minutes: qrDurationMinutes,
      faculty_latitude: data.faculty_latitude,
      faculty_longitude: data.faculty_longitude,
      allowed_radius_meters: data.allowed_radius_meters || settings?.default_allowed_radius_meters || 20,
      allow_late_entry: data.allow_late_entry ?? settings?.allow_late_entry_by_default ?? true,
      late_entry_deadline: data.allow_late_entry 
        ? new Date(Date.now() + (settings?.default_late_entry_hours || 24) * 60 * 60 * 1000).toISOString()
        : null
    };

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert(sessionData)
      .select(`
        *,
        groups!inner(name, subject, subject_code)
      `)
      .single();

    if (error) {
      console.error('Database error creating session:', error);
      throw new Error(`Failed to create attendance session: ${error.message}`);
    }

    // Get faculty name from faculty_profiles
    const { data: facultyData } = await supabase
      .from('faculty_profiles')
      .select('name')
      .eq('user_id', session.faculty_id)
      .single();

    return {
      ...session,
      group_name: session.groups?.name,
      subject: session.groups?.subject,
      subject_code: session.groups?.subject_code,
      faculty_name: facultyData?.name || 'Unknown Faculty'
    };
  } catch (error: any) {
    console.error('Error creating attendance session:', error);
    throw new Error(error?.message || 'Failed to create attendance session');
  }
};

/**
 * Get active attendance sessions for a faculty member
 */
export const getFacultyActiveSessions = async (facultyId: string): Promise<AttendanceSession[]> => {
  try {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        groups!inner(name, subject, subject_code)
      `)
      .eq('faculty_id', facultyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching sessions:', error);
      throw new Error(`Failed to fetch active sessions: ${error.message}`);
    }

    // Get faculty name
    const { data: facultyData } = await supabase
      .from('faculty_profiles')
      .select('name')
      .eq('user_id', facultyId)
      .single();

    return (data || []).map(session => ({
      ...session,
      group_name: session.groups?.name,
      subject: session.groups?.subject,
      subject_code: session.groups?.subject_code,
      faculty_name: facultyData?.name || 'Unknown Faculty',
      qr_status: new Date(session.qr_expires_at) > new Date() ? 'active' : 'expired',
      minutes_until_qr_expiry: Math.max(0, 
        (new Date(session.qr_expires_at).getTime() - Date.now()) / (1000 * 60)
      )
    }));
  } catch (error: any) {
    console.error('Error fetching faculty active sessions:', error);
    throw new Error(error?.message || 'Failed to fetch active sessions');
  }
};

/**
 * End an attendance session and mark absent students
 */
export const endAttendanceSession = async (sessionId: string): Promise<void> => {
  try {
    // First, get session details
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('group_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) throw sessionError || new Error('Session not found');

    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('student_id')
      .eq('group_id', session.group_id);

    if (membersError) throw membersError;

    // Get existing attendance records for this session
    const { data: existingRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('student_id')
      .eq('session_id', sessionId);

    if (recordsError) throw recordsError;

    // Find students who haven't marked attendance
    const attendedStudentIds = new Set((existingRecords || []).map(r => r.student_id));
    const absentStudents = (members || []).filter(member => 
      !attendedStudentIds.has(member.student_id)
    );

    // Mark absent students
    if (absentStudents.length > 0) {
      const absentRecords = absentStudents.map(student => ({
        session_id: sessionId,
        student_id: student.student_id,
        group_id: session.group_id,
        status: 'absent' as const,
        check_in_time: new Date().toISOString(),
        check_in_method: 'manual_faculty' as const
      }));

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(absentRecords);

      if (insertError) {
        console.error('Error marking absent students:', {
          error: insertError,
          details: insertError.details,
          message: insertError.message,
          hint: insertError.hint,
          code: insertError.code,
          absentRecords: absentRecords
        });
        // Don't throw here, just log the error and continue ending the session
      }
    }

    // End the session
    const { error } = await supabase
      .from('attendance_sessions')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error ending attendance session:', error);
    throw error;
  }
};

// ===================================================================
// QR CODE ATTENDANCE SCANNING
// ===================================================================

/**
 * Create a test attendance session for debugging
 */
export const createTestAttendanceSession = async (groupId: string): Promise<{ qrToken: string, sessionId: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate QR token
    const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const sessionData = {
      group_id: groupId,
      faculty_id: user.id,
      qr_code_token: qrToken,
      qr_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      status: 'active' as const,
      created_at: new Date().toISOString(),
    };

    console.log('Creating test session:', sessionData);

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating test session:', error);
      throw error;
    }

    console.log('Test session created:', session);
    return { qrToken, sessionId: session.id };
  } catch (error) {
    console.error('Error creating test session:', error);
    throw error;
  }
};

/**
 * Process QR code scan for attendance
 */
export const processQRScan = async (scanData: QRScanRequest): Promise<AttendanceRecord> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Processing QR scan:', {
      token: scanData.qr_code_token,
      userId: user.id,
      location: { lat: scanData.student_latitude, lng: scanData.student_longitude }
    });

    // Get session details and validate QR code
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        groups!inner(name)
      `)
      .eq('qr_code_token', scanData.qr_code_token)
      .eq('status', 'active')
      .single();

    console.log('Session lookup result:', { session, sessionError });

    if (sessionError || !session) {
      // Let's also check if there are any sessions at all for debugging
      const { data: allSessions } = await supabase
        .from('attendance_sessions')
        .select('id, qr_code_token, status, created_at, qr_expires_at, group_id')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('Recent sessions for debugging:', allSessions);
      console.log('Looking for token:', scanData.qr_code_token);
      
      // Also check if there are any active sessions at all
      const { data: activeSessions } = await supabase
        .from('attendance_sessions')
        .select('id, qr_code_token, status, created_at, qr_expires_at, group_id')
        .eq('status', 'active');
        
      console.log('All active sessions:', activeSessions);
      
      // Check if the token exists at all (regardless of status)
      const { data: tokenMatch } = await supabase
        .from('attendance_sessions')
        .select('id, qr_code_token, status, qr_expires_at')
        .eq('qr_code_token', scanData.qr_code_token)
        .single();
        
      console.log('Token match result:', tokenMatch);
      
      // Show the first few characters of all active tokens for comparison
      if (activeSessions) {
        console.log('Active session tokens (first 16 chars):');
        activeSessions.forEach((session, index) => {
          console.log(`${index + 1}. ${session.qr_code_token.substring(0, 16)}... (Status: ${session.status})`);
        });
      }
      
      throw new Error(`No active session found for token: ${scanData.qr_code_token.substring(0, 8)}...`);
    }

    // Check if QR code is still valid
    if (new Date(session.qr_expires_at) < new Date()) {
      throw new Error('QR code has expired');
    }

    // Verify student is member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', session.group_id)
      .eq('student_id', user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error('Student is not a member of this group');
    }

    // Check if student already marked attendance for this session
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', user.id)
      .single();

    if (existingRecord) {
      throw new Error('Attendance already marked for this session');
    }

    // Calculate distance if both locations are provided
    let distanceFromFaculty: number | undefined;
    let status: AttendanceStatus = 'present';

    if (session.faculty_latitude && session.faculty_longitude && 
        scanData.student_latitude && scanData.student_longitude) {
      
      distanceFromFaculty = calculateDistance(
        session.faculty_latitude,
        session.faculty_longitude,
        scanData.student_latitude,
        scanData.student_longitude
      );

      // Check if student is within allowed radius
      if (distanceFromFaculty > session.allowed_radius_meters) {
        throw new Error(
          `You are ${Math.round(distanceFromFaculty)}m away from the class location. ` +
          `You must be within ${session.allowed_radius_meters}m to mark attendance.`
        );
      }
    }

    // Determine if this is a late check-in
    const sessionStartTime = new Date(session.start_time);
    const checkInTime = new Date();
    if (checkInTime > sessionStartTime) {
      const minutesLate = (checkInTime.getTime() - sessionStartTime.getTime()) / (1000 * 60);
      if (minutesLate > 15) { // Consider late if more than 15 minutes after start
        status = 'late';
      }
    }

    // Create attendance record
    const attendanceData = {
      session_id: session.id,
      student_id: user.id,
      group_id: session.group_id,
      status,
      check_in_time: checkInTime.toISOString(),
      student_latitude: scanData.student_latitude,
      student_longitude: scanData.student_longitude,
      distance_from_faculty_meters: distanceFromFaculty,
      check_in_method: 'qr_scan' as CheckInMethod
    };

    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert(attendanceData)
      .select('*')
      .single();

    if (recordError) throw recordError;

    // Fetch student information separately to avoid JOIN issues
    let studentName = null;
    let studentUsn = null;

    try {
      // Try to get name from profiles table first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileData?.email) {
        studentName = profileData.email; // Use email as fallback name
      }

      // Try to get USN from student_profiles table
      const { data: studentProfileData } = await supabase
        .from('student_profiles')
        .select('usn, name')
        .eq('user_id', user.id)
        .single();

      if (studentProfileData?.usn) {
        studentUsn = studentProfileData.usn;
      }
      if (studentProfileData?.name) {
        studentName = studentProfileData.name; // Use student profile name if available
      }
    } catch (profileError) {
      console.warn('Could not fetch student profile info:', profileError);
      // Continue without student info
    }

    return {
      ...record,
      student_name: studentName,
      student_usn: studentUsn,
      session_name: session.session_name,
      session_type: session.session_type
    };
  } catch (error) {
    console.error('Error processing QR scan:', error);
    throw error;
  }
};

// ===================================================================
// MANUAL ATTENDANCE MANAGEMENT
// ===================================================================

/**
 * Manually mark attendance (faculty action)
 */
export const markManualAttendance = async (data: ManualAttendanceRequest): Promise<AttendanceRecord> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify faculty has permission for this session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, group_id, faculty_id')
      .eq('id', data.session_id)
      .eq('faculty_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized');
    }

    // Check if record already exists
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', data.session_id)
      .eq('student_id', data.student_id)
      .single();

    let record;
    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('attendance_records')
        .update({
          status: data.status,
          marked_by: user.id,
          manual_reason: data.manual_reason,
          check_in_method: 'manual_faculty',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      record = updatedRecord;
    } else {
      // Create new record
      const attendanceData = {
        session_id: data.session_id,
        student_id: data.student_id,
        group_id: session.group_id,
        status: data.status,
        check_in_time: new Date().toISOString(),
        marked_by: user.id,
        manual_reason: data.manual_reason,
        check_in_method: 'manual_faculty' as CheckInMethod
      };

      const { data: newRecord, error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceData)
        .select('*')
        .single();

      if (insertError) throw insertError;
      record = newRecord;
    }

    return {
      ...record,
      student_name: null, // We'll handle name separately if needed
      student_usn: null // We'll handle USN separately if needed
    };
  } catch (error) {
    console.error('Error marking manual attendance:', error);
    throw error;
  }
};

/**
 * Get attendance records for a session
 */
export const getSessionAttendanceRecords = async (sessionId: string): Promise<AttendanceRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        attendance_sessions!session_id(session_name, session_type)
      `)
      .eq('session_id', sessionId)
      .order('check_in_time', { ascending: true });

    if (error) throw error;

    // Get all unique student IDs
    const studentIds = [...new Set((data || []).map(record => record.student_id))];

    // Fetch student profiles for all students
    const [profilesResult, studentProfilesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email')
        .in('id', studentIds),
      supabase
        .from('student_profiles')
        .select('user_id, name, usn')
        .in('user_id', studentIds)
    ]);

    // Create maps for quick lookup
    const profilesMap = new Map();
    const studentProfilesMap = new Map();

    if (profilesResult.data) {
      profilesResult.data.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }

    if (studentProfilesResult.data) {
      studentProfilesResult.data.forEach(studentProfile => {
        studentProfilesMap.set(studentProfile.user_id, studentProfile);
      });
    }

    return (data || []).map(record => {
      const profile = profilesMap.get(record.student_id);
      const studentProfile = studentProfilesMap.get(record.student_id);

      return {
        ...record,
        student_name: studentProfile?.name || profile?.email || 'Unknown Student',
        student_usn: studentProfile?.usn || 'N/A',
        session_name: record.attendance_sessions?.session_name,
        session_type: record.attendance_sessions?.session_type
      };
    });
  } catch (error) {
    console.error('Error fetching session attendance records:', error);
    throw error;
  }
};

// ===================================================================
// ATTENDANCE ANALYTICS AND REPORTING
// ===================================================================

/**
 * Get all attendance sessions for a faculty member's groups
 */
export const getFacultyAttendanceSessions = async (facultyId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        groups!inner(name, id),
        attendance_records(id, status)
      `)
      .eq('faculty_id', facultyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate attendance statistics for each session
    const sessionsWithStats = (data || []).map(session => {
      const records = session.attendance_records || [];
      const presentCount = records.filter((r: any) => r.status === 'present').length;
      const lateCount = records.filter((r: any) => r.status === 'late').length;
      const absentCount = records.filter((r: any) => r.status === 'absent').length;
      const totalStudents = presentCount + lateCount + absentCount;
      const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

      return {
        ...session,
        presentCount,
        lateCount,
        absentCount,
        totalStudents,
        attendanceRate,
        date: new Date(session.start_time).toLocaleDateString(),
        time: new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: session.end_time 
          ? `${Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} min`
          : 'Ongoing',
        location: session.faculty_latitude && session.faculty_longitude 
          ? `${session.faculty_latitude.toFixed(4)}, ${session.faculty_longitude.toFixed(4)}`
          : 'Not set'
      };
    });

    return sessionsWithStats;
  } catch (error) {
    console.error('Error fetching faculty attendance sessions:', error);
    throw error;
  }
};

/**
 * Get student attendance analytics for a group
 */
export const getGroupStudentAttendance = async (groupId: string): Promise<any[]> => {
  try {
    // Get all group members - simplified query
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('student_id')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Members error:', membersError);
      throw membersError;
    }

    if (!members || members.length === 0) {
      console.log('No members found for group:', groupId);
      return [];
    }

    console.log('Found members:', members.length);

    // Get student profiles separately
    const studentIds = members.map(m => m.student_id);
    
    const [profilesResult, studentProfilesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email')
        .in('id', studentIds),
      supabase
        .from('student_profiles')
        .select('user_id, name, usn')
        .in('user_id', studentIds)
    ]);

    if (profilesResult.error) {
      console.error('Profiles error:', profilesResult.error);
    }
    if (studentProfilesResult.error) {
      console.error('Student profiles error:', studentProfilesResult.error);
    }

    // Get all attendance sessions for this group
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('group_id', groupId);

    if (sessionsError) {
      console.error('Sessions error:', sessionsError);
      throw sessionsError;
    }

    const sessionIds = (sessions || []).map(s => s.id);
    console.log('Found sessions:', sessionIds.length);

    // Get all attendance records for these sessions
    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select('student_id, status, session_id, check_in_time')
      .in('session_id', sessionIds);

    if (recordsError) {
      console.error('Records error:', recordsError);
      throw recordsError;
    }

    console.log('Found records:', (records || []).length);

    // Create maps for quick lookup
    const profilesMap = new Map();
    const studentProfilesMap = new Map();

    (profilesResult.data || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    (studentProfilesResult.data || []).forEach(studentProfile => {
      studentProfilesMap.set(studentProfile.user_id, studentProfile);
    });

    // Calculate attendance statistics for each student
    const studentAttendance = members.map(member => {
      const studentRecords = (records || []).filter(r => r.student_id === member.student_id);
      const presentSessions = studentRecords.filter(r => r.status === 'present').length;
      const lateSessions = studentRecords.filter(r => r.status === 'late').length;
      const absentSessions = sessionIds.length - studentRecords.length; // Sessions they didn't attend
      const totalSessions = sessionIds.length;
      const attendanceRate = totalSessions > 0 ? Math.round(((presentSessions + lateSessions) / totalSessions) * 100) : 0;

      // Get last attendance
      const lastRecord = studentRecords
        .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())[0];
      
      const lastAttended = lastRecord 
        ? new Date(lastRecord.check_in_time).toLocaleDateString()
        : 'Never';

      // Determine status
      let status = 'regular';
      if (attendanceRate < 75) status = 'critical';
      else if (attendanceRate < 85) status = 'at-risk';

      const profile = profilesMap.get(member.student_id);
      const studentProfile = studentProfilesMap.get(member.student_id);

      return {
        id: member.student_id,
        name: studentProfile?.name || profile?.email || 'Unknown Student',
        email: profile?.email || '',
        usn: studentProfile?.usn || 'N/A',
        avatar: studentProfile?.name ? studentProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'ST',
        presentSessions,
        lateSessions,
        absentSessions,
        totalSessions,
        attendanceRate,
        lastAttended,
        status
      };
    });

    console.log('Processed student attendance:', studentAttendance.length);
    return studentAttendance;
  } catch (error) {
    console.error('Error fetching group student attendance:', error);
    throw error;
  }
};

/**
 * Get detailed session information with student records
 */
export const getSessionDetails = async (sessionId: string): Promise<any> => {
  try {
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        groups!inner(name, id)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get all group members for this session - simplified query
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('student_id')
      .eq('group_id', session.group_id);

    if (membersError) throw membersError;

    // Get student profiles separately
    const studentIds = (members || []).map(m => m.student_id);
    
    const [profilesResult, studentProfilesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email')
        .in('id', studentIds),
      supabase
        .from('student_profiles')
        .select('user_id, name, usn')
        .in('user_id', studentIds)
    ]);

    // Create maps for quick lookup
    const profilesMap = new Map();
    const studentProfilesMap = new Map();

    (profilesResult.data || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    (studentProfilesResult.data || []).forEach(studentProfile => {
      studentProfilesMap.set(studentProfile.user_id, studentProfile);
    });

    // Get attendance records for this session
    const attendanceRecords = await getSessionAttendanceRecords(sessionId);

    // Create a map of attendance records by student ID
    const recordsMap = new Map();
    attendanceRecords.forEach(record => {
      recordsMap.set(record.student_id, record);
    });

    // Create detailed student records
    const studentRecords = (members || []).map(member => {
      const record = recordsMap.get(member.student_id);
      const profile = profilesMap.get(member.student_id);
      const studentProfile = studentProfilesMap.get(member.student_id);

      return {
        studentId: member.student_id,
        name: studentProfile?.name || profile?.email || 'Unknown Student',
        usn: studentProfile?.usn || 'N/A',
        avatar: studentProfile?.name ? studentProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'ST',
        status: record ? record.status : 'absent',
        timestamp: record ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        location: record && record.student_latitude && record.student_longitude ? 'Verified' : undefined,
        checkInMethod: record?.check_in_method || null
      };
    });

    return {
      ...session,
      studentRecords,
      presentCount: studentRecords.filter(r => r.status === 'present').length,
      lateCount: studentRecords.filter(r => r.status === 'late').length,
      absentCount: studentRecords.filter(r => r.status === 'absent').length,
      date: new Date(session.start_time).toLocaleDateString(),
      time: new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: session.faculty_latitude && session.faculty_longitude 
        ? `${session.faculty_latitude.toFixed(4)}, ${session.faculty_longitude.toFixed(4)}`
        : 'Not set'
    };
  } catch (error) {
    console.error('Error fetching session details:', error);
    throw error;
  }
};

// ===================================================================
// EXISTING ANALYTICS FUNCTIONS
// ===================================================================

/**
 * Get attendance summary for a student in a specific group
 */
export const getStudentAttendanceSummary = async (
  studentId: string, 
  groupId: string
): Promise<AttendanceSummary | null> => {
  try {
    // Get all sessions for this group (both active and completed)
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('group_id', groupId)
      .in('status', ['active', 'completed']);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return null;
    }

    const totalSessions = sessions?.length || 0;

    // Get student's attendance records for this group
    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select('status, session_id')
      .eq('student_id', studentId)
      .eq('group_id', groupId);

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError);
      return null;
    }

    // Calculate attendance statistics
    const attendanceRecords = records || [];
    const presentSessions = attendanceRecords.filter(r => r.status === 'present').length;
    const lateSessions = attendanceRecords.filter(r => r.status === 'late').length;
    const excusedSessions = attendanceRecords.filter(r => r.status === 'excused').length;
    
    // Calculate absent sessions correctly: 
    // Total sessions minus all sessions where student has any record (present, late, excused)
    const recordedSessionIds = new Set(attendanceRecords.map(r => r.session_id));
    const sessionsWithRecords = attendanceRecords.length;
    const absentSessions = Math.max(0, totalSessions - sessionsWithRecords);
    
    const attendedSessions = presentSessions + lateSessions; // Only count present and late as attended
    const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // Get student and group info
    const { data: student } = await supabase
      .from('student_profiles')
      .select('name, usn')
      .eq('user_id', studentId)
      .single();

    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    return {
      student_id: studentId,
      group_id: groupId,
      group_name: group?.name || 'Unknown Group',
      student_name: student?.name || 'Unknown Student',
      student_usn: student?.usn || 'Unknown USN',
      total_sessions: totalSessions,
      attended_sessions: attendedSessions,
      present_sessions: presentSessions,
      late_sessions: lateSessions,
      absent_sessions: absentSessions,
      excused_sessions: excusedSessions,
      attendance_percentage: Number(attendancePercentage.toFixed(1))
    };
  } catch (error) {
    console.error('Error calculating student attendance summary:', error);
    return null;
  }
};

/**
 * Get attendance summary for all students in a group
 */
export const getGroupAttendanceSummary = async (groupId: string): Promise<AttendanceSummary[]> => {
  try {
    const { data, error } = await supabase
      .from('attendance_summary')
      .select('*')
      .eq('group_id', groupId)
      .order('attendance_percentage', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching group attendance summary:', error);
    throw error;
  }
};

/**
 * Get students with low attendance for notifications
 */
export const getStudentsWithLowAttendance = async (groupId: string): Promise<AttendanceSummary[]> => {
  try {
    // Get class settings for threshold
    const { data: settings } = await supabase
      .from('class_attendance_settings')
      .select('notification_threshold_percentage')
      .eq('group_id', groupId)
      .single();

    const threshold = settings?.notification_threshold_percentage || 70;

    const { data, error } = await supabase
      .from('attendance_summary')
      .select('*')
      .eq('group_id', groupId)
      .lt('attendance_percentage', threshold)
      .order('attendance_percentage', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching students with low attendance:', error);
    throw error;
  }
};

// ===================================================================
// CLASS ATTENDANCE SETTINGS
// ===================================================================

/**
 * Get or create class attendance settings
 */
export const getClassAttendanceSettings = async (groupId: string): Promise<ClassAttendanceSettings> => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if group exists first
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, faculty_id')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Group not found:', groupError);
      throw new Error(`Group not found: ${groupError.message}`);
    }

    if (!group) {
      throw new Error('Group does not exist');
    }

    let { data: settings, error } = await supabase
      .from('class_attendance_settings')
      .select('*')
      .eq('group_id', groupId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create default settings if they don't exist
      const defaultSettings = {
        group_id: groupId,
        faculty_id: group.faculty_id || user.id,
        minimum_attendance_percentage: 75.00,
        enable_low_attendance_notifications: true,
        notification_threshold_percentage: 70.00,
        notification_frequency_days: 7,
        default_session_duration_minutes: 60,
        default_qr_duration_minutes: 5,
        default_allowed_radius_meters: 20,
        allow_late_entry_by_default: true,
        default_late_entry_hours: 24
      };

      console.log('Creating default attendance settings for group:', groupId);
      
      const { data: newSettings, error: createError } = await supabase
        .from('class_attendance_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (createError) {
        console.error('Error creating attendance settings:', {
          error: createError,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        });
        
        // Try to return default settings without saving to DB if table doesn't exist
        console.warn('Falling back to in-memory default settings');
        return {
          id: 'default',
          group_id: groupId,
          faculty_id: group.faculty_id || user.id,
          minimum_attendance_percentage: 75.00,
          enable_low_attendance_notifications: true,
          notification_threshold_percentage: 70.00,
          notification_frequency_days: 7,
          default_session_duration_minutes: 60,
          default_qr_duration_minutes: 5,
          default_allowed_radius_meters: 20,
          allow_late_entry_by_default: true,
          default_late_entry_hours: 24,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as ClassAttendanceSettings;
      }
      settings = newSettings;
    } else if (error) {
      console.error('Error fetching attendance settings:', {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Return default settings if there's a database error
      console.warn('Falling back to default settings due to database error');
      return {
        id: 'default',
        group_id: groupId,
        faculty_id: group.faculty_id || user.id,
        minimum_attendance_percentage: 75.00,
        enable_low_attendance_notifications: true,
        notification_threshold_percentage: 70.00,
        notification_frequency_days: 7,
        default_session_duration_minutes: 60,
        default_qr_duration_minutes: 5,
        default_allowed_radius_meters: 20,
        allow_late_entry_by_default: true,
        default_late_entry_hours: 24,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ClassAttendanceSettings;
    } else {
      settings = settings;
    }

    if (!settings) {
      throw new Error('Failed to get or create attendance settings');
    }

    return settings;
  } catch (error) {
    console.error('Error getting class attendance settings:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      groupId: groupId
    });
    
    // Return default settings as fallback
    const { data: { user } } = await supabase.auth.getUser();
    return {
      id: 'default',
      group_id: groupId,
      faculty_id: user?.id || 'unknown',
      minimum_attendance_percentage: 75.00,
      enable_low_attendance_notifications: true,
      notification_threshold_percentage: 70.00,
      notification_frequency_days: 7,
      default_session_duration_minutes: 60,
      default_qr_duration_minutes: 5,
      default_allowed_radius_meters: 20,
      allow_late_entry_by_default: true,
      default_late_entry_hours: 24,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ClassAttendanceSettings;
  }
};

/**
 * Update class attendance settings
 */
export const updateClassAttendanceSettings = async (
  groupId: string, 
  updates: Partial<ClassAttendanceSettings>
): Promise<ClassAttendanceSettings> => {
  try {
    const { data, error } = await supabase
      .from('class_attendance_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating class attendance settings:', error);
    throw error;
  }
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRadians = (degrees: number): number => degrees * (Math.PI/180);

/**
 * Generate QR code data URL for display
 */
export const generateQRCodeURL = (qrToken: string, baseUrl: string = window.location.origin): string => {
  const attendanceUrl = `${baseUrl}/attendance/scan?token=${qrToken}`;
  return attendanceUrl;
};

/**
 * Check if student can mark attendance for a session
 */
export const canMarkAttendance = async (sessionId: string, studentId: string): Promise<{
  canMark: boolean;
  reason?: string;
  existingRecord?: AttendanceRecord;
}> => {
  try {
    // Check if student already marked attendance
    const { data: existingRecord, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking attendance records:', error);
      return { canMark: false, reason: 'Error checking attendance records' };
    }

    if (existingRecord) {
      return {
        canMark: false,
        reason: 'Attendance already marked',
        existingRecord
      };
    }

    // Check if session is still active and QR is valid
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('status, qr_expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error checking session status:', sessionError);
      return { canMark: false, reason: 'Error checking session status' };
    }

    if (session?.status !== 'active') {
      return {
        canMark: false,
        reason: 'Attendance session is not active'
      };
    }

    if (new Date() > new Date(session.qr_expires_at)) {
      return {
        canMark: false,
        reason: 'QR code has expired'
      };
    }

    return { canMark: true };
  } catch (error) {
    console.error('Error checking attendance eligibility:', error);
    return { canMark: false, reason: 'Error checking attendance eligibility' };
  }
};

// Get student session history with attendance details
export const getStudentSessionHistory = async (
  studentId: string,
  groupId: string
): Promise<any[]> => {
  try {
    console.log('Fetching sessions for studentId:', studentId, 'groupId:', groupId);
    
    // First, get all sessions for the group
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select(`
        id,
        session_name,
        session_type,
        created_at,
        end_time,
        status
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    console.log('Found sessions:', sessions?.length || 0);

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Get all attendance records for this student in this group
    const sessionIds = sessions.map(session => session.id);
    console.log('Fetching attendance records for sessions:', sessionIds);
    
    const { data: attendanceRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .in('session_id', sessionIds);

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError);
      throw new Error(`Failed to fetch attendance records: ${recordsError.message}`);
    }

    console.log('Found attendance records:', attendanceRecords?.length || 0);

    // Create a map of session_id to attendance record
    const attendanceMap = new Map();
    (attendanceRecords || []).forEach(record => {
      attendanceMap.set(record.session_id, record);
    });

    // Transform the data to include attendance status for each session
    const sessionHistory = sessions.map(session => {
      const attendanceRecord = attendanceMap.get(session.id);
      
      return {
        ...session,
        attendance_status: attendanceRecord?.status || 'absent',
        marked_at: attendanceRecord?.check_in_time, // Use check_in_time from database
        location_verified: !!(attendanceRecord?.student_latitude && attendanceRecord?.student_longitude), // Use student_latitude/longitude
        attendance_record: attendanceRecord
      };
    });

    console.log('Returning session history:', sessionHistory);
    return sessionHistory;
  } catch (error) {
    console.error('Error getting student session history:', error);
    throw error;
  }
};

// ===================================================================
// FACULTY ATTENDANCE ANALYTICS
// ===================================================================

/**
 * Get overall attendance statistics for faculty dashboard
 */
export const getFacultyAttendanceStats = async (facultyId: string) => {
  try {
    // Get all groups for this faculty
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, subject_code')
      .eq('faculty_id', facultyId);

    if (groupsError) throw groupsError;

    if (!groups || groups.length === 0) {
      return {
        overallAttendanceRate: 0,
        totalSessions: 0,
        totalStudents: 0,
        classAttendanceStats: []
      };
    }

    const groupIds = groups.map(g => g.id);

    // Get attendance summary for all groups
    const { data: attendanceSummary, error: summaryError } = await supabase
      .from('attendance_summary')
      .select('*')
      .in('group_id', groupIds);

    if (summaryError) throw summaryError;

    // Get total sessions for each group
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select('group_id, id')
      .in('group_id', groupIds)
      .eq('status', 'completed');

    if (sessionsError) throw sessionsError;

    // Calculate statistics
    const classStats = groups.map(group => {
      const groupAttendance = attendanceSummary?.filter(a => a.group_id === group.id) || [];
      const groupSessions = sessions?.filter(s => s.group_id === group.id).length || 0;
      
      const avgAttendance = groupAttendance.length > 0
        ? groupAttendance.reduce((sum, student) => sum + student.attendance_percentage, 0) / groupAttendance.length
        : 0;

      return {
        groupId: group.id,
        groupName: group.name,
        subjectCode: group.subject_code,
        averageAttendance: Math.round(avgAttendance),
        totalSessions: groupSessions,
        totalStudents: groupAttendance.length
      };
    });

    const overallAttendanceRate = classStats.length > 0
      ? Math.round(classStats.reduce((sum, cls) => sum + cls.averageAttendance, 0) / classStats.length)
      : 0;

    const totalSessions = classStats.reduce((sum, cls) => sum + cls.totalSessions, 0);
    const totalStudents = classStats.reduce((sum, cls) => sum + cls.totalStudents, 0);

    return {
      overallAttendanceRate,
      totalSessions,
      totalStudents,
      classAttendanceStats: classStats
    };

  } catch (error) {
    console.error('Error fetching faculty attendance stats:', error);
    return {
      overallAttendanceRate: 0,
      totalSessions: 0,
      totalStudents: 0,
      classAttendanceStats: []
    };
  }
};

/**
 * Get attendance statistics for a specific group
 */
export const getGroupAttendanceStats = async (groupId: string) => {
  try {
    // Get attendance sessions for this group
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select(`
        id,
        session_name,
        session_date,
        status,
        attendance_records(*)
      `)
      .eq('group_id', groupId)
      .eq('status', 'completed');

    if (sessionsError) {
      console.error('Error fetching group attendance sessions:', sessionsError);
      return { averageAttendance: 0, totalSessions: 0, totalStudents: 0 };
    }

    // Get group members count
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('student_id')
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return { averageAttendance: 0, totalSessions: 0, totalStudents: 0 };
    }

    const totalStudents = members?.length || 0;
    const totalSessions = sessions?.length || 0;

    if (totalSessions === 0 || totalStudents === 0) {
      return { averageAttendance: 0, totalSessions, totalStudents };
    }

    // Calculate attendance rate
    let totalPresentRecords = 0;
    let totalPossibleAttendance = totalSessions * totalStudents;

    sessions?.forEach(session => {
      const presentCount = session.attendance_records?.filter(
        (record: any) => record.status === 'present'
      ).length || 0;
      totalPresentRecords += presentCount;
    });

    const averageAttendance = totalPossibleAttendance > 0 
      ? Math.round((totalPresentRecords / totalPossibleAttendance) * 100)
      : 0;

    return {
      averageAttendance,
      totalSessions,
      totalStudents
    };

  } catch (error) {
    console.error('Error calculating group attendance stats:', error);
    return { averageAttendance: 0, totalSessions: 0, totalStudents: 0 };
  }
};
