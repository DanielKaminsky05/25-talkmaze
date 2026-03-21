"use client";

import Link from "next/link";

interface Student {
  id: string;
  name: string;
  tw_id: string | null;
}

interface StudentDetailsProps {
  student: Student | null;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  if (!student) {
    return (
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm p-6 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">Select a student</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-xs">Click a student in your list to view their coaching details.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
        </div>
        <Link
          href={`/message/${student.id}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
          </svg>
          Message Student
        </Link>
      </div>

      <div className="p-8 flex-1 overflow-y-auto">
        <div className="flex items-center space-x-5 mb-8">
          <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center">
              Student ID: {student.tw_id || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
          <h3 className="text-md font-semibold text-gray-900 mb-4 border-b pb-2">Coaching Information</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{student.name}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Account ID</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">{student.id}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Upcoming Schedule</dt>
              <dd className="mt-2 text-sm text-gray-900 bg-white p-4 rounded border border-dashed border-gray-200 text-center text-gray-400">
                Integration coming soon...
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
