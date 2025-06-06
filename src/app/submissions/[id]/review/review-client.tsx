"use client";

import Link from 'next/link';
import MainLayout from '@/components/layout/main-layout';

interface ReviewClientProps {
  submissionId: string;
}

export default function ReviewSubmissionClientPage({ submissionId }: ReviewClientProps) {
  // Sample submission data for the static UI - uses the passed submissionId
  const submissionData = {
    id: submissionId,
    title: "Programming Assignment #3", // This would typically be fetched based on submissionId
    student: {
      name: "Reyna",
      usn: "24bsr08100",
      email: "24bsr08100@jainuniversity.ac.in"
    },
    group: {
      name: "FSP - B Group 4",
      subject: "Full Stack Programming"
    },
    submittedAt: "2025-05-20T14:30:00",
    dueDate: "2025-05-25T23:59:59",
    status: "Submitted on time",
    files: [
      { name: "main.py", size: "4.2 KB", type: "Python" },
      { name: "utils.py", size: "2.1 KB", type: "Python" },
      { name: "README.md", size: "1.8 KB", type: "Markdown" }
    ],
    feedback: "", // Added for the form
    grade: "" // Added for the form
  };

  // In a real application, you would fetch submission details based on submissionId
  // useEffect(() => {
  //   // fetchSubmissionDetails(submissionId).then(setData);
  // }, [submissionId]);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                <Link href="/submissions" className="ml-1 text-sm font-medium text-gray-700 hover:text-indigo-600 md:ml-2">Submissions</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                <span className="ml-1 text-sm font-medium text-indigo-600 md:ml-2">Review Submission ({submissionData.id})</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page header with submission info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{submissionData.title}</h1>
              <p className="mt-1 text-sm text-gray-600">{submissionData.group.name} - {submissionData.group.subject}</p>
            </div>
            <span className="mt-2 md:mt-0 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {submissionData.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Student Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 font-medium">{submissionData.student.name}</p>
                <p className="text-gray-600 text-sm">{submissionData.student.usn}</p>
                <p className="text-gray-600 text-sm">{submissionData.student.email}</p>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Submission Details</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 text-sm">Submitted on:</span>
                  <span className="text-gray-800 text-sm">{new Date(submissionData.submittedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 text-sm">Due date:</span>
                  <span className="text-gray-800 text-sm">{new Date(submissionData.dueDate).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Submitted Files</h2>
            <ul className="bg-gray-50 rounded-lg p-4 space-y-3">
              {submissionData.files.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:shadow-sm">
                  <div>
                    <p className="text-gray-800 font-medium">{file.name}</p>
                    <p className="text-gray-500 text-xs">{file.size} - {file.type}</p>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Download</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feedback and Grading Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Provide Feedback and Grade</h2>
          <form>
            <div className="mb-6">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
              <textarea
                id="feedback"
                name="feedback"
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Provide constructive feedback for the student..."
                defaultValue={submissionData.feedback}
              />
            </div>
            <div className="mb-6">
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <input
                type="text"
                id="grade"
                name="grade"
                className="w-full md:w-1/3 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., A+, 85/100"
                defaultValue={submissionData.grade}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Draft
              </button>
              <button
                type="submit"
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
