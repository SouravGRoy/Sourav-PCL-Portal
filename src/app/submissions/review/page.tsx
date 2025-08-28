"use client";

import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";

export default function SubmissionsReviewPage() {
  // Sample submissions data for the static UI
  const submissions = [
    {
      id: "sub-001",
      title: "Programming Assignment #3",
      student: {
        name: "Reyna",
        usn: "24abc08100",
        email: "24abc08100@university.ac.in",
      },
      group: {
        name: "FSP - B Group 4",
        subject: "Full Stack Programming",
      },
      submittedAt: "2025-05-20T14:30:00",
      dueDate: "2025-05-25T23:59:59",
      status: "Submitted on time",
    },
    {
      id: "sub-002",
      title: "Database Design Project",
      student: {
        name: "Alex Johnson",
        usn: "24abc08101",
        email: "24abc08101@university.ac.in",
      },
      group: {
        name: "FSP - A Group 2",
        subject: "Database Systems",
      },
      submittedAt: "2025-05-19T10:15:00",
      dueDate: "2025-05-20T23:59:59",
      status: "Submitted on time",
    },
    {
      id: "sub-003",
      title: "UI/UX Design Challenge",
      student: {
        name: "Priya Sharma",
        usn: "24abc08102",
        email: "24abc08102@university.ac.in",
      },
      group: {
        name: "FSP - C Group 1",
        subject: "User Interface Design",
      },
      submittedAt: "2025-05-22T18:45:00",
      dueDate: "2025-05-21T23:59:59",
      status: "Late submission",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Dashboard
              </Link>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-indigo-600 md:ml-2">
                  Review Submissions
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review Submissions
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and grade student assignment submissions
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Filters and search section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 md:mb-0">
              Filters
            </h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <select
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                disabled
              >
                <option>All Groups</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                disabled
              >
                <option>All Assignments</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                disabled
              >
                <option>All Statuses</option>
              </select>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
              placeholder="Search submissions..."
              disabled
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Submissions list */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Submissions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Assignment
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Group
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Submitted
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.student.usn}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {submission.group.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.group.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(submission.submittedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          submission.status === "Late submission"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/submissions/review`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">3</span> of{" "}
              <span className="font-medium">3</span> submissions
            </div>
            <div className="flex space-x-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-gray-100 cursor-not-allowed"
                disabled
              >
                Previous
              </button>
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-gray-100 cursor-not-allowed"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Development status */}
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-full mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Submissions Review System
              </h3>
              <p className="text-indigo-700">Under active development</p>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            We&apos;re working on bringing you a comprehensive submissions
            review system with the following features:
          </p>

          <ul className="list-disc pl-5 mb-4 text-gray-600 space-y-1">
            <li>Batch review of multiple submissions</li>
            <li>Advanced filtering and search capabilities</li>
            <li>Automated grading suggestions</li>
            <li>Performance analytics and insights</li>
            <li>Feedback templates and rubrics</li>
          </ul>

          <div className="w-full bg-white rounded-full h-2.5 mb-2">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: "70%" }}
            ></div>
          </div>
          <p className="text-sm text-indigo-800 text-right">
            Development Progress: 70%
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
