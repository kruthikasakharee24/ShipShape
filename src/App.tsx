import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bug,
  CheckSquare,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  GitCompare,
  History,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquare,
  Play,
  Plug,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DEFAULT_POLICIES, INITIAL_RELEASES } from './data/releases';
import type {
  AgentChatMessage,
  ApprovalState,
  AuditEntry,
  NotificationItem,
  ReleaseAssessment,
  ReleaseCandidate,
  ReleaseHistorySnapshot,
  ReleasePolicy,
} from './types/release';
import { OverviewView, type WorkspaceTab } from './components/OverviewView';
import {
  BugsView,
  ChecklistView,
  DocumentsView,
  RequirementsView,
  SecurityReportsView,
  TestsView,
} from './components/ArtifactViews';
import {
  AuditCollaborationView,
  CompareVersionsView,
  IntegrationsRoadmapView,
  PoliciesView,
} from './components/GovernanceViews';
import {
  ImportArtifactsModal,
  type ExtractedDocumentPayload,
} from './components/ImportArtifactsModal';
import { NewReleaseModal } from './components/NewReleaseModal';
import { ChatAssistantDrawer } from './components/ChatAssistantDrawer';

const STORAGE_KEY = 'shipshape_workspace_v2';
const AVATAR_URL = '/src/assets/images/avatar_release_lead_1794909948394.jpg';

interface PersistedWorkspace {
  releases: ReleaseCandidate[];
  policies: ReleasePolicy[];
  activeReleaseId: string;
  assessments: Record<string, ReleaseAssessment>;
  staleMap: Record<string, boolean>;
  chats: Record<string, AgentChatMessage[]>;
  notifications: NotificationItem[];
}

function nowUtcLabel(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function loadPersistedWorkspace(): PersistedWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedWorkspace;
      if (Array.isArray(parsed.releases) && parsed.releases.length > 0) {
        return {
          ...parsed,
          policies: Array.isArray(parsed.policies) ? parsed.policies : DEFAULT_POLICIES,
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        };
      }
    }
  } catch {
    // Ignore storage read errors and fall back to seed releases
  }
  return {
    releases: INITIAL_RELEASES,
    policies: DEFAULT_POLICIES,
    activeReleaseId: INITIAL_RELEASES[0].id,
    assessments: {},
    staleMap: {},
    chats: {},
    notifications: [
      {
        id: 'NOTIF-1',
        title: 'Security report attached to v2.14.0',
        detail: 'sast-security-rc3.json reported 1 Critical and 1 High finding.',
        timestamp: '2026-11-17 01:18 UTC',
        read: false,
        releaseId: 'rel-checkout-214',
        targetTab: 'security',
      },
      {
        id: 'NOTIF-2',
        title: 'Release v1.9.4 approved for cutover',
        detail: 'Elena Vance recorded human approval for Production Global window.',
        timestamp: '2026-11-17 01:30 UTC',
        read: true,
        releaseId: 'rel-auth-194',
        targetTab: 'audit',
      },
    ],
  };
}

function buildMarkdownReport(
  release: ReleaseCandidate,
  assessment: ReleaseAssessment | null
): string {
  const lines: string[] = [
    `# ShipShape Release-Readiness Assessment: ${release.version} — ${release.name}`,
    ``,
    `- **Branch / Commit:** \`${release.branch}\` (\`${release.commitSha}\`)`,
    `- **Target Environment:** ${release.targetEnvironment}`,
    `- **Target Window:** ${release.targetWindow}`,
    `- **Release Manager:** ${release.releaseManager}`,
    `- **Human Sign-Off:** ${release.approvalState}${release.approvedBy ? ` (${release.approvedBy} at ${release.approvedAt})` : ''}`,
    ``,
    `## Scope Summary`,
    release.summary,
    ``,
  ];

  if (assessment) {
    lines.push(
      `## Verdict: ${assessment.verdict.replace('_', '-')}`,
      `- **Confidence:** ${assessment.confidenceLevel}`,
      `- **Assessed At:** ${assessment.assessedAt}`,
      ``,
      assessment.executiveSummary,
      ``,
      `### Readiness Dimensions`,
      ...assessment.dimensions.map(
        (d) => `- **${d.dimension}** [${d.status}] — ${d.headlineMetric}: ${d.summary}`
      ),
      ``,
      `### Policy Verification`,
      ...(assessment.policyEvaluations ?? []).map(
        (p) => `- **${p.policyId} (${p.policyName})** [${p.status}]: ${p.evidence}`
      ),
      ``,
      `### Cross-Artifact Findings`,
      ...assessment.findings.map(
        (f) =>
          `- **${f.id} (${f.severity} · ${f.category}):** ${f.title}\n  - Records: ${f.artifactRefs.join(', ')}\n  - Source Documents: ${(f.sourceDocuments ?? []).join(', ') || 'Inline'}\n  - Analysis: ${f.analysis}\n  - Corrective Action: ${f.remediation}`
      ),
      ``,
      `### Recommended Corrective Actions`,
      ...assessment.signOffConditions.map((c, idx) => `${idx + 1}. ${c}`),
      ``
    );
  } else {
    lines.push(`## Verdict`, `Assessment has not been run yet.`, ``);
  }

  lines.push(
    `## Evidence Snapshot`,
    `- Source Documents: ${release.documents.map((d) => d.filename).join(', ') || 'None'}`,
    `- Tests: ${release.tests.filter((t) => t.status === 'PASS').length}/${release.tests.length} passing`,
    `- Unresolved Bugs: ${release.bugs.filter((b) => b.status === 'OPEN' || b.status === 'IN_PROGRESS').length}`,
    `- Open Security Findings: ${release.securityReports.filter((s) => s.status === 'OPEN').length}`,
    `- Requirements: ${release.requirements.length}`,
    `- Checklist: ${release.checklist.filter((c) => c.completed).length}/${release.checklist.length} completed`
  );

  return lines.join('\n');
}

export default function App() {
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(() => loadPersistedWorkspace());
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const [importModalState, setImportModalState] = useState<{
    open: boolean;
    target: 'AUTO' | 'tests' | 'bugs' | 'requirements' | 'checklist' | 'security';
    mode: 'file' | 'paste';
  }>({ open: false, target: 'AUTO', mode: 'file' });
  const [newReleaseOpen, setNewReleaseOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore quota errors
    }
  }, [workspace]);

  const activeRelease = useMemo(() => {
    return (
      workspace.releases.find((r) => r.id === workspace.activeReleaseId) ?? workspace.releases[0]
    );
  }, [workspace.releases, workspace.activeReleaseId]);

  const activeAssessment = workspace.assessments[activeRelease.id] ?? null;
  const isStale = Boolean(workspace.staleMap[activeRelease.id]);
  const activeChat = workspace.chats[activeRelease.id] ?? [];
  const unreadCount = workspace.notifications.filter((n) => !n.read).length;

  function appendAuditAndNotify(
    releaseId: string,
    action: string,
    detail: string,
    notificationTitle?: string,
    targetTab?: WorkspaceTab
  ) {
    const timestamp = nowUtcLabel();
    const auditEntry: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-5)}`,
      timestamp,
      actor: 'Elena Vance',
      action,
      detail,
    };

    setWorkspace((prev) => ({
      ...prev,
      releases: prev.releases.map((r) =>
        r.id === releaseId ? { ...r, auditTrail: [auditEntry, ...r.auditTrail] } : r
      ),
      notifications: notificationTitle
        ? [
            {
              id: `NOTIF-${Date.now().toString().slice(-5)}`,
              title: notificationTitle,
              detail,
              timestamp,
              read: false,
              releaseId,
              targetTab,
            },
            ...prev.notifications,
          ].slice(0, 20)
        : prev.notifications,
    }));
  }

  function selectRelease(releaseId: string) {
    setWorkspace((prev) => ({ ...prev, activeReleaseId: releaseId }));
    setAssessmentError(null);
    setAskError(null);
    setMobileNavOpen(false);
  }

  function updateActiveRelease(
    updater: (rel: ReleaseCandidate) => ReleaseCandidate,
    auditAction?: { action: string; detail: string }
  ) {
    const timestamp = nowUtcLabel();
    setWorkspace((prev) => ({
      ...prev,
      releases: prev.releases.map((r) => {
        if (r.id !== activeRelease.id) return r;
        const updated = updater(r);
        if (!auditAction) return updated;
        return {
          ...updated,
          auditTrail: [
            {
              id: `AUD-${Date.now().toString().slice(-5)}`,
              timestamp,
              actor: 'Elena Vance',
              action: auditAction.action,
              detail: auditAction.detail,
            },
            ...updated.auditTrail,
          ],
        };
      }),
      staleMap: {
        ...prev.staleMap,
        [activeRelease.id]: Boolean(prev.assessments[activeRelease.id]),
      },
    }));
  }

  async function handleRunAssessment() {
    setIsAssessing(true);
    setAssessmentError(null);
    setActiveTab('overview');

    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          release: activeRelease,
          policies: workspace.policies,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assess release readiness.');
      }

      const assessment = data.assessment as ReleaseAssessment;
      const snapshot: ReleaseHistorySnapshot = {
        id: `HIS-${Date.now().toString().slice(-5)}`,
        assessedAt: assessment.assessedAt,
        verdict: assessment.verdict,
        confidenceLevel: assessment.confidenceLevel,
        summary: assessment.executiveSummary,
        metrics: {
          testsPassed: activeRelease.tests.filter((t) => t.status === 'PASS').length,
          testsTotal: activeRelease.tests.length,
          openBugs: activeRelease.bugs.filter(
            (b) => b.status === 'OPEN' || b.status === 'IN_PROGRESS'
          ).length,
          openSecurityCriticalHigh: activeRelease.securityReports.filter(
            (s) => s.status === 'OPEN' && (s.severity === 'CRITICAL' || s.severity === 'HIGH')
          ).length,
          checklistCompleted: activeRelease.checklist.filter((c) => c.completed).length,
          checklistTotal: activeRelease.checklist.length,
        },
      };

      const timestamp = nowUtcLabel();
      const verdictReadable = assessment.verdict.replace('_', '-');

      setWorkspace((prev) => ({
        ...prev,
        assessments: {
          ...prev.assessments,
          [activeRelease.id]: assessment,
        },
        staleMap: {
          ...prev.staleMap,
          [activeRelease.id]: false,
        },
        releases: prev.releases.map((r) =>
          r.id === activeRelease.id
            ? {
                ...r,
                history: [snapshot, ...r.history],
                auditTrail: [
                  {
                    id: `AUD-${Date.now().toString().slice(-5)}`,
                    timestamp,
                    actor: 'ShipShape AI Agent',
                    action: 'ASSESSMENT_COMPLETED',
                    detail: `Verdict: ${verdictReadable} (${assessment.findings.length} findings across ${r.documents.length} docs).`,
                  },
                  ...r.auditTrail,
                ],
              }
            : r
        ),
        notifications: [
          {
            id: `NOTIF-${Date.now().toString().slice(-5)}`,
            title: `${activeRelease.version} assessed: ${verdictReadable}`,
            detail: `${assessment.findings.length} cross-artifact findings identified.`,
            timestamp,
            read: false,
            releaseId: activeRelease.id,
            targetTab: 'overview',
          },
          ...prev.notifications,
        ].slice(0, 20),
      }));
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : 'Unable to complete assessment.');
    } finally {
      setIsAssessing(false);
    }
  }

  async function handleAskQuestion(question: string) {
    const userMsg: AgentChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...activeChat, userMsg];
    setWorkspace((prev) => ({
      ...prev,
      chats: { ...prev.chats, [activeRelease.id]: nextHistory },
    }));
    setIsAsking(true);
    setAskError(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          release: activeRelease,
          assessment: activeAssessment,
          policies: workspace.policies,
          question,
          history: activeChat,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from agent.');
      }

      const assistantMsg: AgentChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setWorkspace((prev) => ({
        ...prev,
        chats: {
          ...prev.chats,
          [activeRelease.id]: [...nextHistory, assistantMsg],
        },
      }));
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Failed to query release agent.');
    } finally {
      setIsAsking(false);
    }
  }

  function handleImportPayload(payload: ExtractedDocumentPayload) {
    const timestamp = nowUtcLabel();
    updateActiveRelease(
      (rel) => ({
        ...rel,
        tests: [...payload.tests, ...rel.tests],
        bugs: [...payload.bugs, ...rel.bugs],
        securityReports: [...payload.securityReports, ...rel.securityReports],
        requirements: [...rel.requirements, ...payload.requirements],
        checklist: [...rel.checklist, ...payload.checklist],
        documents: payload.document ? [payload.document, ...rel.documents] : rel.documents,
      }),
      {
        action: payload.document ? 'DOCUMENT_UPLOADED' : 'ARTIFACTS_IMPORTED',
        detail: payload.document
          ? `Uploaded ${payload.document.filename} (${payload.document.format}) — ${payload.summary}`
          : payload.summary,
      }
    );

    if (payload.document) {
      setWorkspace((prev) => ({
        ...prev,
        notifications: [
          {
            id: `NOTIF-${Date.now().toString().slice(-5)}`,
            title: `Parsed ${payload.document?.filename}`,
            detail: payload.summary,
            timestamp,
            read: false,
            releaseId: activeRelease.id,
            targetTab: 'documents',
          },
          ...prev.notifications,
        ].slice(0, 20),
      }));
    }
  }

  function handleRecordApproval(state: ApprovalState, note: string) {
    const timestamp = nowUtcLabel();
    const detail = note.trim()
      ? `${state} by Elena Vance: ${note.trim()}`
      : `Release marked ${state} by Elena Vance.`;

    setWorkspace((prev) => ({
      ...prev,
      releases: prev.releases.map((r) =>
        r.id === activeRelease.id
          ? {
              ...r,
              approvalState: state,
              approvedBy: 'Elena Vance',
              approvedAt: timestamp,
              comments: note.trim()
                ? [
                    {
                      id: `CMT-${Date.now().toString().slice(-5)}`,
                      author: 'Elena Vance',
                      role: 'Release Gatekeeper',
                      content: note.trim(),
                      timestamp,
                      decision: state === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED',
                    },
                    ...r.comments,
                  ]
                : r.comments,
              auditTrail: [
                {
                  id: `AUD-${Date.now().toString().slice(-5)}`,
                  timestamp,
                  actor: 'Elena Vance',
                  action: `HUMAN_APPROVAL_${state}`,
                  detail,
                },
                ...r.auditTrail,
              ],
            }
          : r
      ),
      notifications: [
        {
          id: `NOTIF-${Date.now().toString().slice(-5)}`,
          title: `${activeRelease.version} human decision: ${state}`,
          detail,
          timestamp,
          read: false,
          releaseId: activeRelease.id,
          targetTab: 'audit',
        },
        ...prev.notifications,
      ].slice(0, 20),
    }));
  }

  function handleAddComment(
    content: string,
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT'
  ) {
    const timestamp = nowUtcLabel();
    updateActiveRelease(
      (rel) => ({
        ...rel,
        comments: [
          {
            id: `CMT-${Date.now().toString().slice(-5)}`,
            author: 'Elena Vance',
            role: 'Release Gatekeeper',
            content,
            timestamp,
            decision,
          },
          ...rel.comments,
        ],
      }),
      {
        action: 'REVIEW_COMMENT_ADDED',
        detail: `${decision}: ${content}`,
      }
    );
  }

  function handleCreateRelease(newRelease: ReleaseCandidate) {
    setWorkspace((prev) => ({
      ...prev,
      releases: [newRelease, ...prev.releases],
      activeReleaseId: newRelease.id,
    }));
    setActiveTab('overview');
  }

  function handleExportMarkdown() {
    const markdown = buildMarkdownReport(activeRelease, activeAssessment);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipshape-${activeRelease.version.replace(/[^a-zA-Z0-9._-]/g, '_')}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendAuditAndNotify(
      activeRelease.id,
      'REPORT_EXPORTED_MD',
      `Exported Markdown assessment report for ${activeRelease.version}.`
    );
    setExportMenuOpen(false);
  }

  function handleExportJson() {
    const payload = {
      release: activeRelease,
      policies: workspace.policies,
      assessment: activeAssessment,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipshape-${activeRelease.version.replace(/[^a-zA-Z0-9._-]/g, '_')}-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendAuditAndNotify(
      activeRelease.id,
      'REPORT_EXPORTED_JSON',
      `Exported JSON assessment bundle for ${activeRelease.version}.`
    );
    setExportMenuOpen(false);
  }

  function handleResetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    setWorkspace(loadPersistedWorkspace());
    setAssessmentError(null);
    setAskError(null);
    setActiveTab('overview');
  }

  const navSections: {
    heading: string;
    items: {
      key: WorkspaceTab;
      label: string;
      count?: string;
      icon: typeof LayoutDashboard;
    }[];
  }[] = [
    {
      heading: 'Assessment',
      items: [
        { key: 'overview', label: 'Overview & Verdict', icon: LayoutDashboard },
        {
          key: 'documents',
          label: 'Source Documents',
          count: `${activeRelease.documents.length}`,
          icon: FileText,
        },
      ],
    },
    {
      heading: 'Evidence Streams',
      items: [
        {
          key: 'tests',
          label: 'Test Reports',
          count: `${activeRelease.tests.length}`,
          icon: FlaskConical,
        },
        {
          key: 'bugs',
          label: 'Bug Reports',
          count: `${activeRelease.bugs.length}`,
          icon: Bug,
        },
        {
          key: 'security',
          label: 'Security Reports',
          count: `${activeRelease.securityReports.length}`,
          icon: ShieldAlert,
        },
        {
          key: 'requirements',
          label: 'Requirements',
          count: `${activeRelease.requirements.length}`,
          icon: FileCheck2,
        },
        {
          key: 'checklist',
          label: 'Deployment Checklist',
          count: `${activeRelease.checklist.filter((c) => c.completed).length}/${activeRelease.checklist.length}`,
          icon: CheckSquare,
        },
      ],
    },
    {
      heading: 'Governance & History',
      items: [
        {
          key: 'policies',
          label: 'Policies & Gates',
          count: `${workspace.policies.filter((p) => p.enabled).length}`,
          icon: SlidersHorizontal,
        },
        { key: 'compare', label: 'Compare Versions', icon: GitCompare },
        {
          key: 'audit',
          label: 'History & Audit Trail',
          count: `${activeRelease.auditTrail.length}`,
          icon: History,
        },
        { key: 'integrations', label: 'Integrations Roadmap', icon: Plug },
      ],
    },
  ];

  const activeTabLabel =
    navSections.flatMap((s) => s.items).find((n) => n.key === activeTab)?.label ?? 'Overview';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div className="flex flex-col overflow-y-auto">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            ShipShape
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Release Candidate Switcher */}
        <div className="border-b border-slate-200 px-3 py-3.5">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-slate-500">Release Candidates</span>
            <button
              type="button"
              onClick={() => setNewReleaseOpen(true)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New
            </button>
          </div>
          <div className="space-y-1">
            {workspace.releases.map((rel) => {
              const isSelected = rel.id === activeRelease.id;
              const verdict = workspace.assessments[rel.id]?.verdict ?? rel.history[0]?.verdict;
              const verdictLabel =
                verdict === 'GO'
                  ? 'GO'
                  : verdict === 'INCONCLUSIVE'
                    ? 'INCONCLUSIVE'
                    : verdict === 'NO_GO'
                      ? 'NO-GO'
                      : null;
              const verdictColor =
                verdict === 'GO'
                  ? 'text-emerald-700'
                  : verdict === 'INCONCLUSIVE'
                    ? 'text-amber-700'
                    : 'text-red-700';

              return (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => selectRelease(rel.id)}
                  className={`flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {rel.version}
                    </span>
                    {verdictLabel && (
                      <span className={`font-mono text-[10px] font-semibold ${verdictColor}`}>
                        {verdictLabel}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 truncate text-xs text-slate-600">{rel.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-4 px-3 py-3.5" aria-label="Release workspace sections">
          {navSections.map((section) => (
            <div key={section.heading}>
              <div className="mb-1.5 px-2 text-[11px] font-semibold text-slate-400">
                {section.heading}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.key);
                        setMobileNavOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </span>
                      {item.count !== undefined && (
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer AI Chat Trigger + Profile */}
      <div className="border-t border-slate-200 px-3 py-3 space-y-3">
        <button
          type="button"
          onClick={() => setChatDrawerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Open AI Assistant
        </button>

        <div className="flex items-center gap-3 px-1">
          {!avatarFailed ? (
            <img
              src={AVATAR_URL}
              alt="Elena Vance, Release Gatekeeper"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-8 w-8 shrink-0 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 font-mono text-xs font-semibold text-slate-700">
              EV
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900">Elena Vance</div>
            <div className="truncate text-[11px] text-slate-500">Release Gatekeeper</div>
          </div>
          <button
            type="button"
            onClick={handleResetDemoData}
            title="Restore sample data"
            aria-label="Restore sample data"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[264px] shrink-0 border-r border-slate-200 bg-white lg:block print:hidden">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-50 w-[264px] max-w-[85vw] border-r border-slate-200 bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-6 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-xs text-slate-500"
            >
              <span className="hidden whitespace-nowrap sm:inline">Releases</span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-mono font-medium text-slate-700">
                {activeRelease.version} · {activeRelease.name}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="whitespace-nowrap font-medium text-slate-900">
                {activeTabLabel}
              </span>
            </nav>
          </div>

          <div className="relative flex shrink-0 items-center gap-2.5">
            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setExportMenuOpen(false);
                }}
                aria-label="Notifications"
                className="relative rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded bg-red-600 px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    <button
                      type="button"
                      onClick={() =>
                        setWorkspace((prev) => ({
                          ...prev,
                          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
                        }))
                      }
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {workspace.notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      workspace.notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setWorkspace((prev) => ({
                              ...prev,
                              activeReleaseId: n.releaseId,
                              notifications: prev.notifications.map((item) =>
                                item.id === n.id ? { ...item, read: true } : item
                              ),
                            }));
                            if (n.targetTab) {
                              setActiveTab(n.targetTab as WorkspaceTab);
                            }
                            setNotificationsOpen(false);
                          }}
                          className={`block w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 ${
                            !n.read ? 'bg-slate-50/70' : ''
                          }`}
                        >
                          <div className="font-medium text-slate-900">{n.title}</div>
                          <div className="mt-0.5 text-slate-600">{n.detail}</div>
                          <div className="mt-1 font-mono text-[10px] text-slate-400 tabular-nums">
                            {n.timestamp}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Downloadable Report Menu */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen((v) => !v);
                  setNotificationsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export Report
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Download Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Download JSON (.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      window.print();
                    }}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={handleRunAssessment}
              disabled={isAssessing}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isAssessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isAssessing ? 'Assessing...' : 'Run Assessment'}
            </button>
          </div>
        </header>

        {/* Active Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {activeTab === 'overview' && (
            <OverviewView
              release={activeRelease}
              assessment={activeAssessment}
              isAssessmentStale={isStale}
              isAssessing={isAssessing}
              assessmentError={assessmentError}
              chatMessages={activeChat}
              isAsking={isAsking}
              askError={askError}
              onRunAssessment={handleRunAssessment}
              onNavigateTab={setActiveTab}
              onOpenUpload={() =>
                setImportModalState({ open: true, target: 'AUTO', mode: 'file' })
              }
              onAskQuestion={handleAskQuestion}
              onRecordApproval={handleRecordApproval}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              release={activeRelease}
              onDeleteDocument={(docId) =>
                updateActiveRelease(
                  (rel) => ({
                    ...rel,
                    documents: rel.documents.filter((d) => d.id !== docId),
                  }),
                  { action: 'DOCUMENT_REMOVED', detail: `Removed document ${docId}.` }
                )
              }
              onOpenUpload={() =>
                setImportModalState({ open: true, target: 'AUTO', mode: 'file' })
              }
            />
          )}

          {activeTab === 'tests' && (
            <TestsView
              release={activeRelease}
              onUpdateTests={(tests) =>
                updateActiveRelease((rel) => ({ ...rel, tests }), {
                  action: 'TESTS_UPDATED',
                  detail: `Updated test results (${tests.filter((t) => t.status === 'PASS').length}/${tests.length} passing).`,
                })
              }
              onOpenImport={() =>
                setImportModalState({ open: true, target: 'tests', mode: 'file' })
              }
            />
          )}

          {activeTab === 'bugs' && (
            <BugsView
              release={activeRelease}
              onUpdateBugs={(bugs) =>
                updateActiveRelease((rel) => ({ ...rel, bugs }), {
                  action: 'BUGS_UPDATED',
                  detail: `Updated bug reports (${bugs.filter((b) => b.status === 'OPEN').length} open).`,
                })
              }
              onOpenImport={() =>
                setImportModalState({ open: true, target: 'bugs', mode: 'file' })
              }
            />
          )}

          {activeTab === 'security' && (
            <SecurityReportsView
              release={activeRelease}
              onUpdateSecurity={(securityReports) =>
                updateActiveRelease((rel) => ({ ...rel, securityReports }), {
                  action: 'SECURITY_UPDATED',
                  detail: `Updated security reports (${securityReports.filter((s) => s.status === 'OPEN').length} open).`,
                })
              }
              onOpenImport={() =>
                setImportModalState({ open: true, target: 'security', mode: 'file' })
              }
            />
          )}

          {activeTab === 'requirements' && (
            <RequirementsView
              release={activeRelease}
              onUpdateRequirements={(requirements) =>
                updateActiveRelease((rel) => ({ ...rel, requirements }), {
                  action: 'REQUIREMENTS_UPDATED',
                  detail: `Updated release requirements (${requirements.length} total).`,
                })
              }
              onOpenImport={() =>
                setImportModalState({ open: true, target: 'requirements', mode: 'file' })
              }
            />
          )}

          {activeTab === 'checklist' && (
            <ChecklistView
              release={activeRelease}
              onUpdateChecklist={(checklist) =>
                updateActiveRelease((rel) => ({ ...rel, checklist }), {
                  action: 'CHECKLIST_UPDATED',
                  detail: `Updated deployment checklist (${checklist.filter((c) => c.completed).length}/${checklist.length} done).`,
                })
              }
              onOpenImport={() =>
                setImportModalState({ open: true, target: 'checklist', mode: 'file' })
              }
            />
          )}

          {activeTab === 'policies' && (
            <PoliciesView
              policies={workspace.policies}
              onUpdatePolicies={(policies) =>
                setWorkspace((prev) => ({
                  ...prev,
                  policies,
                  staleMap: {
                    ...prev.staleMap,
                    [activeRelease.id]: Boolean(prev.assessments[activeRelease.id]),
                  },
                }))
              }
            />
          )}

          {activeTab === 'compare' && (
            <CompareVersionsView
              releases={workspace.releases}
              assessments={workspace.assessments}
            />
          )}

          {activeTab === 'audit' && (
            <AuditCollaborationView
              release={activeRelease}
              onAddComment={handleAddComment}
              onRecordApproval={handleRecordApproval}
            />
          )}

          {activeTab === 'integrations' && <IntegrationsRoadmapView />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <ImportArtifactsModal
        key={`${importModalState.target}-${importModalState.mode}`}
        isOpen={importModalState.open}
        defaultTarget={importModalState.target}
        defaultMode={importModalState.mode}
        existingReqIds={activeRelease.requirements.map((r) => r.id)}
        onClose={() => setImportModalState((prev) => ({ ...prev, open: false }))}
        onImportPayload={handleImportPayload}
      />

      <NewReleaseModal
        isOpen={newReleaseOpen}
        onClose={() => setNewReleaseOpen(false)}
        onCreate={handleCreateRelease}
      />

      <ChatAssistantDrawer
        isOpen={chatDrawerOpen}
        release={activeRelease}
        messages={activeChat}
        isAsking={isAsking}
        askError={askError}
        onClose={() => setChatDrawerOpen(false)}
        onAsk={handleAskQuestion}
      />
    </div>
  );
}
