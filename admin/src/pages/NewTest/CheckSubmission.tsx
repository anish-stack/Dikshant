import React, { useEffect, useState, useMemo } from 'react';
import api from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { useParams } from 'react-router-dom';

import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table';

const CheckSubmission = () => {
    const { id } = useParams<{ id: string }>();

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, checked: 0, pending: 0 });
    const [paperTitle, setPaperTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // Table States
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    // Modal States
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [showRecheckModal, setShowRecheckModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");

    // Form States
    const [marksObtained, setMarksObtained] = useState<number | "">("");
    const [totalMarks, setTotalMarks] = useState<number | "">("");
    const [feedback, setFeedback] = useState("");
    const [checkedFile, setCheckedFile] = useState<File | null>(null);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/new/admin/mains/submissions?testId=${id}`);

            setSubmissions(res.data.data || []);
            setStats(res.data.stats || { total: 0, checked: 0, pending: 0 });
            setPaperTitle(res.data.paper?.paper_title || "");
        } catch (error: any) {
            console.error("API Error:", error?.response?.data || error.message);
            toast.error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchSubmissions();
    }, [id]);

    const refreshData = () => fetchSubmissions();

    // Start Checking
    const handleStartChecking = async (submissionId: string) => {
        try {
            await api.put(`/new/admin/mains/start-check/${submissionId}`);
            toast.success("Marked as Under Review");
            refreshData();
        } catch (err) {
            toast.error("Failed to start checking");
        }
    };

    // Final Check
    const handleCheckSubmission = async () => {
        if (!selectedSubmission || !checkedFile || !marksObtained || !totalMarks) {
            toast.error("Please fill all required fields and upload PDF");
            return;
        }

        const formData = new FormData();
        formData.append("file", checkedFile);
        formData.append("marks_obtained", marksObtained.toString());
        formData.append("total_marks", totalMarks.toString());
        formData.append("feedback", feedback || "");

        try {
            await api.put(`/new/admin/mains/check/${selectedSubmission.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Evaluation saved successfully!");
            setShowCheckModal(false);
            resetForm();
            refreshData();
        } catch (err) {
            toast.error("Failed to save evaluation");
        }
    };

    // Re-check
    const handleRecheck = async () => {
        if (!selectedSubmission || !marksObtained || !totalMarks) return;

        const formData = new FormData();
        if (checkedFile) formData.append("file", checkedFile);
        formData.append("marks_obtained", marksObtained.toString());
        formData.append("total_marks", totalMarks.toString());
        formData.append("feedback", feedback || "");

        try {
            await api.put(`/new/admin/mains/recheck/${selectedSubmission.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Re-evaluation saved!");
            setShowRecheckModal(false);
            resetForm();
            refreshData();
        } catch (err) {
            toast.error("Failed to re-evaluate");
        }
    };

    const resetForm = () => {
        setMarksObtained("");
        setTotalMarks("");
        setFeedback("");
        setCheckedFile(null);
        setSelectedSubmission(null);
    };

    const openCheckModal = (sub: any) => {
        setSelectedSubmission(sub);
        setShowCheckModal(true);
    };

    const openRecheckModal = (sub: any) => {
        setSelectedSubmission(sub);
        setMarksObtained(sub.marks_obtained || "");
        setTotalMarks(sub.total_marks || "");
        setFeedback(sub.feedback || "");
        setShowRecheckModal(true);
    };

    const viewPdf = (url: string) => {
        setPdfUrl(url);
        setShowPdfModal(true);
    };

    // Table Columns
    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: "user.name",
            header: "Student Name",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.user?.name}</div>
                    <div className="text-sm text-gray-500">{row.original.user?.email}</div>
                </div>
            ),
        },
        {
            accessorKey: "submitted_at",
            header: "Submitted At",
            cell: ({ row }) => new Date(row.original.submitted_at).toLocaleString(),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                const result = row.original.result_status;
                return (
                    <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit
              ${status === 'checked' ? 'bg-green-100 text-green-700' :
                                status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'}`}>
                            {status.replace('_', ' ').toUpperCase()}
                        </span>
                        {result !== 'pending' && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit
                ${result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {result.toUpperCase()}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "marks",
            header: "Marks",
            cell: ({ row }) =>
                row.original.marks_obtained !== null
                    ? `${row.original.marks_obtained} / ${row.original.total_marks}`
                    : "-",
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const sub = row.original;
                return (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => viewPdf(sub.answer_pdf_url)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                            View Answer
                        </button>

                        {sub.status === 'submitted' && (
                            <button
                                onClick={() => handleStartChecking(sub.id)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                            >
                                Start Check
                            </button>
                        )}

                        {(sub.status === 'submitted' || sub.status === 'under_review') && (
                            <button
                                onClick={() => openCheckModal(sub)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                Evaluate
                            </button>
                        )}

                        {sub.status === 'checked' && (
                            <button
                                onClick={() => openRecheckModal(sub)}
                                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                            >
                                Re-check
                            </button>
                        )}

                        {sub.evaluated_pdf_url && (
                            <button
                                onClick={() => viewPdf(sub.evaluated_pdf_url)}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                                View Checked
                            </button>
                        )}
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: submissions,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
    });

    if (loading) {
        return <div className="p-10 text-center text-lg">Loading submissions...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Check Mains Submissions</h1>
                <p className="text-gray-600 mt-1">{paperTitle}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500">Total Submissions</p>
                    <p className="text-4xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500">Checked</p>
                    <p className="text-4xl font-bold mt-2 text-green-600">{stats.checked}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500">Pending</p>
                    <p className="text-4xl font-bold mt-2 text-orange-600">{stats.pending}</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by student name or email..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-6 py-4 text-sm text-gray-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No submissions found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-gray-600">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Check / Evaluate Modal */}
            {showCheckModal && selectedSubmission && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4">
                        <h2 className="text-2xl font-semibold mb-6">
                            Evaluate - {selectedSubmission.user?.name}
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-1">Marks Obtained</label>
                                <input
                                    type="number"
                                    value={marksObtained}
                                    onChange={(e) => setMarksObtained(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Total Marks</label>
                                <input
                                    type="number"
                                    value={totalMarks}
                                    onChange={(e) => setTotalMarks(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Upload Evaluated PDF</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setCheckedFile(e.target.files?.[0] || null)}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Feedback</label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Write feedback here..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-8">
                            <button
                                onClick={() => { setShowCheckModal(false); resetForm(); }}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCheckSubmission}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Submit Evaluation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Viewer Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[999] p-4">
                    <div className="bg-white w-full max-w-6xl h-[95vh] rounded-xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold">PDF Preview</h3>
                            <button
                                onClick={() => setShowPdfModal(false)}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                        <iframe
                            src={pdfUrl}
                            className="flex-1 w-full"
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckSubmission;