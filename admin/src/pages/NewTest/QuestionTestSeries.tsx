import { useState, useEffect, useMemo } from "react";
import { useFetch } from "../../hooks/useFetch";
import api from "../../utils/axiosInstance";
import {
    cx, inputCls, btnPrimary, btnSecondary, btnDanger, btnOutline,
    Field, Card, SectionHeader, PageHeader, Badge, Spinner, EmptyState, Modal,
} from "../../components";
import type { ToastAPI, Test, Question, QuestionForm, BadgeColor } from "../../utils/types";
import toast from "react-hot-toast";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";

import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

import {
    useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const defaultForm: QuestionForm = {
    test_id: "",
    question_text: "",
    subject: "",
    topic: "",
    difficulty: "medium",
    correct_option: "1",
    marks: "2",
    explanation: "",
    source: "",
    video_url: "",
    article_url: "",
    order_index: "",
};

const diffColor: Record<string, BadgeColor> = {
    easy: "green",
    medium: "yellow",
    hard: "red",
};

type Mode = "list" | "create" | "edit";
type QuestionWithOptions = Question & { options?: any[] };

function SortableQuestionItem({
    question,
    index,
    isSelected,
    onSelect,
    onEdit,
    onDelete
}: {
    question: QuestionWithOptions;
    index: number;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEdit: (q: QuestionWithOptions) => void;
    onDelete: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cx(
                "py-5 px-4 bg-white border border-slate-200 rounded-xl mb-3 group",
                isDragging && "shadow-lg"
            )}
        >
            <div className="flex items-start gap-4">
                <div {...attributes} {...listeners} className="mt-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                    ⋮⋮
                </div>

                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(question.id)}
                    className="mt-1.5 h-4 w-4 rounded border-slate-300"
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <p className="text-slate-900 font-medium leading-relaxed pr-4">
                            {question.question_text}
                        </p>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(question)}
                                className="text-blue-600 hover:text-blue-700 text-lg"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => onDelete(question.id)}
                                className="text-red-600 hover:text-red-700 text-lg"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {question.subject && <Badge color="blue">{question.subject}</Badge>}
                        {question.topic && <Badge color="indigo">{question.topic}</Badge>}
                        <Badge color={diffColor[question.difficulty] ?? "gray"}>{question.difficulty}</Badge>
                        <Badge color="amber">{question.marks} marks</Badge>
                    </div>

                    {/* Options Preview */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options?.slice(0, 4).map((opt: any, i: number) => (
                            <div
                                key={i}
                                className={cx(
                                    "p-3 rounded-lg text-sm border",
                                    parseInt(String(question.correct_option)) === opt.option_number
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-50"
                                )}
                            >
                                <span className="font-mono font-bold mr-2">
                                    {String.fromCharCode(65 + i)}.
                                </span>
                                {opt.option_text}
                                {parseInt(String(question.correct_option)) === opt.option_number && (
                                    <span className="ml-2 text-emerald-600 font-medium">✓ Correct</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QuestionsPage() {
    const [mode, setMode] = useState<Mode>("list");
    const [form, setForm] = useState<QuestionForm>(defaultForm);
    const [options, setOptions] = useState<string[]>(["", "", "", ""]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedTest, setSelectedTest] = useState<string>("");
    const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterDifficulty, setFilterDifficulty] = useState("");

    const { data: testsData } = useFetch<Test>("/new/tests/admin/list?type=prelims&limit=100");
    const allTests = testsData?.tests ?? (Array.isArray(testsData) ? testsData : []);

    // Only prelims tests in this page — mains handled via MainsPaperPage
    const tests = allTests

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    // Set default first prelims test
    useEffect(() => {
        if (tests.length > 0 && !selectedTest) {
            const firstId = tests[0].id;
            setSelectedTest(firstId);
            setForm(prev => ({ ...prev, test_id: firstId }));
        }
    }, [tests, selectedTest]);

    // Fetch questions
    const fetchQuestions = async () => {
        if (!selectedTest) return;
        try {
            const r = await api.get(`/new/questions?test_id=${selectedTest}`);
            const raw = r.data?.data?.questions ?? r.data;
            setQuestions(Array.isArray(raw) ? raw : []);
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            setQuestions([]);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [selectedTest]);

    const filteredQuestions = useMemo(() => {
        return questions
            .filter(q => {
                const matchesSearch = !searchTerm ||
                    q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesSubject = !filterSubject || q.subject === filterSubject;
                const matchesDifficulty = !filterDifficulty || q.difficulty === filterDifficulty;
                return matchesSearch && matchesSubject && matchesDifficulty;
            })
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [questions, searchTerm, filterSubject, filterDifficulty]);

    const handleInputChange = <K extends keyof QuestionForm>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            setForm(prev => ({ ...prev, [key]: e.target.value }));
        };

    const handleOptionChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => {
            const newOpts = [...prev];
            newOpts[index] = e.target.value;
            return newOpts;
        });
    };

    const openCreate = () => {
        setForm({ ...defaultForm, test_id: selectedTest });
        setOptions(["", "", "", ""]);
        setEditingId(null);
        setMode("create");
    };

    const openEdit = (q: QuestionWithOptions) => {
        const sortedOpts =
            q.options
                ?.slice()
                .sort((a, b) => a.option_number - b.option_number) || [];

        const cleanOptions = sortedOpts
            .map((opt) => (opt.option_text || "").trim())
            .filter(Boolean);

        setForm({
            test_id: q.test_id || selectedTest,
            question_text: q.question_text || "",
            subject: q.subject || "",
            topic: q.topic || "",
            difficulty: q.difficulty || "medium",
            correct_option: String(q.correct_option || 1),
            marks: String(q.marks || 2),
            explanation: q.explanation || "",
            source: q.source || "",
            video_url: q.video_url || "",
            article_url: q.article_url || "",
            order_index: String(q.order_index || ""),
            options: cleanOptions,
        });

        setOptions(cleanOptions);
        setEditingId(q.id);
        setMode("edit");
    };

    const closeForm = () => {
        setMode("list");
        setForm(defaultForm);
        setOptions(["", "", "", ""]);
        setEditingId(null);
    };

    const submitQuestion = async () => {
        if (!form.test_id || !form.question_text?.trim()) {
            return toast.error("Test and question text are required");
        }

        const cleanOptions = options
            .map((opt) => opt.trim())
            .filter(Boolean);

        if (cleanOptions.length < 2) {
            return toast.error("Minimum 2 options required");
        }

        setLoading(true);

        try {
            const payload = {
                ...form,
                options: cleanOptions,
                correct_option: parseInt(form.correct_option),
                marks: parseFloat(form.marks) || 2,
                order_index:
                    parseInt(form.order_index) || filteredQuestions.length + 1,
            };

            if (mode === "edit" && editingId) {
                await api.put(`/new/questions/${editingId}`, payload);
                toast.success("Question updated successfully!");
            } else {
                await api.post("/new/questions", payload);
                toast.success("Question created successfully!");
            }

            await fetchQuestions();
            closeForm();
        } catch (e: any) {
            toast.error(
                e.response?.data?.message || "Failed to save question"
            );
        } finally {
            setLoading(false);
        }
    };

    const deleteQuestion = async (id: string) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await api.delete(`/new/questions/${id}`);
            toast.success("Question deleted");
            fetchQuestions();
        } catch (e) {
            toast.error("Failed to delete question");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const bulkDelete = async () => {
        if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected questions?`)) return;
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/new/questions/${id}`)));
            toast.success(`${selectedIds.length} questions deleted`);
            setSelectedIds([]);
            fetchQuestions();
        } catch (e) {
            toast.error("Bulk delete failed");
        }
    };

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = filteredQuestions.findIndex(q => q.id === active.id);
        const newIndex = filteredQuestions.findIndex(q => q.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(filteredQuestions, oldIndex, newIndex);

        const updatedQuestions = reordered.map((q, idx) => ({
            ...q,
            order_index: idx + 1,
        }));

        setQuestions(prev =>
            prev.map(q => {
                const updated = updatedQuestions.find(uq => uq.id === q.id);
                return updated || q;
            })
        );

        try {
            await api.post("/new/questions/reorder", {
                test_id: selectedTest,
                order: updatedQuestions.map(q => ({ id: q.id, order_index: q.order_index })),
            });
            toast.success("Question order updated");
        } catch (e) {
            toast.error("Failed to save new order");
            fetchQuestions(); // rollback
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Questions Bank"
                subtitle="Create, edit and reorder MCQ questions for prelims tests"
            />

            {mode === "list" && (
                <Card>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        <SectionHeader title={`Questions in Test (${filteredQuestions.length})`} />

                        <select
                            className={inputCls}
                            value={selectedTest}
                            onChange={(e) => setSelectedTest(e.target.value)}
                        >
                            {tests.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filters */}
                    {selectedTest && (
                        <div className="flex flex-wrap gap-3 mb-6 items-end">
                            <div className="flex-1 min-w-[260px]">
                                <input
                                    type="text"
                                    placeholder="Search by question text..."
                                    className={inputCls}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Field label="Subject" className="w-52">
                                <select
                                    className={inputCls}
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                >
                                    <option value="">All Subjects</option>
                                    {Array.from(new Set(questions.map(q => q.subject).filter(Boolean)))
                                        .map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                </select>
                            </Field>

                            <Field label="Difficulty" className="w-44">
                                <select
                                    className={inputCls}
                                    value={filterDifficulty}
                                    onChange={(e) => setFilterDifficulty(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </Field>

                            {selectedIds.length > 0 && (
                                <button onClick={bulkDelete} className={btnDanger}>
                                    Delete {selectedIds.length} Selected
                                </button>
                            )}

                            <button onClick={openCreate} className={btnPrimary}>
                                + New Question
                            </button>
                        </div>
                    )}

                    {!selectedTest ? (
                        <EmptyState message="Select a test to manage questions" />
                    ) : tests.length === 0 ? (
                        <EmptyState message="No prelims tests found. Mains tests are managed via the Tests → Question Paper section." />
                    ) : filteredQuestions.length === 0 ? (
                        <EmptyState message="No questions found matching filters" />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onDragEnd}
                        >
                            <SortableContext
                                items={filteredQuestions.map(q => q.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {filteredQuestions.map((q, idx) => (
                                        <SortableQuestionItem
                                            key={q.id}
                                            question={q}
                                            index={idx}
                                            isSelected={selectedIds.includes(q.id)}
                                            onSelect={toggleSelect}
                                            onEdit={openEdit}
                                            onDelete={deleteQuestion}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </Card>
            )}

            {/* Create / Edit Modal */}
            {(mode === "create" || mode === "edit") && (
                <Modal
                    isOpen={true}
                    onClose={closeForm}
                    title={mode === "create" ? "Create New Question" : "Edit Question"}
                    size="xl"
                >
                    <div className="space-y-8 py-2">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Subject">
                                <input
                                    className={inputCls}
                                    value={form.subject}
                                    onChange={handleInputChange("subject")}
                                    placeholder="Polity"
                                />
                            </Field>

                            <Field label="Topic">
                                <input
                                    className={inputCls}
                                    value={form.topic}
                                    onChange={handleInputChange("topic")}
                                    placeholder="Fundamental Rights"
                                />
                            </Field>

                            <Field label="Difficulty">
                                <select
                                    className={inputCls}
                                    value={form.difficulty}
                                    onChange={handleInputChange("difficulty")}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </Field>

                            <Field label="Marks">
                                <input
                                    type="number"
                                    className={inputCls}
                                    value={form.marks}
                                    onChange={handleInputChange("marks")}
                                />
                            </Field>
                        </div>

                        <Field label="Question Text *">
                            <textarea
                                className={cx(inputCls, "resize-none")}
                                rows={5}
                                value={form.question_text}
                                onChange={handleInputChange("question_text")}
                                placeholder="Enter the full question..."
                            />
                        </Field>

                        {/* Options */}
                        <div>
                            <p className="mb-3 text-sm font-semibold text-slate-500">Options (A, B, C, D)</p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="font-bold text-slate-400 w-6">
                                            {String.fromCharCode(65 + i)}.
                                        </span>
                                        <input
                                            className={inputCls}
                                            value={opt}
                                            onChange={handleOptionChange(i)}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 w-56">
                                <Field label="Correct Option">
                                    <select
                                        className={inputCls}
                                        value={form.correct_option}
                                        onChange={handleInputChange("correct_option")}
                                    >
                                        {[1, 2, 3, 4].map(n => (
                                            <option key={n} value={n}>
                                                Option {String.fromCharCode(64 + n)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </div>

                        <Field label="Explanation">
                            <textarea
                                className={cx(inputCls, "resize-none")}
                                rows={4}
                                value={form.explanation}
                                onChange={handleInputChange("explanation")}
                                placeholder="Detailed explanation for the correct answer..."
                            />
                        </Field>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Source">
                                <input
                                    className={inputCls}
                                    value={form.source}
                                    onChange={handleInputChange("source")}
                                    placeholder="Laxmikanth Chapter 1"
                                />
                            </Field>
                            <Field label="Video URL">
                                <input
                                    className={inputCls}
                                    value={form.video_url}
                                    onChange={handleInputChange("video_url")}
                                />
                            </Field>
                            <Field label="Article URL">
                                <input
                                    className={inputCls}
                                    value={form.article_url}
                                    onChange={handleInputChange("article_url")}
                                />
                            </Field>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button onClick={closeForm} className={btnSecondary}>
                                Cancel
                            </button>
                            <button
                                onClick={submitQuestion}
                                disabled={loading}
                                className={btnPrimary}
                            >
                                {loading ? "Saving..." : mode === "create" ? "Create Question" : "Update Question"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}