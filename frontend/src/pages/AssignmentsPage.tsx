import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assignmentsAPI } from '../services/api';
import { 
    BookOpen, Plus, Clock, FileText, CheckCircle, 
    AlertCircle, ChevronRight, Upload, Star,
    Layout, Filter, Search, Award, ExternalLink
} from 'lucide-react';

const formatDate = (date: string | Date, formatStr?: string) => {
    const d = new Date(date);
    if (formatStr === 'PPP p') return d.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    if (formatStr === 'PPP') return d.toLocaleDateString(undefined, { dateStyle: 'long' });
    if (formatStr === 'MMM d, h:mm a') return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    return d.toLocaleString();
};

const formatISO = (date: Date) => {
    return date.toISOString().slice(0, 16);
};

interface RubricCriterion {
    name: string;
    points: number;
    description: string;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_date: string;
    total_points: number;
    rubric: RubricCriterion[];
    created_at: string;
}

interface Submission {
    id: string;
    assignment_id: string;
    student_id: string;
    file_url: string;
    file_name: string;
    submitted_at: string;
    status: string;
    grade?: number;
    feedback_text?: string;
    rubric_feedback?: Record<string, number>;
}

export default function AssignmentsPage() {
    const { user } = useAuth();
    const isFaculty = user?.role === 'faculty' || user?.role === 'admin';
    
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [gradeData, setGradeData] = useState({
        grade: 0,
        feedback_text: '',
        rubric_feedback: {} as Record<string, number>
    });
    const [searchQuery, setSearchQuery] = useState('');
    
    // Create form state
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        due_date: formatISO(new Date(Date.now() + 7 * 86400000)),
        total_points: 100,
        rubric: [] as RubricCriterion[]
    });

    const [submissionFile, setSubmissionFile] = useState<File | null>(null);

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const res = await assignmentsAPI.list();
            setAssignments(res.data);
        } catch (err) {
            console.error("Failed to load assignments", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAssignment = async (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setMySubmission(null);
        setSubmissions([]);
        
        if (isFaculty) {
            try {
                const res = await assignmentsAPI.getSubmissions(assignment.id);
                setSubmissions(res.data);
            } catch (err) {
                console.error("Error loading submissions", err);
            }
        } else {
            try {
                const res = await assignmentsAPI.getMySubmission(assignment.id);
                setMySubmission(res.data);
            } catch (err) {
                console.error("Error loading my submission", err);
            }
        }
    };

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await assignmentsAPI.create(newAssignment);
            setShowCreateModal(false);
            loadAssignments();
            setNewAssignment({
                title: '',
                description: '',
                due_date: formatISO(new Date(Date.now() + 7 * 86400000)),
                total_points: 100,
                rubric: []
            });
        } catch (err) {
            console.error("Error creating assignment", err);
            alert("Failed to create assignment");
        }
    };

    const handleSubmitWork = async () => {
        if (!selectedAssignment || !submissionFile) return;
        try {
            // Convert file to base64 data URL or use file name as URL placeholder
            const fileName = submissionFile.name;
            // For now we use a data URL approach with the file name stored
            await assignmentsAPI.submit(selectedAssignment.id, {
                file_url: `uploaded://${fileName}`,
                file_name: fileName
            });
            handleSelectAssignment(selectedAssignment);
            setSubmissionFile(null);
        } catch (err) {
            console.error("Error submitting", err);
            alert("Failed to submit");
        }
    };

    const handleGradeSubmission = async () => {
        if (!gradingSubmission) return;
        try {
            await assignmentsAPI.grade(gradingSubmission.id, gradeData);
            setGradingSubmission(null);
            if (selectedAssignment) handleSelectAssignment(selectedAssignment);
            alert("Graded successfully!");
        } catch (err) {
            console.error("Error grading", err);
            alert("Failed to grade");
        }
    };

    const openGradingModal = (s: Submission) => {
        setGradingSubmission(s);
        setGradeData({
            grade: s.grade || 0,
            feedback_text: s.feedback_text || '',
            rubric_feedback: s.rubric_feedback || {}
        });
    };

    const addRubricItem = () => {
        setNewAssignment(prev => ({
            ...prev,
            rubric: [...prev.rubric, { name: '', points: 0, description: '' }]
        }));
    };

    if (loading) return <div className="page-container">Loading assignments...</div>;

    return (
        <div className="page-container animate-fade-in">
            <div className="flex-between mb-8">
                <div>
                    <h1 className="flex-center gap-3">
                        <BookOpen size={32} color="var(--primary-color)" />
                        Assignments Portal
                    </h1>
                    <p className="text-secondary mt-1">Manage coursework, track deadlines, and view feedback.</p>
                </div>
                {isFaculty && (
                    <button className="btn btn-primary flex-center gap-2" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} />
                        New Assignment
                    </button>
                )}
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
                {/* Left Column: List */}
                <div className="flex flex-col gap-4">
                    <div className="card-minimal flex-center gap-3 mb-2">
                        <Search size={18} className="text-secondary" />
                        <input 
                            className="input-ghost" 
                            placeholder="Search assignments..." 
                            style={{ width: '100%' }} 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {assignments.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <div className="text-center p-8 text-secondary">
                            No assignments posted yet.
                        </div>
                    ) : (
                        assignments
                        .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(a => (
                            <div 
                                key={a.id} 
                                className={`card assignment-card clickable ${selectedAssignment?.id === a.id ? 'active' : ''}`}
                                onClick={() => handleSelectAssignment(a)}
                            >
                                <div className="flex-between mb-2">
                                    <span className="badge-primary" style={{ fontSize: '0.7rem' }}>Coursework</span>
                                    <span className="text-secondary flex-center gap-1" style={{ fontSize: '0.75rem' }}>
                                        <Clock size={12} />
                                        {formatDate(new Date(a.due_date), 'MMM d, h:mm a')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold mb-1">{a.title}</h3>
                                <p className="text-sm text-secondary line-clamp-2">{a.description}</p>
                                
                                {selectedAssignment?.id === a.id && (
                                    <div className="mt-3 flex-center justify-end">
                                        <ChevronRight size={18} className="text-primary" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Detail */}
                <div className="flex flex-col gap-6">
                    {selectedAssignment ? (
                        <div className="card-glass p-8 animate-slide-up">
                            <div className="flex-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">{selectedAssignment.title}</h2>
                                    <div className="flex gap-4 text-secondary text-sm">
                                        <span className="flex-center gap-1"><Clock size={14} /> Due {formatDate(new Date(selectedAssignment.due_date), 'PPP p')}</span>
                                        <span className="flex-center gap-1"><Award size={14} /> {selectedAssignment.total_points} Points</span>
                                    </div>
                                </div>
                                {isFaculty ? (
                                    <div className="badge-secondary">{submissions.length} Submissions</div>
                                ) : (
                                    mySubmission && (
                                        <div className={`badge-${mySubmission.status === 'graded' ? 'success' : 'primary'} flex-center gap-2`}>
                                            {mySubmission.status === 'graded' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                            {mySubmission.status.toUpperCase()}
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="mb-8">
                                <h4 className="font-bold mb-2">Instruction</h4>
                                <div className="text-secondary leading-relaxed bg-secondary-alpha p-4 rounded-lg">
                                    {selectedAssignment.description}
                                </div>
                            </div>

                            {selectedAssignment.rubric?.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="font-bold mb-3 flex-center gap-2">
                                        <Layout size={18} /> Grading Rubric
                                    </h4>
                                    <div className="grid gap-2">
                                        {selectedAssignment.rubric.map((r, i) => (
                                            <div key={i} className="flex-between p-3 border-b border-color">
                                                <div>
                                                    <div className="font-semibold text-sm">{r.name}</div>
                                                    <div className="text-xs text-secondary">{r.description}</div>
                                                </div>
                                                <div className="font-bold text-primary">{r.points} pts</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions based on role */}
                            {!isFaculty ? (
                                <div className="border-t border-color pt-8">
                                    {mySubmission?.status === 'graded' ? (
                                        <div className="animate-fade-in">
                                            <div className="flex-between mb-4">
                                                <h4 className="font-bold text-xl">Feedback & Grade</h4>
                                                <div className="text-3xl font-black text-primary">{mySubmission.grade}/{selectedAssignment.total_points}</div>
                                            </div>
                                            <div className="card-minimal bg-primary-alpha p-4 mb-4">
                                                <div className="flex-center gap-2 mb-2 font-bold text-primary">
                                                    <Star size={18} /> Faculty Feedback
                                                </div>
                                                <p className="text-secondary">{mySubmission.feedback_text || "No feedback text provided."}</p>
                                            </div>
                                            {mySubmission.rubric_feedback && (
                                                <div className="grid gap-2">
                                                     {selectedAssignment.rubric.map((r, i) => (
                                                        <div key={i} className="flex-between p-2 text-sm bg-secondary-alpha rounded">
                                                            <span>{r.name}</span>
                                                            <span className="font-bold">{mySubmission.rubric_feedback?.[r.name] || 0} / {r.points}</span>
                                                        </div>
                                                     ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <h4 className="font-bold">Your Submission</h4>
                                            {mySubmission ? (
                                                <div className="card-minimal flex-between p-4 bg-secondary-alpha">
                                                    <div className="flex-center gap-3">
                                                        <FileText className="text-primary" />
                                                        <div>
                                                            <div className="font-semibold">{mySubmission.file_name}</div>
                                                            <div className="text-xs text-secondary">Submitted {formatDate(new Date(mySubmission.submitted_at), 'PPP')}</div>
                                                        </div>
                                                    </div>
                                                    <button className="btn-ghost text-xs" onClick={() => setMySubmission(null)}>Resubmit</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-4">
                                                    <label 
                                                        htmlFor="assignment-file-upload"
                                                        className="upload-zone border-dashed border-2 border-color p-8 rounded-xl flex-center flex-col gap-3"
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <Upload size={32} className="text-secondary" />
                                                        <div className="text-center">
                                                            <div className="font-semibold">
                                                                {submissionFile ? (submissionFile as any).name : 'Click to Upload Your Work'}
                                                            </div>
                                                            <div className="text-xs text-secondary">
                                                                {submissionFile ? '✓ File selected — ready to submit' : 'PDF, DOCX, ZIP, PNG up to 10MB'}
                                                            </div>
                                                        </div>
                                                        <input 
                                                            id="assignment-file-upload"
                                                            type="file" 
                                                            accept=".pdf,.doc,.docx,.zip,.png,.jpg,.txt"
                                                            style={{ display: 'none' }}
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file) setSubmissionFile(file as any);
                                                            }}
                                                        />
                                                    </label>
                                                    <button 
                                                        className="btn btn-primary w-full flex-center gap-2" 
                                                        disabled={!submissionFile}
                                                        onClick={handleSubmitWork}
                                                    >
                                                        <Upload size={16} />
                                                        Upload & Submit Assignment
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="border-t border-color pt-8">
                                    <h4 className="font-bold mb-4">Student Submissions ({submissions.length})</h4>
                                    {submissions.length === 0 ? (
                                        <div className="text-center p-8 text-tertiary">No student has submitted yet.</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {submissions.map(s => (
                                                <div key={s.id} className="card-minimal flex-between p-4 hover-shadow">
                                                    <div className="flex-center gap-3">
                                                        <div className="avatar-sm">?</div>
                                                        <div>
                                                            <div className="font-bold">Student {s.student_id.substring(0, 5)}</div>
                                                            <div className="text-xs text-secondary">{formatDate(new Date(s.submitted_at), 'PPP')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-center gap-4">
                                                        <span className={`text-xs px-2 py-1 rounded ${s.status === 'graded' ? 'bg-success-alpha text-success' : 'bg-primary-alpha text-primary'}`}>
                                                            {s.status}
                                                        </span>
                                                         <button 
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openGradingModal(s)}
                                                        >
                                                            {s.status === 'graded' ? 'Update Grade' : 'Review & Grade'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-center flex-col gap-4 text-center h-full opacity-50">
                            <BookOpen size={64} className="mb-4" />
                            <h3>Select an assignment to view details</h3>
                            <p className="max-w-xs">Assignments will appear here once you select them from the sidebar.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Assignment Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content card max-w-2xl w-full">
                        <div className="flex-between mb-6">
                            <h2 className="text-xl font-bold">Create New Assignment</h2>
                            <button className="btn-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="grid gap-4">
                            <div className="grid gap-1">
                                <label className="text-sm font-semibold">Assignment Title</label>
                                <input 
                                    className="input" 
                                    required 
                                    placeholder="Enter title..."
                                    value={newAssignment.title}
                                    onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                                />
                            </div>
                            <div className="grid gap-1">
                                <label className="text-sm font-semibold">Description / Instructions</label>
                                <textarea 
                                    className="input" 
                                    rows={4} 
                                    placeholder="Provide details..."
                                    value={newAssignment.description}
                                    onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                                />
                            </div>
                            <div className="grid-2 gap-4">
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold">Due Date</label>
                                    <input 
                                        type="datetime-local" 
                                        className="input" 
                                        required
                                        value={newAssignment.due_date}
                                        onChange={e => setNewAssignment({...newAssignment, due_date: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold">Total Points</label>
                                    <input 
                                        type="number" 
                                        className="input" 
                                        value={newAssignment.total_points}
                                        onChange={e => setNewAssignment({...newAssignment, total_points: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex-between mb-2">
                                    <label className="text-sm font-semibold">Rubric Selection</label>
                                    <button type="button" className="btn btn-ghost btn-sm text-primary" onClick={addRubricItem}>
                                        <Plus size={14} /> Add Criterion
                                    </button>
                                </div>
                                <div className="grid gap-2">
                                    {newAssignment.rubric.map((r, i) => (
                                        <div key={i} className="flex gap-2 items-start border p-2 rounded">
                                            <input 
                                                className="input-ghost text-sm font-bold" 
                                                style={{ width: '40%' }} 
                                                placeholder="Name" 
                                                value={r.name}
                                                onChange={e => {
                                                    const rub = [...newAssignment.rubric];
                                                    rub[i].name = e.target.value;
                                                    setNewAssignment({...newAssignment, rubric: rub});
                                                }}
                                            />
                                            <input 
                                                className="input-ghost text-sm" 
                                                style={{ width: '40%' }} 
                                                placeholder="Description" 
                                                value={r.description}
                                                onChange={e => {
                                                    const rub = [...newAssignment.rubric];
                                                    rub[i].description = e.target.value;
                                                    setNewAssignment({...newAssignment, rubric: rub});
                                                }}
                                            />
                                            <input 
                                                type="number" 
                                                className="input-ghost text-sm font-bold w-12" 
                                                placeholder="Pts" 
                                                value={r.points}
                                                onChange={e => {
                                                    const rub = [...newAssignment.rubric];
                                                    rub[i].points = parseInt(e.target.value);
                                                    setNewAssignment({...newAssignment, rubric: rub});
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Publish Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
