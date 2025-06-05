"use client";

import Link from 'next/link';
import MainLayout from '@/components/layout/main-layout';

interface ReviewSubmissionPageProps {
  params: {
    id: string;
  };
}

export default function ReviewSubmissionPage({ params }: ReviewSubmissionPageProps) {
  const submissionId = params.id;
  
  // Sample submission data for the static UI
  const submissionData = {
    id: submissionId,
    title: "Programming Assignment #3",
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
    ]
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link href="/submissions" className="ml-1 text-sm font-medium text-gray-700 hover:text-indigo-600 md:ml-2">Submissions</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-indigo-600 md:ml-2">Review Submission</span>
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
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Submission ID:</span>
                  <span className="text-gray-800 text-sm font-mono">{submissionData.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submitted files section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Submitted Files</h2>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissionData.files.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.size}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-4">View</button>
                      <button className="text-indigo-600 hover:text-indigo-900">Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grading and feedback section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Grading & Feedback</h2>
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">Coming Soon</div>
            </div>
            <p className="text-gray-600 text-sm">Provide grades and detailed feedback for this submission.</p>
          </div>
          
          {/* Form fields preview */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade (out of 100)</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100" 
                placeholder="Enter grade" 
                disabled 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
              <div className="w-full h-32 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code Quality (1-5)</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100" 
                  disabled
                >
                  <option>Select rating...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documentation (1-5)</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100" 
                  disabled
                >
                  <option>Select rating...</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">* All fields will be required</div>
              <button 
                className="px-6 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed" 
                disabled
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
        
        {/* Development status */}
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Submission Review Feature</h3>
              <p className="text-indigo-700">Under active development</p>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">We&apos;re working on bringing you a powerful submission review system with the following features:</p>
          
          <ul className="list-disc pl-5 mb-4 text-gray-600 space-y-1">
            <li>Inline code review with comments</li>
            <li>Rubric-based grading</li>
            <li>Automated feedback suggestions</li>
            <li>Plagiarism detection</li>
            <li>Detailed performance analytics</li>
          </ul>
          
          <div className="w-full bg-white rounded-full h-2.5 mb-2">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
          </div>
          <p className="text-sm text-indigo-800 text-right">Development Progress: 70%</p>
        </div>
      </div>
    </MainLayout>
  );
}
