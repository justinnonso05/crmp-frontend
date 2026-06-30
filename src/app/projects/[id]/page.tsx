'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getUser, getToken } from '@/lib/api';
import { PROJECTS, TASKS, DOCUMENTS, SURVEYS, OUTPUTS, UPLOAD, PROPOSAL, APPLICATIONS } from '@/lib/endpoints';
import { Trash2, Lock, Globe } from 'lucide-react';
import '../../../project-mobile.css';
import { getSocket } from '@/lib/socket';
import UserSearchInput from '@/components/dashboard/UserSearchInput';

/* ─────────────────────────── Types ─────────────────────────────── */
interface UserMeta { id: string; firstName: string; lastName: string; email: string; }
interface Member   { userId: string; role: string; joinedAt: string; user: UserMeta; }
interface Task {
  id: string; title: string; dueDate: string;
  isCompleted: boolean; assignedUserId: string | null;
  assignedByUserId?: string | null;
  assignee?: UserMeta | null;
  assigner?: UserMeta | null;
}
interface Document { id: string; title: string; updatedAt: string; lastModifiedBy: string; }
interface Survey   { id: string; title: string; isActive: boolean; createdAt: string; }
interface Output   { id: string; outputType: string; citation: string; fileUrl?: string; createdAt: string; }
interface Project {
  id: string; title: string; description: string; researchTopic: string;
  status: string; createdAt: string;
  members: Member[]; tasks: Task[];
  documents?: Document[];
  surveys?: Survey[];
  outputs?: Output[];
  proposal?: { id: string; content: string; status: string; fileUrl: string; updatedAt: string };
}

interface Application {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; faculty?: string; university?: string };
}

type Tab = 'proposal' | 'tasks' | 'documents' | 'surveys' | 'outputs' | 'members' | 'settings';

const ROLE_LABELS: Record<string, string> = {
  PI: 'Principal Investigator', CO_INVESTIGATOR: 'Co-Investigator',
  ASSISTANT: 'Research Assistant', REVIEWER: 'Reviewer',
};

function StageGuide({ 
  project, canEditStatus, onAdvanceStatus, myRole,
  onBuildSurvey, onDocumentQualitative, onRequestConfirm, statusUpdating,
  onWriteReport, onUploadReport
}: { 
  project: Project, canEditStatus: boolean, onAdvanceStatus: (s: string) => void, myRole: string,
  onBuildSurvey?: () => void, onDocumentQualitative?: () => void, onRequestConfirm?: (msg: string, onConfirm: () => void) => void, statusUpdating?: boolean,
  onWriteReport?: () => void, onUploadReport?: () => void
}) {
  const [dataColChoice, setDataColChoice] = useState<'SURVEY' | 'EXTERNAL' | null>(null);
  const [reportChoice, setReportChoice] = useState<'DOCUMENT' | 'UPLOAD' | null>(null);

  if (!project) return null;

  const guides: Record<string, { title: string, desc: string, action?: string, nextStage?: string }> = {
    DRAFT: {
      title: 'Drafting Proposal',
      desc: 'Use the Proposal tab to draft your research intent. A good proposal should include: a clear Title, Background & Problem Statement, Aim & Objectives, a brief Methodology with a model diagram, tools/software to be used, assumptions (if any), justification, and a list of References. Once complete, a well-written proposal becomes the foundation of Chapter One of your final project write-up.'
    },
    PROPOSAL_SUBMITTED: {
      title: 'Proposal Submitted — Awaiting Review',
      desc: 'Your proposal is currently under review by the assigned Reviewer. You cannot edit the proposal while it is under review. The Reviewer will either Approve it or request a Revision.',
    },
    PROPOSAL_APPROVED: {
      title: 'Proposal Approved — Begin Literature Review',
      desc: 'Your proposal has been approved. Click "Begin Literature Review" to open a dedicated collaborative document for your Chapter Two. Your literature review should cover: (2.1) Conceptual Framework, (2.2) Theoretical Framework, (2.3) Empirical Studies, and (2.4) Appraisal of Reviewed Literature — including a summary table of related works with authors, methodology, results, strengths, and research gaps.',
      action: 'Begin Literature Review', nextStage: 'LITERATURE_REVIEW'
    },
    LITERATURE_REVIEW: {
      title: 'Literature Review in Progress',
      desc: 'Your review should be based on recent works (last 3 years preferred). Discuss existing solutions, their drawbacks, and the gap your project fills. Paraphrase — do not copy verbatim. Give due credit to all cited authors. Use the Summary Table at the end of the chapter listing: Author(s) & Year · Title · Methodology · Results · Strengths · Research Gap.',
      action: 'Finish Literature Review', nextStage: 'DATA_COLLECTION'
    },
    DATA_COLLECTION: {
      title: 'Data Collection Phase',
      desc: 'Gather your research data using either inbuilt surveys (Quantitative) or external interviews/observations (Qualitative). Ensure your sampling technique, instrument, and method of analysis are documented in your project write-up.'
    },
    DATA_ANALYSIS: {
      title: 'Data Analysis',
      desc: 'Analyse your collected data using appropriate techniques for your domain. For AI/ML studies: consider AUC-ROC, Confusion Matrix, Precision-Recall, F1-Score, or BLEU. For Software/HCI research: consider SUS (System Usability Scale), TAM (Technology Acceptance Model), or UTAUT. For social/survey research: use SPSS, descriptive statistics, regression, or thematic analysis. Create a dedicated document to record your analysis notes and findings.',
      action: 'Finish Data Analysis', nextStage: 'REPORT_WRITING'
    },
    REPORT_WRITING: {
      title: 'Report Writing',
      desc: 'Draft the final manuscript. The standard format is: Title Page · Approval Page · Dedication · Acknowledgement · Table of Contents · List of Tables/Figures · Abstract · Chapters 1–5 (Intro, Literature Review, Methodology, Results & Discussion, Conclusion & Recommendations) · References · Appendices.',
      action: 'Submit Final Report', nextStage: 'FINAL_SUBMISSION'
    },
    FINAL_SUBMISSION: {
      title: 'Final Submission — Awaiting Reviewer Approval',
      desc: 'Your final report has been submitted. The Reviewer must approve it before the project advances to the Certification stage. Please ensure your document is complete, properly formatted, and all references are cited.',
      action: 'Approve Final Report', nextStage: 'CERTIFICATION'
    },
    CERTIFICATION: {
      title: 'Certification',
      desc: 'The project is under final review for academic certification. The Reviewer will certify the project upon confirming all requirements are met.',
      action: 'Certify Project', nextStage: 'COMPLETED'
    },
    COMPLETED: {
      title: 'Project Completed 🎉',
      desc: 'This project has been fully certified and archived. Congratulations to the entire research team!'
    }
  };

  const guide = guides[project.status];
  if (!guide) return null;

  return (
    <div className="ws-card ws-card--plain" style={{ marginBottom: '1.75rem', flexDirection: 'row', alignItems: 'flex-start', gap: '1rem' }}>
      {/* Teal icon dot */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2A7C75', marginTop: '0.35rem', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A18', marginBottom: '0.35rem' }}>{guide.title}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(26,26,24,0.65)', lineHeight: 1.6, marginBottom: guide.action || project.status === 'DATA_COLLECTION' ? '1rem' : 0 }}>{guide.desc}</p>

        {/* DATA_COLLECTION: two-choice card */}
        {project.status === 'DATA_COLLECTION' && myRole !== 'REVIEWER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(['SURVEY', 'EXTERNAL'] as const).map(choice => (
                <button
                  key={choice}
                  onClick={() => setDataColChoice(choice)}
                  style={{
                    flex: '1 1 200px',
                    padding: '0.875rem 1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${dataColChoice === choice ? '#2A7C75' : 'rgba(26,26,24,0.15)'}`,
                    background: dataColChoice === choice ? 'rgba(42,124,117,0.08)' : 'rgba(255,255,255,0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1A1A18', marginBottom: '0.2rem' }}>
                    {choice === 'SURVEY' ? 'Quantitative (Inbuilt Survey)' : 'Qualitative (External / Interviews)'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(26,26,24,0.55)' }}>
                    {choice === 'SURVEY'
                      ? 'Use the Surveys tab to build and distribute forms for numerical data.'
                      : 'Conduct interviews, focus groups, or field observations outside the platform.'}
                  </p>
                </button>
              ))}
            </div>
            {dataColChoice && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {dataColChoice === 'SURVEY' && onBuildSurvey && (
                  <button onClick={onBuildSurvey} className="dash-btn-primary">
                    + Build Survey
                  </button>
                )}
                {dataColChoice === 'EXTERNAL' && onDocumentQualitative && (
                  <button onClick={onDocumentQualitative} className="dash-btn-primary">
                    + Document Qualitative Data
                  </button>
                )}
                {onRequestConfirm && (
                  <button
                    disabled={statusUpdating}
                    style={{ opacity: statusUpdating ? 0.7 : 1, background: '#1A1A18', color: '#F2EDE4', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: statusUpdating ? 'not-allowed' : 'pointer' }}
                    onClick={() => onRequestConfirm('Are you sure you want to mark Data Collection as complete? You should ensure all responses and qualitative data have been gathered.', () => onAdvanceStatus('DATA_ANALYSIS'))}
                  >
                    {statusUpdating ? 'Updating...' : 'Mark Data Collection Complete'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* REPORT_WRITING: two-choice card */}
        {project.status === 'REPORT_WRITING' && myRole !== 'REVIEWER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(['DOCUMENT', 'UPLOAD'] as const).map(choice => (
                <button
                  key={choice}
                  onClick={() => setReportChoice(choice)}
                  style={{
                    flex: '1 1 200px',
                    padding: '0.875rem 1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${reportChoice === choice ? '#2A7C75' : 'rgba(26,26,24,0.15)'}`,
                    background: reportChoice === choice ? 'rgba(42,124,117,0.08)' : 'rgba(255,255,255,0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1A1A18', marginBottom: '0.2rem' }}>
                    {choice === 'DOCUMENT' ? 'Write Collaboratively' : 'Upload Finished Report'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(26,26,24,0.55)' }}>
                    {choice === 'DOCUMENT'
                      ? 'Open the real-time editor to draft the report with your team.'
                      : 'Upload a completed PDF or Word document into Research Outputs.'}
                  </p>
                </button>
              ))}
            </div>
            {reportChoice && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {reportChoice === 'DOCUMENT' && onWriteReport && (
                  <button onClick={onWriteReport} className="dash-btn-primary">
                    + Write Collaboratively
                  </button>
                )}
                {reportChoice === 'UPLOAD' && onUploadReport && (
                  <button onClick={onUploadReport} className="dash-btn-primary">
                    + Upload Final Report
                  </button>
                )}
                {onRequestConfirm && (
                  <button
                    disabled={statusUpdating}
                    style={{ opacity: statusUpdating ? 0.7 : 1, background: '#1A1A18', color: '#F2EDE4', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: statusUpdating ? 'not-allowed' : 'pointer' }}
                    onClick={() => onRequestConfirm('Are you sure you want to submit the final report? Make sure your team has finished drafting or uploading it.', () => onAdvanceStatus('FINAL_SUBMISSION'))}
                  >
                    {statusUpdating ? 'Updating...' : 'Submit Final Report'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {project.status !== 'DATA_COLLECTION' && project.status !== 'REPORT_WRITING' && guide.action && guide.nextStage && (
          // FINAL_SUBMISSION: only Reviewer can advance to CERTIFICATION; COMPLETED: Reviewer and PI can certify; all others: non-Reviewers advance
          (guide.nextStage === 'CERTIFICATION' ? myRole === 'REVIEWER' :
           guide.nextStage === 'COMPLETED' ? (myRole === 'REVIEWER' || myRole === 'PI') :
           myRole !== 'REVIEWER') && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                disabled={statusUpdating}
                style={{ opacity: statusUpdating ? 0.7 : 1, background: '#1A1A18', color: '#F2EDE4', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: statusUpdating ? 'not-allowed' : 'pointer' }}
                onClick={() => onAdvanceStatus(guide.nextStage!)}
              >
                {statusUpdating ? 'Updating...' : `${guide.action} →`}
              </button>
              
              {/* Return for Revision button for Reviewer at Final Submission stage */}
              {project.status === 'FINAL_SUBMISSION' && myRole === 'REVIEWER' && (
                <button
                  disabled={statusUpdating}
                  className="dash-btn-ghost"
                  style={{ opacity: statusUpdating ? 0.7 : 1, padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: statusUpdating ? 'not-allowed' : 'pointer', color: '#d9534f' }}
                  onClick={() => onAdvanceStatus('REPORT_WRITING')}
                >
                  Return for Revision
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}


const OUTPUT_LABELS: Record<string, string> = {
  JOURNAL: 'Journal', CONFERENCE: 'Conference', REPORT: 'Report',
};

/* ─────────────────────────── Page ──────────────────────────────── */
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [currentUser, setCurrentUser] = useState<UserMeta | null>(null);
  const [project, setProject]         = useState<Project | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState<Tab>('proposal');

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const savedTab = localStorage.getItem(`crmp-tab-${id}`);
      if (savedTab) {
        setTab(savedTab as Tab);
      }
    }
  }, [id]);

  const handleSetTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem(`crmp-tab-${id}`, t);
  };

  /* ── per-tab data ── */
  const [proposalMode, setProposalMode] = useState<'choose' | 'document' | 'upload'>('choose');
  const [proposalUploading, setProposalUploading] = useState(false);
  const [proposalUploadFile, setProposalUploadFile] = useState<File | null>(null);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [surveys,   setSurveys]   = useState<Survey[]>([]);
  const [outputs,   setOutputs]   = useState<Output[]>([]);



  /* ── task modal ── */
  const [showTaskModal,  setShowTaskModal]  = useState(false);
  const [selectedTask,   setSelectedTask]   = useState<Task | null>(null);
  const [taskTitle,      setTaskTitle]      = useState('');
  const [taskDue,        setTaskDue]        = useState('');
  const [taskAssignee,   setTaskAssignee]   = useState('');
  const [taskErr,        setTaskErr]        = useState('');
  const [savingTask,     setSavingTask]     = useState(false);

  /* ── member modal ── */
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail,     setMemberEmail]     = useState('');
  const [memberRole,      setMemberRole]      = useState('ASSISTANT');
  const [memberErr,       setMemberErr]       = useState('');
  const [savingMember,    setSavingMember]    = useState(false);

  /* ── applications (PI view) ── */
  const [applications,     setApplications]     = useState<Application[]>([]);
  const [reviewingApp,     setReviewingApp]     = useState<string | null>(null);

  /* ── document modal ── */
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle,     setDocTitle]     = useState('');
  const [docErr,       setDocErr]       = useState('');
  const [savingDoc,    setSavingDoc]    = useState(false);

  /* ── output modal ── */
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [outType,         setOutType]         = useState('JOURNAL');
  const [outCitation,     setOutCitation]     = useState('');
  const [outFile,         setOutFile]         = useState<File | null>(null);
  const [outErr,          setOutErr]          = useState('');
  const [savingOut,       setSavingOut]       = useState(false);

  /* ── alert & confirm modals ── */
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmState, setConfirmState] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  /* ─── mount: auth + user ─── */
  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setCurrentUser(getUser<UserMeta>());
  }, [router]);

  /* ─── Fetch data ─── */
  useEffect(() => {
    if (!id) return;
    apiFetch<{ project: Project }>(PROJECTS.DETAIL(id))
      .then(d => {
        setProject(d.project);
        // If proposal already has a file or document, skip the 'choose' screen
        if (d.project.proposal?.fileUrl) setProposalMode('upload');
        else if (d.project.proposal?.content) setProposalMode('document');

        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Error fetching project.');
        setLoading(false);
      });
  }, [id]);

  /* ─── fetch all tab data concurrently ─── */
  const fetchAllTabData = useCallback(() => {
    if (!id) return;
    apiFetch<{ tasks: Task[] }>(TASKS.LIST(id)).then(d => setTasks(d.tasks)).catch(console.error);
    apiFetch<{ documents: Document[] }>(DOCUMENTS.LIST(id)).then(d => setDocuments(d.documents)).catch(console.error);
    apiFetch<{ surveys: Survey[] }>(SURVEYS.LIST(id)).then(d => setSurveys(d.surveys)).catch(console.error);
    apiFetch<{ outputs: Output[] }>(OUTPUTS.LIST(id)).then(d => setOutputs(d.outputs)).catch(console.error);
  }, [id]);

  /* ─── Status & Visibility Handlers ─── */
  async function toggleVisibility() {
    if (!project) return;
    setStatusUpdating(true);
    try {
      const newVis = project.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE';
      const d = await apiFetch<{ project: Project }>(PROJECTS.UPDATE_VISIBILITY(id), {
        method: 'PATCH',
        body: JSON.stringify({ visibility: newVis }),
      });
      setProject(d.project);
    } catch (e: any) {
      setAlertMessage(e.message || 'Failed to update visibility');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!project) return;
    setStatusUpdating(true);
    try {
      if (newStatus === 'LITERATURE_REVIEW' && project.status !== 'LITERATURE_REVIEW') {
        const dDoc = await apiFetch<{ document: any }>(DOCUMENTS.CREATE(id), {
          method: 'POST',
          body: JSON.stringify({ title: 'Literature Review' }),
        });
        const d = await apiFetch<{ project: Project }>(PROJECTS.UPDATE_STATUS(id), {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        setProject(d.project);
        router.push(`/projects/${id}/editor?doc=${dDoc.document.id}`);
        return;
      }

      const d = await apiFetch<{ project: Project }>(PROJECTS.UPDATE_STATUS(id), {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setProject(d.project);
      broadcastActivity('STAGE_ADVANCED', `Project stage advanced to ${newStatus.replace('_', ' ')}`, undefined, { newStatus, initiatorName: currentUser?.firstName });
    } catch (e: any) { setAlertMessage(e.message || 'Failed to update status'); }
    finally { setStatusUpdating(false); }
  }

  useEffect(() => { fetchAllTabData(); }, [fetchAllTabData]);

  /* ─── Fetch pending applications (PI only, when members tab active) ─── */
  const fetchApplications = useCallback(() => {
    if (!id) return;
    apiFetch<{ applications: Application[] }>(APPLICATIONS.LIST(id))
      .then(d => setApplications(d.applications))
      .catch(() => setApplications([]));
  }, [id]);

  useEffect(() => {
    const myRole = project?.members.find(m => m.userId === currentUser?.id)?.role ?? '';
    if (tab === 'members' && myRole === 'PI') fetchApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, project, currentUser]);

  /* ─── Approve / Reject application ─── */
  async function handleReviewApplication(appId: string, decision: 'APPROVED' | 'REJECTED') {
    setReviewingApp(appId);
    try {
      await apiFetch(APPLICATIONS.REVIEW(appId), {
        method: 'PATCH',
        body: JSON.stringify({ decision, projectId: id }),
      });
      // Remove from list + re-fetch project members if approved
      setApplications(prev => prev.filter(a => a.id !== appId));
      if (decision === 'APPROVED') {
        const d = await apiFetch<{ project: Project }>(PROJECTS.DETAIL(id));
        setProject(d.project);
      }
    } catch (e: any) {
      setAlertMessage(e.message || 'Failed to process application.');
    } finally {
      setReviewingApp(null);
    }
  }

  /* ─── socket: join project room ─── */
  useEffect(() => {
    if (!id || !currentUser) return;
    const socket = getSocket();
    socket.connect();
    
    const joinRoom = () => socket.emit('join-project', id, currentUser.id);
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    const onActivity = () => {
      // Background re-fetch to keep UI in sync with others without full page reload
      apiFetch<{ project: Project }>(PROJECTS.DETAIL(id)).then(d => setProject(d.project)).catch(() => {});
      fetchAllTabData();
    };

    socket.on('receive-activity', onActivity);

    return () => { 
      socket.emit('leave-project', id, currentUser.id); 
      socket.off('connect', joinRoom);
      socket.off('receive-activity', onActivity);
      socket.disconnect(); 
    };
  }, [id, currentUser, fetchAllTabData]);

  /* ─── derived ─── */
  const myRole    = project?.members?.find((m: any) => m.userId === currentUser?.id)?.role ?? '';
  /* ─── internal stage removed ─── */

  const isPI = myRole === 'PI';
  const isReviewer = myRole === 'REVIEWER';
  const canEditStatus = isPI;
  const canEdit = isPI || myRole === 'CO_INVESTIGATOR';
  const canWrite  = canEdit || myRole === 'ASSISTANT';

  /* ─── emit activity helper ─── */
  function broadcastActivity(activityType: string, message: string, targetId?: string, metadata?: any) {
    const socket = getSocket();
    const payload = { 
      projectId: id, 
      activityType, 
      message,
      initiatorId: currentUser?.id,
      targetId,
      metadata
    };
    socket.emit('broadcast-activity', payload);
  }

  /* ─── proposal actions ─── */
  async function handleCreateProposalDocument() {
    setProposalSaving(true);
    try {
      // Create a document titled "Research Proposal" and navigate to editor
      const d = await apiFetch<{ document: Document }>(DOCUMENTS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ title: 'Research Proposal' }),
      });
      broadcastActivity('DOC_CREATED', 'Research Proposal document created', undefined, { docTitle: 'Research Proposal', initiatorName: currentUser?.firstName });
      router.push(`/projects/${id}/editor?doc=${d.document.id}`);
    } catch (e: any) { setAlertMessage(e.message || 'Failed to create proposal document.'); }
    finally { setProposalSaving(false); }
  }

  async function handleUploadProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!proposalUploadFile) return;
    setProposalUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', proposalUploadFile);
      const uploadRes = await apiFetch<{ fileUrl: string }>(UPLOAD.FILE, { method: 'POST', body: formData });
      // Save fileUrl to the proposal record
      const d = await apiFetch<any>(PROPOSAL.DRAFT(id), {
        method: 'POST',
        body: JSON.stringify({ type: 'file', fileUrl: uploadRes.fileUrl }),
      });
      setProject(p => p ? { ...p, proposal: d.proposal } : p);
      setAlertMessage('Proposal file uploaded successfully.');
      broadcastActivity('PROPOSAL_UPLOADED', 'Proposal file uploaded');
    } catch (e: any) { setAlertMessage(e.message || 'Failed to upload proposal.'); }
    finally { setProposalUploading(false); }
  }

  async function handleSubmitProposal() {
    setProposalSaving(true);
    try {
      const d = await apiFetch<any>(PROPOSAL.SUBMIT(id), { method: 'POST' });
      setProject(p => p ? { ...p, proposal: d.proposal, status: 'PROPOSAL_SUBMITTED' } : p);
      setAlertMessage('Proposal submitted for review.');
      broadcastActivity('PROPOSAL_SUBMITTED', 'Proposal submitted for review');
    } catch (e: any) { setAlertMessage(e.message || 'Failed to submit proposal.'); }
    finally { setProposalSaving(false); }
  }

  async function handleReviewProposal(decision: 'APPROVE' | 'REVISE') {
    setProposalSaving(true);
    try {
      const d = await apiFetch<any>(PROPOSAL.REVIEW(id), {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setProject(p => p ? { ...p, proposal: d.proposal, status: decision === 'APPROVE' ? 'PROPOSAL_APPROVED' : 'REVISION_REQUIRED' } : p);
      setAlertMessage(`Proposal ${decision === 'APPROVE' ? 'approved' : 'sent back for revision'}.`);
      broadcastActivity(`PROPOSAL_${decision}`, `Proposal was ${decision === 'APPROVE' ? 'approved' : 'returned for revision'} by a reviewer`);
    } catch (e: any) { setAlertMessage(e.message || 'Failed to submit review.'); }
    finally { setProposalSaving(false); }
  }

  /* ─── task actions ─── */
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDue) { setTaskErr('Title and due date are required.'); return; }
    setSavingTask(true); setTaskErr('');
    try {
      const d = await apiFetch<{ task: Task }>(TASKS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle.trim(), dueDate: taskDue, assignedUserId: taskAssignee || undefined }),
      });
      setProject(p => p ? { ...p, tasks: [...p.tasks, d.task] } : p);
      broadcastActivity('TASK_CREATED', `New task "${d.task.title}" was added`, d.task.assignedUserId || undefined, { taskTitle: d.task.title, initiatorName: currentUser?.firstName });
      setShowTaskModal(false); setTaskTitle(''); setTaskDue(''); setTaskAssignee('');
    } catch (e: unknown) { setTaskErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingTask(false); }
  }

  async function toggleTask(task: Task) {
    try {
      const d = await apiFetch<{ task: Task }>(TASKS.STATUS(task.id), {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? d.task : t) } : p);
      if (d.task.isCompleted) broadcastActivity('TASK_COMPLETED', `Task "${d.task.title}" marked complete`, d.task.assignedUserId || undefined, { taskTitle: d.task.title, initiatorName: currentUser?.firstName });
    } catch { /* silent */ }
  }

  /* ─── member actions ─── */
  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberEmail.trim()) { setMemberErr('Please search and select a user.'); return; }
    setSavingMember(true); setMemberErr('');
    try {
      await apiFetch(PROJECTS.ADD_MEMBER(id), {
        method: 'POST',
        body: JSON.stringify({ targetUserId: memberEmail, role: memberRole }),
      });
      const d = await apiFetch<{ project: Project }>(PROJECTS.DETAIL(id));
      setProject(d.project);
      const addedMember = d.project.members.find(m => m.user.id === memberEmail);
      const targetName = addedMember ? `${addedMember.user.firstName} ${addedMember.user.lastName}` : 'A user';
      broadcastActivity('MEMBER_ADDED', `A new member joined the project as ${ROLE_LABELS[memberRole]}`, memberEmail, { role: ROLE_LABELS[memberRole], targetName, initiatorName: currentUser?.firstName });
      setShowMemberModal(false); setMemberEmail(''); setMemberRole('ASSISTANT');
    } catch (e: unknown) { setMemberErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingMember(false); }
  }

  async function handleRemoveMember(userId: string, userName: string) {
    setConfirmState({
      message: `Are you sure you want to remove ${userName} from the project?`,
      onConfirm: async () => {
        setConfirmState(null);
        if (!id) return;
        try {
          await apiFetch(PROJECTS.REMOVE_MEMBER(id, userId), { method: 'DELETE' });
          setProject(p => p ? { ...p, members: p.members.filter(m => m.userId !== userId) } : null);
          broadcastActivity('MEMBER_REMOVED', `${userName} was removed from the project`, userId, { targetName: userName, initiatorName: currentUser?.firstName });
        } catch (e: unknown) {
          setAlertMessage(e instanceof Error ? e.message : 'Failed to remove member.');
        }
      }
    });
  }

  /* ─── document actions ─── */
  async function createDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim()) { setDocErr('Title is required.'); return; }
    setSavingDoc(true); setDocErr('');
    try {
      const d = await apiFetch<{ document: Document }>(DOCUMENTS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ title: docTitle.trim() }),
      });
      setDocuments(prev => [d.document, ...prev]);
      broadcastActivity('DOC_CREATED', `Document "${d.document.title}" was created`, undefined, { docTitle: d.document.title, initiatorName: currentUser?.firstName });
      router.push(`/projects/${id}/editor?doc=${d.document.id}`);
    } catch (e: unknown) { setDocErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingDoc(false); }
  }

  /* ─── output actions ─── */
  async function createOutput(e: React.FormEvent) {
    e.preventDefault();
    if (!outCitation.trim()) { setOutErr('Citation is required.'); return; }
    setSavingOut(true); setOutErr('');
    try {
      let fileUrl = undefined;
      if (outFile) {
        const formData = new FormData();
        formData.append('file', outFile);
        const uploadRes = await apiFetch<{ fileUrl: string }>(UPLOAD.FILE, {
          method: 'POST',
          body: formData,
        });
        fileUrl = uploadRes.fileUrl;
      }

      const d = await apiFetch<{ output: Output }>(OUTPUTS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ outputType: outType, citation: outCitation.trim(), fileUrl }),
      });
      setOutputs(prev => [d.output, ...prev]);
      broadcastActivity('OUTPUT_LOGGED', `Output logged: ${outType}`, undefined, { outType, outputTitle: outCitation.trim(), initiatorName: currentUser?.firstName });
      setShowOutputModal(false); setOutCitation(''); setOutFile(null); setOutType('JOURNAL');
    } catch (e: unknown) { setOutErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingOut(false); }
  }


  /* ─── render guards ─── */
  if (loading) return (
    <div className="proj-loading">
      <span className="dash-empty-icon">◌</span>
      <p>Loading project…</p>
    </div>
  );
  if (error) return <div className="dash-error-box proj-error">{error}</div>;
  if (!project) return null;

  /* ─────────────────────────── JSX ───────────────────────────── */
  return (
    <div className="proj-page">

      {/* ── Breadcrumb ── */}
      <nav className="proj-breadcrumb">
        <Link href="/dashboard" className="proj-bc-link">Dashboard</Link>
        <span className="proj-bc-sep">›</span>
        <span className="proj-bc-cur">{project.title}</span>
      </nav>

      {/* ── Project header ── */}
      <div className="proj-page-header">
        <div className="proj-page-header-left">
          <div className="proj-page-badges" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project Lifecycle Stage:</span>
              {canEditStatus ? (
                <select 
                  className={`proj-badge`} 
                  value={project.status} 
                  onChange={e => {
                    // Read-only: just a visual navigator for the PI, not a status changer
                    // Actual advancement is via StageGuide buttons
                  }}
                  style={{ padding: '0.2rem 0.5rem', cursor: 'default', appearance: 'auto', background: 'var(--bg-hover)', color: 'var(--text)' }}
                  title="Stage view — use the guide buttons below to advance"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PROPOSAL_SUBMITTED">PROPOSAL SUBMITTED</option>
                  <option value="PROPOSAL_APPROVED">PROPOSAL APPROVED</option>
                  <option value="LITERATURE_REVIEW">LITERATURE REVIEW</option>
                  <option value="DATA_COLLECTION">DATA COLLECTION</option>
                  <option value="DATA_ANALYSIS">DATA ANALYSIS</option>
                  <option value="REPORT_WRITING">REPORT WRITING</option>
                  <option value="FINAL_SUBMISSION">FINAL SUBMISSION</option>
                  <option value="CERTIFICATION">CERTIFICATION</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              ) : (
                <span className={`proj-badge`} style={{ background: 'var(--bg-hover)', color: 'var(--text)' }}>
                  {project.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
              <span className="proj-role-chip">{ROLE_LABELS[myRole] ?? myRole}</span>
            </div>
          </div>
          <h1 className="proj-page-title">{project.title}</h1>
          <p style={{ fontSize: '0.8125rem', color: '#2A7C75', fontWeight: 500, letterSpacing: '0.01em', marginBottom: '0.15rem' }}>{project.researchTopic}</p>
          <p className="proj-page-desc">{project.description}</p>
        </div>
        <div className="proj-page-header-right">
          <p className="proj-page-stat-label">Members</p>
          <p className="proj-page-stat-num">{project.members.length}</p>
          <p className="proj-page-stat-label" style={{ marginTop: '0.8rem' }}>Tasks</p>
          <p className="proj-page-stat-num">{project.tasks.length}</p>
        </div>

        {/* ── Task Details Modal ── */}
        {selectedTask && (
          <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <p className="auth-eyebrow">Task Details</p>
                <h2 className="modal-title" style={{ marginTop: '0.2rem', marginBottom: '1.5rem' }}>{selectedTask.title}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(26,26,24,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Status</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500, color: selectedTask.isCompleted ? '#2A7C75' : '#1A1A18' }}>
                    {selectedTask.isCompleted ? 'Completed' : 'Incomplete'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(26,26,24,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Due Date</p>
                  <p style={{ fontSize: '0.95rem', color: '#1A1A18' }}>{formatDate(selectedTask.dueDate)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(26,26,24,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Assigned To</p>
                  <p style={{ fontSize: '0.95rem', color: '#1A1A18' }}>
                    {selectedTask.assignee ? `${selectedTask.assignee.firstName} ${selectedTask.assignee.lastName}` : <span style={{ color: 'rgba(26,26,24,0.4)', fontStyle: 'italic' }}>Unassigned</span>}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(26,26,24,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Assigned By</p>
                  <p style={{ fontSize: '0.95rem', color: '#1A1A18' }}>
                    {selectedTask.assigner ? `${selectedTask.assigner.firstName} ${selectedTask.assigner.lastName}` : <span style={{ color: 'rgba(26,26,24,0.4)', fontStyle: 'italic' }}>Unknown / System</span>}
                  </p>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: 'auto' }}>
                <button className="dash-btn-ghost" onClick={() => setSelectedTask(null)} style={{ width: '100%' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Stage Guide & Interactive Lifecycle ── */}
      <StageGuide 
        project={project} 
        canEditStatus={canEditStatus} 
        onAdvanceStatus={(nextStatus) => handleUpdateStatus(nextStatus)} 
        myRole={myRole}
        onBuildSurvey={() => router.push(`/projects/${id}/surveys`)}
        onDocumentQualitative={async () => {
          try {
            const dDoc = await apiFetch<{ document: any }>(DOCUMENTS.CREATE(id), {
              method: 'POST',
              body: JSON.stringify({ title: 'Qualitative Data' }),
            });
            router.push(`/projects/${id}/editor?doc=${dDoc.document.id}`);
          } catch (e: any) { setAlertMessage(e.message || 'Failed to create document'); }
        }}
        onRequestConfirm={(msg, onConfirm) => setConfirmState({ message: msg, onConfirm })}
        statusUpdating={statusUpdating}
        onWriteReport={async () => {
          try {
            const dDoc = await apiFetch<{ document: any }>(DOCUMENTS.CREATE(id), {
              method: 'POST',
              body: JSON.stringify({ title: 'Final Report' }),
            });
            router.push(`/projects/${id}/editor?doc=${dDoc.document.id}`);
          } catch (e: any) { setAlertMessage(e.message || 'Failed to create document'); }
        }}
        onUploadReport={() => {
          setOutType('REPORT');
          setShowOutputModal(true);
          setTab('outputs');
        }}
      />

      {/* ── Tabs ── */}
      <div className="proj-tabs" style={{ flexWrap: 'wrap' }}>
        {(['proposal', 'tasks', 'documents', 'surveys', 'outputs', 'members', 'settings'] as Tab[]).map(t => (
          <button
            key={t}
            className={`proj-tab ${tab === t ? 'proj-tab--active' : ''}`}
            onClick={() => handleSetTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="proj-tab-content">

        {/* ════ PROPOSAL ════ */}
        {tab === 'proposal' && (
          <div>
            <div className="proj-tab-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 className="proj-tab-title">Project Proposal</h2>
                <button onClick={() => setShowHints(true)} className="dash-btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>💡 Proposal Guidelines</button>
              </div>
              {project.proposal && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem', borderRadius: '4px',
                  background: project.proposal.status === 'APPROVED' ? 'rgba(42,124,117,0.12)' : 'rgba(26,26,24,0.08)',
                  color: project.proposal.status === 'APPROVED' ? '#2A7C75' : 'rgba(26,26,24,0.55)',
                }}>
                  {project.proposal.status.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Reviewer actions */}
            {isReviewer && project.proposal?.status === 'SUBMITTED' && (
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  style={{ opacity: proposalSaving ? 0.7 : 1, background: 'rgba(42,124,117,0.1)', color: '#2A7C75', border: '1px solid rgba(42,124,117,0.3)', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: proposalSaving ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleReviewProposal('APPROVE')} disabled={proposalSaving}
                >{proposalSaving ? 'Saving...' : 'Approve Proposal'}</button>
                <button
                  style={{ opacity: proposalSaving ? 0.7 : 1, background: 'rgba(220,38,38,0.06)', color: 'rgb(185,28,28)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: proposalSaving ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleReviewProposal('REVISE')} disabled={proposalSaving}
                >{proposalSaving ? 'Saving...' : 'Request Revision'}</button>
              </div>
            )}

            {/* Uploaded file view */}
            {project.proposal?.fileUrl && (
              <div className="ws-card ws-card--row" style={{ marginBottom: '1rem', gap: '1rem' }}>
                <div>
                  <p className="proj-card-title" style={{ fontSize: '0.9rem' }}>Uploaded Proposal File</p>
                  <p className="proj-ethics" style={{ marginTop: '0.2rem' }}>Last updated {formatDateTime(project.proposal.updatedAt)}</p>
                </div>
                <a href={project.proposal.fileUrl} target="_blank" rel="noopener" className="dash-btn-primary" style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}>View File →</a>
              </div>
            )}

            {/* Choose mode (only when no proposal exists and can write) */}
            {!project.proposal && canWrite && proposalMode === 'choose' && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setProposalMode('document')}
                  className="ws-card ws-card--clickable"
                  style={{ flex: '1 1 220px' }}
                >
                  <p className="proj-card-title" style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>✏️ Write Collaboratively</p>
                  <p className="proj-card-desc">Open the real-time document editor and co-author the proposal with your team.</p>
                </button>
                <button
                  onClick={() => setProposalMode('upload')}
                  className="ws-card ws-card--clickable"
                  style={{ flex: '1 1 220px' }}
                >
                  <p className="proj-card-title" style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>📎 Upload Existing File</p>
                  <p className="proj-card-desc">Already have a proposal? Upload a PDF or Word document directly.</p>
                </button>
              </div>
            )}

            {/* Write mode: open editor */}
            {proposalMode === 'document' && !project.proposal?.fileUrl && (
              <div className="ws-card">
                <p className="proj-card-desc" style={{ lineHeight: 1.7 }}>
                  {documents.some(d => d.title.toLowerCase().includes('proposal'))
                    ? (project.proposal?.status === 'SUBMITTED' || project.proposal?.status === 'APPROVED' 
                        ? 'Review the submitted proposal document below.' 
                        : 'Open the drafted proposal document below to continue editing.')
                    : 'Click below to open the real-time collaborative document editor. A document titled Research Proposal will be created and linked to this project.'}
                </p>
                {/* Show existing proposal docs if any */}
                {documents.filter(d => d.title.toLowerCase().includes('proposal')).map(doc => (
                  <div key={doc.id} className="ws-card ws-card--row ws-card--plain" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <p className="proj-card-title" style={{ fontSize: '0.9rem' }}>{doc.title}</p>
                      <p className="proj-ethics" style={{ marginTop: '0.1rem' }}>Last edited {formatDateTime(doc.updatedAt)}</p>
                    </div>
                    <a href={`/projects/${id}/editor?doc=${doc.id}`} className="dash-btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>Open →</a>
                  </div>
                ))}
                {canWrite && project.proposal?.status !== 'SUBMITTED' && project.proposal?.status !== 'APPROVED' && !documents.some(d => d.title.toLowerCase().includes('proposal')) && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.25rem' }}>
                    <button onClick={handleCreateProposalDocument} disabled={proposalSaving} className="dash-btn-primary">
                      {proposalSaving ? 'Creating…' : '+ Create Proposal Document'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload mode */}
            {proposalMode === 'upload' && canWrite && (
              <form onSubmit={handleUploadProposal} className="ws-card">
                <p className="proj-card-desc" style={{ lineHeight: 1.7 }}>
                  Upload your proposal as a PDF or Word document. Once uploaded, you can submit it for review.
                </p>
                <div className="auth-field">
                  <label className="auth-label">Proposal File (PDF / DOCX)</label>
                  <input className="auth-input" type="file" accept=".pdf,.doc,.docx" onChange={e => setProposalUploadFile(e.target.files?.[0] || null)} disabled={proposalUploading} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <button type="submit" disabled={!proposalUploadFile || proposalUploading} className="dash-btn-primary" style={{ opacity: proposalUploadFile ? 1 : 0.45 }}>
                    {proposalUploading ? 'Uploading…' : 'Upload Proposal'}
                  </button>
                  {project.proposal?.fileUrl && (
                    <button type="button" onClick={handleSubmitProposal} disabled={proposalSaving} className="dash-btn-ghost">
                      Submit for Review
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* ════ TASKS ════ */}
        {tab === 'tasks' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Tasks &amp; Milestones</h2>
              {canEdit && (
                <button className="dash-btn-primary" onClick={() => setShowTaskModal(true)}>
                  + Add task
                </button>
              )}
            </div>
            {project.tasks.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◌</span><p>No tasks yet.</p></div>
            ) : (
              <ul className="task-list">
                {project.tasks.map(task => (
                  <li 
                    key={task.id} 
                    className={`task-item ${task.isCompleted ? 'task-item--done' : ''}`}
                    onClick={() => setSelectedTask(task)}
                    style={{ cursor: 'pointer', transition: 'background 0.2s ease' }}
                  >
                    <div className="task-info" style={{ flex: 1 }}>
                      <span className="task-title" style={{ textDecoration: task.isCompleted ? 'line-through' : 'none', color: task.isCompleted ? 'rgba(26,26,24,0.45)' : '#1A1A18' }}>{task.title}</span>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem', alignItems: 'center' }}>
                        <span className="task-due">Due {formatDate(task.dueDate)}</span>
                        {task.assignee && (
                          <span className="task-due" style={{ color: '#2A7C75', fontWeight: 500 }}>
                            {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                    {canWrite && (
                      <button
                        style={{
                          padding: '0.4rem 0.875rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: task.isCompleted ? 'transparent' : '#1A1A18',
                          color: task.isCompleted ? 'rgba(26,26,24,0.6)' : '#F2EDE4',
                          border: task.isCompleted ? '1.5px solid rgba(26,26,24,0.15)' : '1.5px solid transparent',
                          marginLeft: '1rem',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(task);
                        }}
                      >
                        {task.isCompleted ? 'Unmark' : 'Mark Complete'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ DOCUMENTS ════ */}
        {tab === 'documents' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Documents</h2>
              {canWrite && (
                <button className="dash-btn-primary" onClick={() => setShowDocModal(true)}>
                  + New document
                </button>
              )}
            </div>
            {documents.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◈</span><p>No documents yet.</p></div>
            ) : (
              <ul className="doc-list">
                {documents.map(doc => (
                  <li key={doc.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="doc-item-title">{doc.title}</span>
                      <span className="doc-item-meta">Last edited {formatDateTime(doc.updatedAt)}</span>
                    </div>
                    <Link
                      href={`/projects/${id}/editor?doc=${doc.id}`}
                      className="dash-btn-ghost doc-open-btn"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ SURVEYS ════ */}
        {tab === 'surveys' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Surveys</h2>
              {canEdit && (
                <button 
                  onClick={() => {
                    const allowedStages = ['DATA_COLLECTION', 'DATA_ANALYSIS', 'REPORT_WRITING', 'FINAL_SUBMISSION', 'CERTIFICATION', 'COMPLETED'];
                    if (allowedStages.includes(project.status)) {
                      router.push(`/projects/${id}/surveys`);
                    } else {
                      setAlertMessage('Your project must reach the DATA COLLECTION stage before you can build surveys.');
                    }
                  }} 
                  className="dash-btn-primary"
                >
                  + Build survey
                </button>
              )}
            </div>
            {surveys.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◌</span><p>No surveys yet.</p></div>
            ) : (
              <ul className="doc-list">
                {surveys.map(s => (
                  <li key={s.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="doc-item-title">{s.title}</span>
                      <span className="doc-item-meta">
                        {s.isActive ? '● Active' : '○ Inactive'} · Created {formatDate(s.createdAt)}
                      </span>
                    </div>
                    <Link href={`/projects/${id}/surveys?survey=${s.id}`} className="dash-btn-ghost doc-open-btn">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ OUTPUTS ════ */}
        {tab === 'outputs' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Research Outputs</h2>
              {canWrite && (
                <button className="dash-btn-primary" onClick={() => setShowOutputModal(true)}>
                  + Log output
                </button>
              )}
            </div>
            {outputs.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◈</span><p>No outputs logged yet.</p></div>
            ) : (
              <ul className="doc-list">
                {outputs.map(o => (
                  <li key={o.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="proj-badge badge--active" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                        {OUTPUT_LABELS[o.outputType] ?? o.outputType}
                      </span>
                      <span className="doc-item-title">{o.citation}</span>
                      <span className="doc-item-meta">Logged {formatDate(o.createdAt)}</span>
                    </div>
                    {o.fileUrl && (
                      <a href={o.fileUrl} target="_blank" rel="noopener" className="dash-btn-ghost doc-open-btn">
                        File →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ MEMBERS ════ */}
        {tab === 'members' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Team Members</h2>
              {isPI && (
                <button className="dash-btn-primary" onClick={() => setShowMemberModal(true)}>
                  + Add member
                </button>
              )}
            </div>

            {/* ── Pending Applications (PI only) ── */}
            {isPI && applications.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p className="proj-role" style={{ marginBottom: '0.75rem', letterSpacing: '0.08em' }}>
                  Collaboration Requests ({applications.length})
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none' }}>
                  {applications.map(app => (
                    <li key={app.id} className="ws-card ws-card--plain ws-card--row" style={{ gap: '1rem', padding: '1rem 1.25rem' }}>
                      {/* Avatar */}
                      <div className="member-avatar" style={{ flexShrink: 0 }}>
                        {app.user.firstName[0]}{app.user.lastName[0]}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="member-name">{app.user.firstName} {app.user.lastName}</p>
                        <p className="member-email">{app.user.email}</p>
                        <p className="proj-ethics" style={{ marginTop: '0.2rem' }}>
                          Applied as <strong>{ROLE_LABELS[app.role] ?? app.role}</strong> · {formatDate(app.createdAt)}
                        </p>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          className="dash-btn-primary"
                          style={{ padding: '0.3rem 0.85rem', fontSize: '0.75rem' }}
                          disabled={reviewingApp === app.id}
                          onClick={() => handleReviewApplication(app.id, 'APPROVED')}
                        >
                          {reviewingApp === app.id ? '…' : 'Approve'}
                        </button>
                        <button
                          className="dash-btn-ghost"
                          style={{ padding: '0.3rem 0.85rem', fontSize: '0.75rem', color: 'var(--error)' }}
                          disabled={reviewingApp === app.id}
                          onClick={() => handleReviewApplication(app.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isPI && applications.length === 0 && (
              <p className="proj-ethics" style={{ marginBottom: '1.5rem' }}>No pending collaboration requests.</p>
            )}

            {/* ── Active Members ── */}
            <ul className="member-list">
              {project.members.map(m => (
                <li key={m.userId} className="member-item">
                  <div className="member-avatar">
                    {m.user.firstName[0]}{m.user.lastName[0]}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{m.user.firstName} {m.user.lastName}</span>
                    <span className="member-email">{m.user.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="member-item-actions">
                    <span className="member-role">{ROLE_LABELS[m.role] ?? m.role}</span>
                    {isPI && m.userId !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, `${m.user.firstName} ${m.user.lastName}`)}
                        className="dash-btn-ghost"
                        style={{ color: 'var(--error)', padding: '0.25rem 0.5rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === 'settings' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Project Settings</h2>
            </div>
            
            <div style={{ maxWidth: '600px', padding: '1rem 0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem' }}>Project Visibility</h3>
                  <p className="proj-card-desc">Determine who can see this project. Public projects can be viewed by anyone on the platform.</p>
                </div>
                {myRole === 'PI' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--paper)', padding: '0.35rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: project.visibility === 'PRIVATE' ? 'var(--text)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Lock size={12} /> PRIVATE
                    </span>
                    <button 
                      onClick={toggleVisibility}
                      disabled={statusUpdating}
                      style={{
                        width: '34px', height: '20px', borderRadius: '10px',
                        background: project.visibility === 'PRIVATE' ? '#ef4444' : '#10b981',
                        border: 'none', cursor: 'pointer', position: 'relative',
                        transition: 'background 0.3s ease', padding: 0
                      }}
                      title={project.visibility === 'PRIVATE' ? 'Click to make Public' : 'Click to make Private'}
                    >
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '2px', left: project.visibility === 'PRIVATE' ? '2px' : '16px',
                        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: project.visibility === 'PUBLIC' ? 'var(--text)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Globe size={12} /> PUBLIC
                    </span>
                  </div>
                ) : (
                  <span className="proj-badge" style={{ background: 'var(--bg-hover)', color: 'var(--text)' }}>
                    {project.visibility === 'PRIVATE' ? '🔒 PRIVATE' : '🌍 PUBLIC'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ════ MODALS ════ */}

      {/* Hints Modal */}
      {showHints && (
        <Modal title="Proposal Guidelines" onClose={() => setShowHints(false)}>
          <div style={{ lineHeight: 1.6, fontSize: '0.9rem', color: 'var(--ink)', maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
            <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <li><strong>Title:</strong> A clear, concise statement of the research topic.</li>
              <li><strong>Abstract:</strong> A brief summary (150-250 words) covering objectives, methodology, and expected outcomes.</li>
              <li><strong>Introduction & Background:</strong> Contextualise the problem and state why it is significant.</li>
              <li><strong>Statement of the Problem:</strong> Clearly define the specific issue the research will address.</li>
              <li><strong>Objectives:</strong> List primary and secondary research goals.</li>
              <li><strong>Literature Review:</strong> Summarise existing research and identify the gap this project fills.</li>
              <li><strong>Methodology:</strong> Describe the study design, data collection methods (e.g. surveys, interviews), and analysis techniques.</li>
              <li><strong>Timeline & Budget:</strong> A brief projection of project milestones and estimated costs.</li>
              <li><strong>References:</strong> Cite all sources using standard academic formatting (APA, IEEE, etc.).</li>
            </ol>
          </div>
          <ModalActions>
            <button type="button" className="dash-btn-primary" onClick={() => setShowHints(false)}>Got it</button>
          </ModalActions>
        </Modal>
      )}

      {/* Task modal */}
      {showTaskModal && (
        <Modal title="Add task" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={createTask} className="auth-form">
            <Field label="Task title" id="task-title">
              <input id="task-title" className="auth-input" type="text"
                placeholder="e.g. Complete literature review"
                value={taskTitle} onChange={e => { setTaskTitle(e.target.value); setTaskErr(''); }}
                disabled={savingTask} />
            </Field>
            <Field label="Due date" id="task-due">
              <input id="task-due" className="auth-input" type="date"
                value={taskDue} onChange={e => { setTaskDue(e.target.value); setTaskErr(''); }}
                disabled={savingTask} />
            </Field>
            <Field label="Assign to (Search by email — optional)" id="task-assignee">
              <UserSearchInput
                id="task-assignee"
                value={taskAssignee}
                onChange={setTaskAssignee}
                disabled={savingTask}
              />
            </Field>
            {taskErr && <p className="auth-error">{taskErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingTask}>
                {savingTask ? 'Saving…' : 'Add task →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Member modal */}
      {showMemberModal && (
        <Modal title="Add member" onClose={() => setShowMemberModal(false)}>
          <form onSubmit={addMember} className="auth-form">
            <Field label="Search user by email" id="member-id">
              <UserSearchInput
                id="member-id"
                value={memberEmail}
                onChange={(val) => { setMemberEmail(val); setMemberErr(''); }}
                disabled={savingMember}
              />
            </Field>
            <Field label="Role" id="member-role">
              <select id="member-role" className="auth-input auth-select"
                value={memberRole} onChange={e => setMemberRole(e.target.value)}
                disabled={savingMember}>
                <option value="CO_INVESTIGATOR">Co-Investigator</option>
                <option value="ASSISTANT">Research Assistant</option>
                <option value="REVIEWER">Reviewer</option>
              </select>
            </Field>
            {memberErr && <p className="auth-error">{memberErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingMember}>
                {savingMember ? 'Adding…' : 'Add member →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Document modal */}
      {showDocModal && (
        <Modal title="New document" onClose={() => setShowDocModal(false)}>
          <form onSubmit={createDocument} className="auth-form">
            <Field label="Document title" id="doc-title">
              <input id="doc-title" className="auth-input" type="text"
                placeholder="e.g. Research Methodology Draft"
                value={docTitle} onChange={e => { setDocTitle(e.target.value); setDocErr(''); }}
                disabled={savingDoc} />
            </Field>
            {docErr && <p className="auth-error">{docErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowDocModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingDoc}>
                {savingDoc ? 'Creating…' : 'Create & open →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Output modal */}
      {showOutputModal && (
        <Modal title="Log research output" onClose={() => setShowOutputModal(false)}>
          <form onSubmit={createOutput} className="auth-form">
            <Field label="Output type" id="out-type">
              <select id="out-type" className="auth-input auth-select"
                value={outType} onChange={e => setOutType(e.target.value)}
                disabled={savingOut}>
                <option value="JOURNAL">Journal Article</option>
                <option value="CONFERENCE">Conference Paper</option>
                <option value="REPORT">Report</option>
              </select>
            </Field>
            <Field label="Citation / Title" id="out-cite">
              <textarea id="out-cite" className="auth-textarea"
                placeholder="Full citation or title of the output…"
                rows={3} value={outCitation}
                onChange={e => { setOutCitation(e.target.value); setOutErr(''); }}
                disabled={savingOut} />
            </Field>
            <Field label="Attach File (Optional)" id="out-file">
              <input id="out-file" className="auth-input" type="file"
                onChange={e => { setOutFile(e.target.files?.[0] || null); setOutErr(''); }}
                disabled={savingOut} />
            </Field>
            {outErr && <p className="auth-error">{outErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowOutputModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingOut}>
                {savingOut ? 'Saving…' : 'Log output →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── Custom Alert Modal ── */}
      {alertMessage && (
        <Modal title="Notice" onClose={() => setAlertMessage('')}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ marginBottom: '2rem', color: 'var(--ink-mid)' }}>{alertMessage}</p>
            <ModalActions>
              <button className="dash-btn-primary" onClick={() => setAlertMessage('')}>
                OK
              </button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {/* ── Custom Confirm Modal ── */}
      {confirmState && (
        <Modal title="Confirm Action" onClose={() => setConfirmState(null)}>
          <div style={{ padding: '1rem 0' }}>
            <p style={{ marginBottom: '2rem', color: 'var(--ink-mid)' }}>{confirmState.message}</p>
            <ModalActions>
              <button className="dash-btn-ghost" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
              <button 
                className="dash-btn-primary" 
                onClick={() => {
                  const onConfirm = confirmState.onConfirm;
                  setConfirmState(null);
                  onConfirm();
                }}
              >
                Confirm
              </button>
            </ModalActions>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────── Shared sub-components ────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p className="auth-eyebrow">Project workspace</p>
          <h2 className="modal-title">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="modal-actions">{children}</div>;
}

/* ─────────────────────── Helpers ──────────────────────────────── */
function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch { return iso; }
}
