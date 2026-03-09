"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TeachworksStudent, TeachworksEmployee } from "@/lib/teachworks/types";
import StudentTable from "./components/StudentTable";
import EmployeeTable from "./components/EmployeeTable";
import CreateAdminModal from "./components/CreateAdminModal";

const ITEMS_PER_PAGE = 5;

type TabType = "students" | "coaches";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Student state
  const [students, setStudents] = useState<TeachworksStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<TeachworksStudent | null>(null);
  
  // Employee state
  const [employees, setEmployees] = useState<TeachworksEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<TeachworksEmployee | null>(null);
  
  // Modal state
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Check if user has admin role (role 3)
  useEffect(() => {
    async function checkAdminRole() {
      try {
        const response = await fetch("/api/user/role");
        if (!response.ok) {
          throw new Error("Failed to fetch user role");
        }
        const data = await response.json();
        
        if (data.role !== 3) {
          // Not an admin, redirect to home
          router.push("/home");
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        router.push("/home");
      }
    }

    checkAdminRole();
  }, [router]);

  // Fetch students
  useEffect(() => {
    async function fetchStudents() {
      try {
        setStudentsLoading(true);
        const response = await fetch("/api/admin/students");
        
        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }
        
        const data = await response.json();
        setStudents(data);
      } catch (err) {
        setStudentsError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setStudentsLoading(false);
      }
    }

    fetchStudents();
  }, []);

  // Fetch employees
  useEffect(() => {
    async function fetchEmployees() {
      try {
        setEmployeesLoading(true);
        const response = await fetch("/api/admin/employees");
        
        if (!response.ok) {
          throw new Error("Failed to fetch employees");
        }
        
        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        setEmployeesError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setEmployeesLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    
    const query = studentSearchQuery.toLowerCase();
    return students.filter((student) => {
      return (
        student.first_name.toLowerCase().includes(query) ||
        student.last_name.toLowerCase().includes(query) ||
        student.id.toString().includes(query) ||
        student.customer_id.toString().includes(query)
      );
    });
  }, [students, studentSearchQuery]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    // First filter to only show teachers
    const teachers = employees.filter((employee) => employee.position === "Teacher");
    
    if (!employeeSearchQuery.trim()) return teachers;
    
    const query = employeeSearchQuery.toLowerCase();
    return teachers.filter((employee) => {
      return (
        employee.first_name.toLowerCase().includes(query) ||
        employee.last_name.toLowerCase().includes(query) ||
        employee.id.toString().includes(query) ||
        employee.position.toLowerCase().includes(query)
      );
    });
  }, [employees, employeeSearchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setStudentCurrentPage(1);
  }, [studentSearchQuery]);

  useEffect(() => {
    setEmployeeCurrentPage(1);
  }, [employeeSearchQuery]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedStudent) setSelectedStudent(null);
        if (selectedEmployee) setSelectedEmployee(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedStudent, selectedEmployee]);

  // Paginate filtered students
  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (studentCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, studentCurrentPage]);

  // Paginate filtered employees
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (employeeCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, employeeCurrentPage]);

  const loading = activeTab === "students" ? studentsLoading : employeesLoading;
  const error = activeTab === "students" ? studentsError : employeesError;

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-gray-700">Verifying access...</p>
      </div>
    );
  }

  // If not authorized, show nothing (redirect is happening)
  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-gray-700">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-base font-bold text-gray-900">Admin</h1>
        <button
          onClick={() => setIsCreateAdminModalOpen(true)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + Create Admin
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "students"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Students
        </button>
        <button
          onClick={() => setActiveTab("coaches")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "coaches"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Coaches
        </button>
      </div>

      {/* Students Tab */}
      {activeTab === "students" && (
        <>
          {/* Search Bar */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, student ID, or customer ID..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <StudentTable 
            students={paginatedStudents} 
            onStudentClick={setSelectedStudent}
          />
          
          {/* Pagination Controls */}
          {studentTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {((studentCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(studentCurrentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setStudentCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={studentCurrentPage === 1}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-xs text-gray-700">
                  {studentCurrentPage} / {studentTotalPages}
                </span>
                <button
                  onClick={() => setStudentCurrentPage((prev) => Math.min(prev + 1, studentTotalPages))}
                  disabled={studentCurrentPage === studentTotalPages}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {studentTotalPages <= 1 && filteredStudents.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">Total: {filteredStudents.length}</p>
          )}
        </>
      )}

      {/* Coaches Tab */}
      {activeTab === "coaches" && (
        <>
          {/* Search Bar */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, employee ID, or position..."
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <EmployeeTable 
            employees={paginatedEmployees} 
            onEmployeeClick={setSelectedEmployee}
          />
          
          {/* Pagination Controls */}
          {employeeTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {((employeeCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(employeeCurrentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEmployeeCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={employeeCurrentPage === 1}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-xs text-gray-700">
                  {employeeCurrentPage} / {employeeTotalPages}
                </span>
                <button
                  onClick={() => setEmployeeCurrentPage((prev) => Math.min(prev + 1, employeeTotalPages))}
                  disabled={employeeCurrentPage === employeeTotalPages}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {employeeTotalPages <= 1 && filteredEmployees.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">Total: {filteredEmployees.length}</p>
          )}
        </>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedStudent(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Student ID:</span>
                    <p className="text-gray-900 font-medium">{selectedStudent.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Customer ID:</span>
                    <p className="text-gray-900 font-medium">{selectedStudent.customer_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="text-gray-900 font-medium capitalize">{selectedStudent.student_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className={`font-medium ${selectedStudent.status === 'Active' ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedStudent.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="text-gray-900">{selectedStudent.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Additional Email:</span>
                    <p className="text-gray-900">{selectedStudent.additional_email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Home Phone:</span>
                    <p className="text-gray-900">{selectedStudent.home_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Mobile Phone:</span>
                    <p className="text-gray-900">{selectedStudent.mobile_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Academic Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">School:</span>
                    <p className="text-gray-900">{selectedStudent.school || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Grade:</span>
                    <p className="text-gray-900">{selectedStudent.grade || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Subjects:</span>
                    <p className="text-gray-900">{selectedStudent.subjects || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Birth Date:</span>
                    <p className="text-gray-900">{selectedStudent.birth_date || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <p className="text-gray-900">{selectedStudent.start_date || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Billing Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Billing Method:</span>
                    <p className="text-gray-900">{selectedStudent.billing_method}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Discount Rate:</span>
                    <p className="text-gray-900">{selectedStudent.discount_rate ? `${selectedStudent.discount_rate}%` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Default Teachers */}
              {selectedStudent.default_teachers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Default Teachers</h3>
                  <div className="text-xs space-y-1">
                    {selectedStudent.default_teachers.map((teacher) => (
                      <p key={teacher.id} className="text-gray-900">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Services */}
              {selectedStudent.default_services.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Default Services</h3>
                  <div className="text-xs space-y-1">
                    {selectedStudent.default_services.map((service) => (
                      <p key={service.id} className="text-gray-900">{service.name}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {selectedStudent.custom_fields.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Custom Fields</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedStudent.custom_fields.map((field) => (
                      <div key={field.field_id}>
                        <span className="text-gray-500">{field.name}:</span>
                        <p className="text-gray-900">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedStudent.additional_notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Notes</h3>
                  <p className="text-xs text-gray-900">{selectedStudent.additional_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEmployee(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h2>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Employee ID:</span>
                    <p className="text-gray-900 font-medium">{selectedEmployee.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="text-gray-900 font-medium">{selectedEmployee.employee_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <p className="text-gray-900 font-medium">{selectedEmployee.position}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className={`font-medium ${selectedEmployee.status === 'Active' ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedEmployee.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="text-gray-900">{selectedEmployee.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Mobile Phone:</span>
                    <p className="text-gray-900">{selectedEmployee.mobile_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Home Phone:</span>
                    <p className="text-gray-900">{selectedEmployee.home_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Address:</span>
                    <p className="text-gray-900">{selectedEmployee.address || 'N/A'}</p>
                  </div>
                  {selectedEmployee.city && (
                    <div>
                      <span className="text-gray-500">City:</span>
                      <p className="text-gray-900">{selectedEmployee.city}, {selectedEmployee.state} {selectedEmployee.zip}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Employment Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Hire Date:</span>
                    <p className="text-gray-900">{selectedEmployee.hire_date || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Birth Date:</span>
                    <p className="text-gray-900">{selectedEmployee.birth_date || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Subjects:</span>
                    <p className="text-gray-900">{selectedEmployee.subjects || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedEmployee.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Bio</h3>
                  <p className="text-xs text-gray-900">{selectedEmployee.bio}</p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedEmployee.additional_notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Notes</h3>
                  <p className="text-xs text-gray-900">{selectedEmployee.additional_notes}</p>
                </div>
              )}

              {/* Custom Fields */}
              {selectedEmployee.custom_fields.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Custom Fields</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedEmployee.custom_fields.map((field) => (
                      <div key={field.field_id}>
                        <span className="text-gray-500">{field.name}:</span>
                        <p className="text-gray-900">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => {
          // Could refresh admin list here if we add an admins tab
          alert("Admin account created successfully!");
        }}
      />
    </div>
  );
}
