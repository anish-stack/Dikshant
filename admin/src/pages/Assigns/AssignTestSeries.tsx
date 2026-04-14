import axios, { isAxiosError } from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const API_URL = "https://www.app.api.dikshantias.com/api";

interface TestSeries {
    id: number;
    title: string;
    price?: number;
}

const AssignTestSeries = () => {

    const { id: userId } = useParams();
    const navigate = useNavigate();

    const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
    const [assignedIds, setAssignedIds] = useState<number[]>([]);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState<number | null>(null);
    const [revoking, setRevoking] = useState<number | null>(null);

    const [search, setSearch] = useState("");
    const [validityDays, setValidityDays] = useState<{ [key: number]: number }>({});

    /* ================= Fetch Assigned ================= */

    const fetchAssigned = async () => {
        try {

            const res = await axios.get(
                `${API_URL}/orders/admin/user/${userId}/testseries`
            );

            const ids = res.data.items.map((i: any) => i.testSeriesId);

            setAssignedIds(ids);

        } catch (err) {
            console.error("Failed to fetch assigned test series");
        }
    };

    /* ================= Fetch Test Series ================= */

    const fetchTestSeries = useCallback(async () => {
        try {

            setLoading(true);

            const token = localStorage.getItem("accessToken");

            if (!token) {
                toast.error("Login required");
                navigate("/login");
                return;
            }

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                ...(search ? { search } : {})
            });
            const response = await axios.get(
                `${API_URL}/testseriess?${params.toString()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {

                setTestSeries(response.data.data);
                setTotalPages(response.data.pagination.totalPages || 1);

            } else {
                toast.error("Failed to fetch data");
            }

        } catch (err) {

            if (isAxiosError(err)) {
                toast.error(err.response?.data?.message || "Error");
            } else {
                toast.error("Network error");
            }

        } finally {
            setLoading(false);
        }

    }, [page, search, navigate]);

    /* ================= Assign ================= */

    const handleAssign = async (testSeriesId: number) => {

        const days = validityDays[testSeriesId] || 365;

        try {

            setAssigning(testSeriesId);

            await axios.post(`${API_URL}/orders/admin/assign-testseries`, {
                userId,
                testSeriesId,
                accessValidityDays: days
            });

            toast.success("Test series assigned");

            setAssignedIds(prev => [...prev, testSeriesId]);

        } catch (err) {

            toast.error("Assign failed");

        } finally {
            setAssigning(null);
        }

    };

    /* ================= Revoke ================= */

    const handleRevoke = async (testSeriesId: number) => {

        const reason = prompt("Reason for revoke?") || "Admin revoke";

        try {

            setRevoking(testSeriesId);

            await axios.post(`${API_URL}/orders/admin/revoke-testseries`, {
                userId,
                testSeriesId,
                reason
            });

            toast.success("Access revoked");

            setAssignedIds(prev =>
                prev.filter(id => id !== testSeriesId)
            );

        } catch (err) {

            toast.error("Revoke failed");

        } finally {
            setRevoking(null);
        }

    };

    /* ================= Effects ================= */

    useEffect(() => {
        fetchTestSeries();
        fetchAssigned();
    }, [fetchTestSeries]);

    /* ================= Render ================= */

    return (
        <div className="p-6 space-y-6">

            <h2 className="text-xl font-semibold">Assign Test Series</h2>

            {/* Search */}

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Search test series..."
                    className="border p-2 rounded w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <button
                    className="bg-indigo-600 text-white px-4 py-2 rounded"
                    onClick={() => setPage(1)}
                >
                    Search
                </button>
            </div>

            {/* List */}

            {loading ? (
                <div>Loading...</div>
            ) : (

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {testSeries.map(ts => {

                        const assigned = assignedIds.includes(ts.id);

                        return (
                            <div
                                key={ts.id}
                                className={`border rounded p-4 space-y-3
                ${assigned ? "bg-green-50 border-green-300" : ""}`}
                            >

                                <div className="flex justify-between">

                                    <h3 className="font-medium">{ts.title}</h3>

                                    {assigned && (
                                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                            Assigned
                                        </span>
                                    )}

                                </div>

                                {!assigned && (
                                    <input
                                        type="number"
                                        placeholder="Validity Days"
                                        className="border p-2 rounded w-full"
                                        value={validityDays[ts.id] || ""}
                                        onChange={(e) =>
                                            setValidityDays({
                                                ...validityDays,
                                                [ts.id]: Number(e.target.value)
                                            })
                                        }
                                    />
                                )}

                                {!assigned ? (
                                    <button
                                        disabled={assigning === ts.id}
                                        onClick={() => handleAssign(ts.id)}
                                        className="bg-green-600 text-white w-full py-2 rounded"
                                    >
                                        {assigning === ts.id ? "Assigning..." : "Assign"}
                                    </button>
                                ) : (
                                    <button
                                        disabled={revoking === ts.id}
                                        onClick={() => handleRevoke(ts.id)}
                                        className="bg-red-600 text-white w-full py-2 rounded"
                                    >
                                        {revoking === ts.id ? "Revoking..." : "Revoke"}
                                    </button>
                                )}

                            </div>
                        );

                    })}

                </div>

            )}

            {/* Pagination */}

            <div className="flex justify-center gap-3">

                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="border px-3 py-1 rounded"
                >
                    Prev
                </button>

                <span>
                    Page {page} / {totalPages}
                </span>

                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="border px-3 py-1 rounded"
                >
                    Next
                </button>

            </div>

        </div>
    );

};

export default AssignTestSeries;