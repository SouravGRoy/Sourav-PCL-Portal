// Export all API modules using namespaces to avoid conflicts
import * as GroupsAPI from './groups';
import * as StudentsAPI from './students';
import * as ProfilesAPI from './profiles';
import * as DriveLinksAPI from './drive-links';
import * as AssignmentsAPI from './assignments';

// Re-export individual functions from drive-links for backward compatibility
export const {
  getStudentDriveLinks,
  addStudentDriveLink,
  updateStudentDriveLink,
  removeStudentDriveLink,
  getGroupDriveLinks
} = DriveLinksAPI;

// Export namespaced APIs
export {
  GroupsAPI,
  StudentsAPI,
  ProfilesAPI,
  DriveLinksAPI,
  AssignmentsAPI
};
