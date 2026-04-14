import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL = "https://www.app.api.dikshantias.com/api";

interface SubjectConfig {
    subjectId: number;
    subjectName?: string;
    price: number;
    discountPrice: number;
    expiryDays: number;
    position: number;
    status: string;
}

interface Batch {
    id: number;
    name: string;
    separatePurchaseSubjectIds: SubjectConfig[];
}

interface AssignedSubject {
    subjectId: number;
    batchId: number;
}

const BatchSubjectAssign = () => {
    const { id: userIdParam } = useParams<{ id: string }>();
    const userId = Number(userIdParam);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [subjects, setSubjects] = useState<SubjectConfig[]>([]); // Available subjects from selected batch
    const [assignedSubjects, setAssignedSubjects] = useState<number[]>([]);

    const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

    const [assigning, setAssigning] = useState(false);
    const [revoking, setRevoking] = useState<number | null>(null);

    // Expiry settings
    const [useCustomExpiry, setUseCustomExpiry] = useState(false);
    const [customExpiryDays, setCustomExpiryDays] = useState(30);

    /* ================= Fetch Data ================= */
    const fetchBatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/batchs`, {
                params: { page: 1, limit: 500 },
            });
            setBatches(res.data.items || []);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const fetchAssignedSubjects = async () => {
        if (!userId) return;
        try {
            const res = await axios.get(`${API_URL}/orders/admin/user/${userId}/subjets`);
            const ids = res.data.items?.map((s: AssignedSubject) => s.subjectId) || [];
            setAssignedSubjects(ids);
        } catch (err) {
            console.error("Failed to fetch assigned subjects", err);
        }
    };

    useEffect(() => {
        fetchBatches();
        fetchAssignedSubjects();
    }, [userId]);

    /* ================= Batch Change ================= */
    const handleBatchChange = (batchId: number) => {
        setSelectedBatch(batchId);
        setSelectedSubjectId(null);
        setUseCustomExpiry(false);
        setCustomExpiryDays(30);

        const batch = batches.find((b) => b.id === batchId);
        if (!batch) {
            setSubjects([]);
            return;
        }

        const paidSubjects = batch.separatePurchaseSubjectIds
            .filter((s) => s.price > 0 && s.status === "active")
            .sort((a, b) => a.position - b.position);

        setSubjects(paidSubjects);
    };

    /* ================= Assign Subject ================= */
    const handleAssign = async () => {
        if (!selectedBatch || !selectedSubjectId) {
            alert("Please select a subject");
            return;
        }

        const subject = subjects.find((s) => s.subjectId === selectedSubjectId);
        if (!subject) return;

        const finalExpiry = useCustomExpiry ? customExpiryDays : subject.expiryDays;

        if (finalExpiry <= 0) {
            alert("Expiry days must be greater than 0");
            return;
        }

        setAssigning(true);

        try {
            await axios.post(`${API_URL}/orders/admin/assign-subject`, {
                userId,
                subjectId: subject.subjectId,
                batchId: selectedBatch,
                accessValidityDays: finalExpiry,
            });

            setAssignedSubjects((prev) => [...prev, subject.subjectId]);
            alert(`✅ Subject assigned successfully with ${finalExpiry} days validity!`);

            // Reset selection
            setSelectedSubjectId(null);
            setUseCustomExpiry(false);
        } catch (err) {
            console.error(err);
            alert("❌ Assignment failed");
        } finally {
            setAssigning(false);
        }
    };

    /* ================= Revoke Subject ================= */
    const handleRevoke = async (subjectId: number) => {
        const reason = prompt("Enter reason for revoking access:") || "Admin revoked access";

        if (!reason.trim()) return;

        setRevoking(subjectId);

        try {
            await axios.post(`${API_URL}/orders/admin/revoke-subject`, {
                userId,
                subjectId,
                reason: reason.trim(),
            });

            setAssignedSubjects((prev) => prev.filter((id) => id !== subjectId));
            alert("Subject access revoked successfully");
        } catch (err) {
            console.error(err);
            alert("❌ Revoke failed");
        } finally {
            setRevoking(null);
        }
    };

    const selectedSubject = subjects.find((s) => s.subjectId === selectedSubjectId);

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Manage Subject Access</h1>
                <p className="text-gray-500 mt-1">User ID: <span className="font-mono font-medium">{userId}</span></p>
            </div>

            {/* Batch Selector */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Batch</label>
                <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedBatch || ""}
                    onChange={(e) => handleBatchChange(Number(e.target.value))}
                >
                    <option value="">Choose a batch...</option>
                    {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                            {batch.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Available Subjects to Assign */}
            {selectedBatch && subjects.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Available Subjects</h2>
                    <div className="grid gap-4">
                        {subjects
                            .filter((subject) => !assignedSubjects.includes(subject.subjectId))
                            .map((subject) => (
                                <div
                                    key={subject.subjectId}
                                    className={`border rounded-2xl p-5 flex items-center justify-between transition-all hover:shadow-md ${selectedSubjectId === subject.subjectId ? "ring-2 ring-indigo-500 bg-indigo-50" : "bg-white"
                                        }`}
                                >
                                    <div>
                                        <div className="font-semibold text-lg">
                                            {subject.subjectName || `Subject ${subject.subjectId}`}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            ₹{subject.discountPrice || subject.price} • Default: {subject.expiryDays} days
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedSubjectId(subject.subjectId)}
                                        className={`px-5 py-2.5 rounded-xl font-medium transition-all ${selectedSubjectId === subject.subjectId
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                            }`}
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}

                        {subjects.filter((s) => !assignedSubjects.includes(s.subjectId)).length === 0 && (
                            <p className="text-gray-500 italic py-4">All subjects from this batch are already assigned.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Expiry Configuration */}
            {selectedSubjectId && selectedSubject && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
                    <h3 className="font-semibold text-lg mb-4">Set Access Validity</h3>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="expiry"
                                checked={!useCustomExpiry}
                                onChange={() => setUseCustomExpiry(false)}
                                className="accent-indigo-600"
                            />
                            <div>
                                <div>Use Subject Default Expiry</div>
                                <div className="text-sm text-gray-600">{selectedSubject.expiryDays} days</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="expiry"
                                checked={useCustomExpiry}
                                onChange={() => setUseCustomExpiry(true)}
                                className="accent-indigo-600"
                            />
                            <div className="flex-1">
                                <div>Set Custom Expiry</div>
                                <div className="flex items-center gap-3 mt-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={customExpiryDays}
                                        onChange={(e) => setCustomExpiryDays(Math.max(1, Number(e.target.value)))}
                                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-gray-600">days</span>
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="mt-6 p-4 bg-white rounded-xl border text-sm">
                        <strong>Final Validity:</strong>{" "}
                        <span className="font-semibold text-indigo-600">
                            {useCustomExpiry ? customExpiryDays : selectedSubject.expiryDays} days
                        </span>
                    </div>
                </div>
            )}

            {/* Assign Button */}
            {selectedSubjectId && (
                <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold text-lg rounded-2xl transition-all flex items-center justify-center gap-2 mb-12"
                >
                    {assigning ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            Assigning...
                        </>
                    ) : (
                        `Assign Subject • ${useCustomExpiry ? customExpiryDays : selectedSubject?.expiryDays} days`
                    )}
                </button>
            )}

            {/* Already Assigned Subjects */}
            {assignedSubjects.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Already Assigned Subjects</h2>
                    <div className="space-y-3">
                        {assignedSubjects.map((subjectId) => {
                            const subject = [...subjects, ...batches.flatMap(b => b.separatePurchaseSubjectIds)]
                                .find(s => s.subjectId === subjectId);

                            return (
                                <div
                                    key={subjectId}
                                    className="flex justify-between items-center bg-green-50 border border-green-200 rounded-2xl p-5"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {subject?.subjectName || `Subject ${subjectId}`}
                                        </div>
                                        <div className="text-xs text-green-700">Access Granted</div>
                                    </div>

                                    <button
                                        onClick={() => handleRevoke(subjectId)}
                                        disabled={revoking === subjectId}
                                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-70"
                                    >
                                        {revoking === subjectId ? "Revoking..." : "Revoke Access"}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {!selectedBatch && (
                <div className="text-center py-12 text-gray-400">
                    Select a batch to view available subjects
                </div>
            )}
        </div>
    );
};

export default BatchSubjectAssign;