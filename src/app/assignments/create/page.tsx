"use client";

import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";

export default function CreateAssignmentPage() {
  // No authentication check or loading state - always show the static content

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
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
            <li>
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
                <Link
                  href="/assignments"
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-indigo-600 md:ml-2"
                >
                  Assignments
                </Link>
              </div>
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
                  Create Assignment
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Assignment
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Design a new assignment for your students
              </p>
            </div>
            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Form preview */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Assignment Details
              </h2>
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                Preview
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              This form will allow you to create detailed assignments with rich
              content and custom settings.
            </p>
          </div>

          {/* Form fields preview */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                  placeholder="Enter assignment title"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <div className="w-full h-32 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    placeholder="100"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Groups
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                  disabled
                >
                  <option>Select groups...</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                * All fields will be required
              </div>
              <button
                className="px-6 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
                disabled
              >
                Create Assignment
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Assignment Creation Feature
              </h3>
              <p className="text-indigo-700">Under active development</p>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            We&apos;re working on bringing you a powerful assignment creation
            tool with the following features:
          </p>

          <ul className="list-disc pl-5 mb-4 text-gray-600 space-y-1">
            <li>Rich text editor with formatting options</li>
            <li>File attachment capabilities</li>
            <li>Custom grading criteria</li>
            <li>Group-specific assignments</li>
            <li>Scheduling and deadline management</li>
          </ul>

          <div className="w-full bg-white rounded-full h-2.5 mb-2">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: "75%" }}
            ></div>
          </div>
          <p className="text-sm text-indigo-800 text-right">
            Development Progress: 75%
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
