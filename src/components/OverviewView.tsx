import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import type {
  AgentChatMessage,
  ApprovalState,
  IssueSeverity,
  ReleaseAssessment,
  ReleaseCandidate,
} from '../types/release';
import {
  DimensionStatusLabel,
  PolicyStatusLabel,
  SeverityLabel,
  TraceStatusLabel,
  VerdictIndicator,
} from './StatusBadge';

export type WorkspaceTab =
  | 'overview'
  | 'documents'
  | 'tests'
  | 'bugs'
  | 'security'
  | 'requirements'
  | 'checklist'
  | 'policies'
  | 'compare'
  | 'audit'
  | 'integrations';

interface OverviewViewProps {
  release: ReleaseCandidate;
  assessment: ReleaseAssessment | null;
  isAssessmentStale: boolean;
  isAssessing: boolean;
  assessmentError: string | null;
  chatMessages: AgentChatMessage[];
  isAsking: boolean;
  askError: string | null;
  onRunAssessment: () => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenUpload: () => void;
  onAskQuestion: (question: string) => void;
  onRecordApproval: (state: ApprovalState, note: string) => void;
}

function getTabForArtifactRef(refId: string): WorkspaceTab {
  const upper = refId.toUpperCase();
  if (upper.startsWith('TEST-')) return 'tests';
  if (upper.startsWith('BUG-')) return 'bugs';
  if (upper.startsWith('SEC-')) return 'security';
  if (upper.startsWith('REQ-')) return 'requirements';
  if (upper.startsWith('CHK-')) return 'checklist';
  return 'overview';
}

export function OverviewView({
  release,
  assessment,
  isAssessmentStale,
  isAssessing,
  assessmentError,
  chatMessages,
  isAsking,
  askError,
  onRunAssessment,
  onNavigateTab,
  onOpenUpload,
  onAskQuestion,
  onRecordApproval,
}: OverviewViewProps) {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IssueSeverity>('ALL');
  const [questionInput, setQuestionInput] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const passedTests = release.tests.filter((t) => t.status === 'PASS').length;
  const failingOrFlakyTests = release.tests.filter(
    (t) => t.status === 'FAIL' || t.status === 'FLAKY'
  ).length;
  const openBugs = release.bugs.filter(
    (b) => b.status === 'OPEN' || b.status === 'IN_PROGRESS'
  ).length;
  const openSecurityCriticalHigh = release.securityReports.filter(
    (s) => s.status === 'OPEN' && (s.severity === 'CRITICAL' || s.severity === 'HIGH')
  ).length;
  const completedChecklist = release.checklist.filter((c) => c.completed).length;
  const requiredRemaining = release.checklist.filter(
    (c) => c.requiredForGo && !c.completed
  ).length;

  const filteredFindings = (assessment?.findings ?? []).filter((f) => {
    if (severityFilter === 'ALL') return true;
    return f.severity === severityFilter;
  });

  function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!questionInput.trim() || isAsking) return;
    onAskQuestion(questionInput.trim());
    setQuestionInput('');
  }

  const starterQuestions = [
    'Which single finding creates the highest production blast radius?',
    'What exact actions would shift this verdict to GO?',
    'Summarize contradictions across test results, bugs, and security scans.',
  ];

  return (
    <div className="space-y-6">
      {/* Release Header & 5-Stream Evidence Strip */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {release.version}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                  <GitBranch className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {release.branch}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-500 tabular-nums">{release.commitSha}</span>
                <span aria-hidden="true">·</span>
                <span>{release.targetEnvironment}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{release.targetWindow}</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {release.name}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                {release.summary}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
              <div className="text-xs text-slate-500">
                Lead: <span className="font-medium text-slate-900">{release.releaseManager}</span>
                <span aria-hidden="true" className="mx-1.5 text-slate-300">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('documents')}
                  className="font-mono text-slate-700 underline-offset-2 hover:underline"
                >
                  {release.documents.length} source docs
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Upload Reports (PDF, CSV, JSON, XML, TXT)
              </button>
            </div>
          </div>
        </div>

        {/* 5-Column Evidence Inventory Strip */}
        <div className="grid grid-cols-2 divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          <button
            type="button"
            onClick={() => onNavigateTab('tests')}
            className="group flex flex-col items-start px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex w-full items-center justify-between text-xs text-slate-500">
              <span>Test Reports</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {passedTests}/{release.tests.length}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {failingOrFlakyTests} failing/flaky
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('bugs')}
            className="group flex flex-col items-start px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex w-full items-center justify-between text-xs text-slate-500">
              <span>Bug Reports</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {openBugs}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                unresolved of {release.bugs.length}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('security')}
            className="group flex flex-col items-start px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex w-full items-center justify-between text-xs text-slate-500">
              <span>Security Scans</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {openSecurityCriticalHigh}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                open Crit/High ({release.securityReports.length} total)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('requirements')}
            className="group flex flex-col items-start px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex w-full items-center justify-between text-xs text-slate-500">
              <span>Requirements</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {release.requirements.length}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {release.requirements.filter((r) => r.priority === 'MUST_HAVE').length} must-have
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('checklist')}
            className="group col-span-2 flex flex-col items-start px-5 py-3.5 text-left transition-colors hover:bg-slate-50 sm:col-span-1"
          >
            <div className="flex w-full items-center justify-between text-xs text-slate-500">
              <span>Checklist Gates</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {completedChecklist}/{release.checklist.length}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {requiredRemaining} required open
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Assessment Error */}
      {assessmentError && (
        <section className="rounded-lg border border-red-200 bg-red-50 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-red-900">
                  Release Assessment Could Not Complete
                </h2>
                <p className="mt-0.5 text-xs text-red-700">{assessmentError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRunAssessment}
              className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-medium text-red-800 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              Retry Assessment
            </button>
          </div>
        </section>
      )}

      {/* Loading Skeleton */}
      {isAssessing && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-700" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900">
                Cross-checking test reports, bug triage, security scans, requirements, checklist
                gates, and release policies...
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="space-y-2 px-5 py-4">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unassessed State */}
      {!isAssessing && !assessment && !assessmentError && (
        <section className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
          <div className="mx-auto max-w-xl space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Ready to Cross-Check Release Evidence
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              ShipShape evaluates test reports, bug reports, security scans, release requirements,
              deployment checklists, and custom release policies together—producing a{' '}
              <strong>GO</strong>, <strong>NO-GO</strong>, or <strong>INCONCLUSIVE</strong>{' '}
              assessment with document-level citations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onRunAssessment}
                disabled={
                  release.tests.length === 0 &&
                  release.bugs.length === 0 &&
                  release.securityReports.length === 0 &&
                  release.requirements.length === 0 &&
                  release.checklist.length === 0
                }
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Run Readiness Assessment
              </button>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Upload Reports
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Populated Assessment State */}
      {!isAssessing && assessment && (
        <>
          {isAssessmentStale && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-amber-900">
                Release artifacts or policies were modified after the last assessment. Re-run to
                update the verdict and compliance matrix.
              </p>
              <button
                type="button"
                onClick={onRunAssessment}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Re-run Assessment
              </button>
            </div>
          )}

          {/* Primary Verdict, Approval Bar & 5-Dimension Strip */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <VerdictIndicator verdict={assessment.verdict} />
                  <span className="text-xs text-slate-500">
                    Confidence:{' '}
                    <strong className="font-medium text-slate-800">
                      {assessment.confidenceLevel}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-xs text-slate-500">
                    Human Sign-Off:{' '}
                    <strong
                      className={`font-medium ${
                        release.approvalState === 'APPROVED'
                          ? 'text-emerald-700'
                          : release.approvalState === 'REJECTED'
                            ? 'text-red-700'
                            : 'text-slate-800'
                      }`}
                    >
                      {release.approvalState}
                    </strong>
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  Assessed {new Date(assessment.assessedAt).toLocaleString()}
                </div>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-700">
                {assessment.executiveSummary}
              </p>

              {/* Human Approval Gate Bar */}
              <div className="mt-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Add human sign-off or rejection rationale (logged to audit trail)..."
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRecordApproval('APPROVED', approvalNote);
                      setApprovalNote('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Approve Release
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordApproval('REJECTED', approvalNote);
                      setApprovalNote('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Block Release
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
              {assessment.dimensions.map((dim) => (
                <div key={dim.dimension} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">{dim.dimension}</span>
                    <DimensionStatusLabel status={dim.status} />
                  </div>
                  <div className="mt-1.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {dim.headlineMetric}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{dim.summary}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Mandatory Release Conditions & Policy Verification */}
          {assessment.policyEvaluations && assessment.policyEvaluations.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Release Policy & Mandatory Gate Verification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Automated verification of organizational release gates
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('policies')}
                  className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                >
                  Configure Policies
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {assessment.policyEvaluations.map((pol) => (
                  <div
                    key={pol.policyId}
                    className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-700">
                          {pol.policyId}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-medium text-slate-900">{pol.policyName}</span>
                        {pol.mandatory && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">Mandatory</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{pol.evidence}</p>
                    </div>
                    <div className="shrink-0">
                      <PolicyStatusLabel status={pol.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cross-Artifact Findings */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Cross-Artifact Findings & Source Citations
                </h2>
                <p className="text-xs text-slate-500">
                  Evidence-backed contradictions, blockers, and responsible source documents
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
                {(
                  [
                    { key: 'ALL', label: `All (${assessment.findings.length})` },
                    {
                      key: 'CRITICAL',
                      label: `Critical (${assessment.findings.filter((f) => f.severity === 'CRITICAL').length})`,
                    },
                    {
                      key: 'HIGH',
                      label: `High (${assessment.findings.filter((f) => f.severity === 'HIGH').length})`,
                    },
                    {
                      key: 'MEDIUM',
                      label: `Medium (${assessment.findings.filter((f) => f.severity === 'MEDIUM').length})`,
                    },
                    {
                      key: 'LOW',
                      label: `Low (${assessment.findings.filter((f) => f.severity === 'LOW').length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSeverityFilter(tab.key)}
                    className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      severityFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No findings match the selected severity filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredFindings.map((finding) => (
                  <div key={finding.id} className="px-6 py-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <SeverityLabel severity={finding.severity} />
                          <span className="font-mono text-slate-500 tabular-nums">
                            {finding.id}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-medium text-slate-600">{finding.category}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">{finding.title}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {finding.artifactRefs.map((refId) => (
                          <button
                            key={refId}
                            type="button"
                            onClick={() => onNavigateTab(getTabForArtifactRef(refId))}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-100 whitespace-nowrap"
                          >
                            {refId}
                          </button>
                        ))}
                      </div>
                    </div>

                    {finding.sourceDocuments && finding.sourceDocuments.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>Responsible documents:</span>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('documents')}
                          className="font-mono text-slate-700 underline-offset-2 hover:underline"
                        >
                          {finding.sourceDocuments.join(', ')}
                        </button>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <div className="text-[11px] font-medium text-slate-500">
                          Evidence-Backed Explanation
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-700">
                          {finding.analysis}
                        </p>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                        <div className="text-[11px] font-medium text-slate-500">
                          Corrective Action
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-800">
                          {finding.remediation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Requirement Traceability Matrix */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Requirement-to-Evidence Traceability
              </h2>
              <p className="text-xs text-slate-500">
                Verification posture for every release requirement across tests, bugs, and cutover
                checks
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Requirement</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Linked Tests</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Linked Bugs</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Checklist</th>
                    <th className="px-6 py-3 font-medium">Assessment Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assessment.traceability.map((row) => (
                    <tr key={row.reqId} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('requirements')}
                          className="font-mono font-semibold text-slate-900 hover:underline"
                        >
                          {row.reqId}
                        </button>
                        <div className="mt-0.5 max-w-xs font-medium text-slate-700">
                          {row.reqTitle}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <TraceStatusLabel status={row.status} />
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-slate-600">
                        {row.linkedTests.length > 0 ? row.linkedTests.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-slate-600">
                        {row.linkedBugs.length > 0 ? row.linkedBugs.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-slate-600">
                        {row.linkedChecklist.length > 0 ? row.linkedChecklist.join(', ') : '—'}
                      </td>
                      <td className="px-6 py-3.5 align-top leading-relaxed text-slate-600">
                        {row.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom Split: Sign-Off Conditions + Ask Release Agent */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-lg border border-slate-200 bg-white lg:col-span-5">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
                <CheckSquare className="h-4 w-4 text-slate-700" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Recommended Corrective Actions
                </h2>
              </div>
              <ol className="divide-y divide-slate-200">
                {assessment.signOffConditions.map((condition, idx) => (
                  <li key={idx} className="flex items-start gap-3 px-6 py-3.5 text-xs">
                    <span className="mt-0.5 font-mono font-semibold text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="leading-relaxed text-slate-700">{condition}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="flex flex-col rounded-lg border border-slate-200 bg-white lg:col-span-7">
              <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-700" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Release Assessment Assistant
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ask questions about blockers, responsible documents, policy compliance, or what-if
                  scenarios.
                </p>
              </div>

              <div className="flex-1 space-y-3 px-6 py-4">
                {chatMessages.length === 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500">Suggested queries</div>
                    <div className="flex flex-col gap-2">
                      {starterQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onAskQuestion(q)}
                          disabled={isAsking}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <span>{q}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'ml-8 border border-slate-200 bg-slate-100 text-slate-900'
                            : 'mr-4 border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <div className="mb-1 font-mono text-[10px] font-semibold text-slate-500">
                          {msg.role === 'user' ? 'YOU' : 'SHIPSHAPE AGENT'} · {msg.timestamp}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                {askError && (
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {askError}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleAskSubmit}
                className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg"
              >
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Ask about any test, bug, CVE, policy, or document..."
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || isAsking}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isAsking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Ask
                </button>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
