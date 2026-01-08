import React, { useEffect, useState, useMemo } from 'react';
import axios, { isAxiosError } from 'axios';
import { API_URL } from '../../constant/constant';

interface ScholarshipApplication {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  status: string;
  certificatePath: string;
  photoPath: string;
  scholarship: {
    name: string;
  };
}

const ITEMS_PER_PAGE = 10;

const ScholarshipApply: React.FC = () => {
  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null); // for status/delete loading

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterScholarship, setFilterScholarship] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: '',
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<{ success: boolean; data: ScholarshipApplication[]; message?: string }>(
        `${API_URL}/scholarshipapplications/get-all-scholarship`
      );

      if (response.data.success) {
        setApplications(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch applications');
      }
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'Network error');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update Status
  const handleStatusChange = async (id: number, newStatus: string) => {
    if (newStatus === '') return;
    setActionLoading(id);
    try {
      await axios.put(`${API_URL}/scholarshipapplications/${id}/status`, { status: newStatus },{
        headers:{
            Authorization:`Bearer ${localStorage.getItem("accessToken")}`
        }
      }); // Adjust route if needed

      setApplications(prev =>
        prev.map(app => (app.id === id ? { ...app, status: newStatus } : app))
      );

      // Optional: show success toast
    } catch (err) {
      alert('Failed to update status. Please try again.');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Application
const handleDelete = async () => {
  if (!deleteModal.id) return;
  setActionLoading(deleteModal.id);

  try {
    await axios.delete(
      `${API_URL}/scholarshipapplications/${deleteModal.id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    // Remove the deleted application from state
    setApplications(prev => prev.filter(app => app.id !== deleteModal.id));

    // Close the delete modal
    setDeleteModal({ open: false, id: null, name: '' });

    // Optional: show a success toast
    // toast.success("Application deleted successfully");
  } catch (err) {
    alert("Failed to delete application. Please try again.");
    console.error(err);
  } finally {
    setActionLoading(null);
  }
};


  // Filtering & Pagination
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesName = app.fullName.toLowerCase().includes(searchName.toLowerCase());
      const matchesCourse = app.course.toLowerCase().includes(filterCourse.toLowerCase());
      const matchesScholarship = app.scholarship.name.toLowerCase().includes(filterScholarship.toLowerCase());
      const matchesStatus = filterStatus === 'all' || app.status.toLowerCase() === filterStatus.toLowerCase();
      return matchesName && matchesCourse && matchesScholarship && matchesStatus;
    });
  }, [applications, searchName, filterCourse, filterScholarship, filterStatus]);

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage]);

  const openPhotoModal = (url: string, name: string) => {
    setSelectedPhoto({ url, name });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPhoto(null);
  };

  // Loading & Error
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Scholarship Applications</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchName}
          onChange={(e) => { setSearchName(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by course..."
          value={filterCourse}
          onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by scholarship..."
          value={filterScholarship}
          onChange={(e) => { setFilterScholarship(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Showing {paginatedApplications.length} of {filteredApplications.length} applications
      </p>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">No applications match your filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Scholarship</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Certificate</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Photo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">#{app.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{app.fullName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{app.mobile}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{app.course}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{app.scholarship.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={actionLoading === app.id}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${
                          app.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                          app.status.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                          app.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={app.certificatePath} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:underline text-xs">
                        View
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openPhotoModal(app.photoPath, app.fullName)}>
                        <img
                          src={app.photoPath}
                          alt={app.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-gray-300 cursor-pointer hover:opacity-80 transition"
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDeleteModal({ open: true, id: app.id, name: app.fullName })}
                        disabled={actionLoading === app.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        {actionLoading === app.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-4">
            {paginatedApplications.map((app) => (
              <div key={app.id} className="bg-white p-5 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">#{app.id} - {app.fullName}</p>
                    <p className="text-xs text-gray-600">{app.mobile}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      disabled={actionLoading === app.id}
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        app.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                        app.status.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <button
                      onClick={() => setDeleteModal({ open: true, id: app.id, name: app.fullName })}
                      className="text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
                  <div><strong>Course:</strong> {app.course}</div>
                  <div><strong>Scholarship:</strong> {app.scholarship.name}</div>
                </div>
                <div className="flex items-center justify-between">
                  <a href={app.certificatePath} target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 text-xs underline">
                    View Certificate
                  </a>
                  <button onClick={() => openPhotoModal(app.photoPath, app.fullName)}>
                    <img
                      src={app.photoPath}
                      alt={app.fullName}
                      className="w-14 h-14 rounded-full object-cover border border-gray-300"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Photo Modal */}
      {modalOpen && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="relative max-w-lg w-full">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
            >
              ✕
            </button>
            <img src={selectedPhoto.url} alt={selectedPhoto.name} className="w-full rounded-lg shadow-2xl" />
            <p className="text-center text-white mt-4 text-sm">{selectedPhoto.name}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the application of <strong>{deleteModal.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-70"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipApply;