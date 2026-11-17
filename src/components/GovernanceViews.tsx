import { useState } from 'react';
import {
  CheckCircle2,
  GitCompare,
  History,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  ApprovalState,
  ReleaseAssessment,
  ReleaseCandidate,
  ReleasePolicy,
} from '../types/release';
import { VerdictIndicator } from './StatusBadge';

/* -------------------------------------------------------------------------- */
/* 1. CUSTOM RELEASE POLICIES VIEW                                            */
/* -------------------------------------------------------------------------- */

interface PoliciesViewProps {
  policies: ReleasePolicy[];
  onUpdatePolicies: (policies: ReleasePolicy[]) => void;
}

export function PoliciesView({ policies, onUpdatePolicies }: PoliciesViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReleasePolicy['category']>('SECURITY');
  const [mandatory, setMandatory] = useState(true);

  function toggleEnabled(id: string) {
    onUpdatePolicies(policies.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  function toggleMandatory(id: string) {
    onUpdatePolicies(
      policies.map((p) => (p.id === id ? { ...p, mandatory: !p.mandatory } : p))
    );
  }

  function deletePolicy(id: string) {
    onUpdatePolicies(policies.filter((p) => p.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const created: ReleasePolicy = {
      id: `POL-${String(policies.length + 1).padStart(2, '0')}`,
      name: name.trim(),
      description: description.trim() || 'Custom release policy evaluated prior to approval.',
      category,
      enabled: true,
      mandatory,
    };
    onUpdatePolicies([...policies, created]);
    setName('');
    setDescription('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Custom Release Requirements & Policies
          </h1>
          <p className="text-xs text-slate-500">
            Define mandatory release conditions verified automatically during every readiness
            assessment
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Policy Rule
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Policy title (e.g. Zero unmitigated High CVEs) *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReleasePolicy['category'])}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="TESTING">TESTING</option>
            <option value="DEFECTS">DEFECTS</option>
            <option value="SECURITY">SECURITY</option>
            <option value="REQUIREMENTS">REQUIREMENTS</option>
            <option value="DEPLOYMENT">DEPLOYMENT</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="rounded border-slate-300 text-slate-900"
            />
            Mandatory Release Blocker
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Verification rule description for the AI gatekeeper"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-5"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-200">
        {policies.map((pol) => (
          <div
            key={pol.id}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3.5">
              <input
                id={`pol-${pol.id}`}
                type="checkbox"
                checked={pol.enabled}
                onChange={() => toggleEnabled(pol.id)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-800">{pol.id}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-slate-600">{pol.category}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleMandatory(pol.id)}
                    className={`font-medium underline-offset-2 hover:underline ${
                      pol.mandatory ? 'text-red-700' : 'text-slate-500'
                    }`}
                  >
                    {pol.mandatory ? 'Mandatory Gate' : 'Advisory'}
                  </button>
                </div>
                <label
                  htmlFor={`pol-${pol.id}`}
                  className={`block cursor-pointer text-sm font-semibold ${
                    pol.enabled ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {pol.name}
                </label>
                <p className="max-w-3xl text-xs text-slate-600">{pol.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deletePolicy(pol.id)}
              className="self-end rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700 sm:self-center"
              aria-label={`Delete ${pol.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. COMPARE VERSIONS VIEW                                                   */
/* -------------------------------------------------------------------------- */

interface CompareVersionsViewProps {
  releases: ReleaseCandidate[];
  assessments: Record<string, ReleaseAssessment>;
}

export function CompareVersionsView({ releases, assessments }: CompareVersionsViewProps) {
  const [releaseAId, setReleaseAId] = useState(releases[0]?.id ?? '');
  const [releaseBId, setReleaseBId] = useState(releases[1]?.id ?? releases[0]?.id ?? '');
  const [aiComparison, setAiComparison] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const relA = releases.find((r) => r.id === releaseAId) ?? releases[0];
  const relB = releases.find((r) => r.id === releaseBId) ?? releases[0];

  function metricsFor(rel: ReleaseCandidate) {
    const passed = rel.tests.filter((t) => t.status === 'PASS').length;
    const passPct = rel.tests.length > 0 ? Math.round((passed / rel.tests.length) * 100) : 0;
    const openBugs = rel.bugs.filter((b) => b.status === 'OPEN' || b.status === 'IN_PROGRESS').length;
    const critBugs = rel.bugs.filter(
      (b) => (b.severity === 'P0' || b.severity === 'P1') && b.status !== 'FIXED'
    ).length;
    const openSecCritHigh = rel.securityReports.filter(
      (s) => s.status === 'OPEN' && (s.severity === 'CRITICAL' || s.severity === 'HIGH')
    ).length;
    const chkDone = rel.checklist.filter((c) => c.completed).length;
    return {
      testsSummary: `${passed}/${rel.tests.length} (${passPct}%)`,
      openBugs: `${openBugs} (${critBugs} P0/P1)`,
      securityOpen: `${openSecCritHigh} Crit/High open`,
      requirements: `${rel.requirements.length} (${rel.requirements.filter((r) => r.priority === 'MUST_HAVE').length} must-have)`,
      checklist: `${chkDone}/${rel.checklist.length} done`,
      verdict: assessments[rel.id]?.verdict ?? rel.history[0]?.verdict ?? 'UNASSESSED',
      approval: rel.approvalState,
    };
  }

  const mA = metricsFor(relA);
  const mB = metricsFor(relB);

  async function handleRunComparison() {
    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseA: relA, releaseB: relB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed.');
      setAiComparison(data.analysis);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Unable to compare versions.');
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Release Version Comparison
            </h1>
            <p className="text-xs text-slate-500">
              Compare test stability, unresolved defects, security posture, and deployment gates
              across versions
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunComparison}
            disabled={isComparing || !relA || !relB}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            {isComparing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isComparing ? 'Analyzing Delta...' : 'Run AI Version Diff'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cmp-a" className="mb-1 block text-xs font-medium text-slate-600">
              Baseline Release (A)
            </label>
            <select
              id="cmp-a"
              value={relA.id}
              onChange={(e) => setReleaseAId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            >
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version} — {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cmp-b" className="mb-1 block text-xs font-medium text-slate-600">
              Target Release (B)
            </label>
            <select
              id="cmp-b"
              value={relB.id}
              onChange={(e) => setReleaseBId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            >
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version} — {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-3 font-medium">Readiness Dimension</th>
                <th className="px-6 py-3 font-mono font-semibold text-slate-900">
                  {relA.version} ({relA.branch})
                </th>
                <th className="px-6 py-3 font-mono font-semibold text-slate-900">
                  {relB.version} ({relB.branch})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Assessment Verdict</td>
                <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">{mA.verdict}</td>
                <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">{mB.verdict}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Human Approval</td>
                <td className="px-6 py-3.5 font-mono text-slate-700">{mA.approval}</td>
                <td className="px-6 py-3.5 font-mono text-slate-700">{mB.approval}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Test Pass Rate</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mA.testsSummary}
                </td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mB.testsSummary}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Unresolved Bugs</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">{mA.openBugs}</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">{mB.openBugs}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Security Scan Exposure</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mA.securityOpen}
                </td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mB.securityOpen}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Requirements Scope</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mA.requirements}
                </td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mB.requirements}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-700">Deployment Checklist</td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mA.checklist}
                </td>
                <td className="px-6 py-3.5 font-mono text-slate-800 tabular-nums">
                  {mB.checklist}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {compareError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700">
          {compareError}
        </div>
      )}

      {aiComparison && (
        <section className="rounded-lg border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900">
            AI Comparative Risk Analysis ({relA.version} vs {relB.version})
          </h2>
          <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
            {aiComparison}
          </div>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. AUDIT TRAIL, HISTORY & TEAM COLLABORATION VIEW                          */
/* -------------------------------------------------------------------------- */

interface AuditCollaborationViewProps {
  release: ReleaseCandidate;
  onAddComment: (comment: string, decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT') => void;
  onRecordApproval: (state: ApprovalState, note: string) => void;
}

export function AuditCollaborationView({
  release,
  onAddComment,
  onRecordApproval,
}: AuditCollaborationViewProps) {
  const [commentText, setCommentText] = useState('');
  const [decision, setDecision] = useState<'COMMENT' | 'APPROVED' | 'CHANGES_REQUESTED'>('COMMENT');

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText.trim(), decision);
    setCommentText('');
  }

  return (
    <div className="space-y-6">
      {/* Human Approval Status & Quick Actions */}
      <section className="rounded-lg border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Release History, Team Collaboration & Audit Trail
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Human approval status:{' '}
              <strong className="font-mono text-slate-900">{release.approvalState}</strong>
              {release.approvedBy ? ` · by ${release.approvedBy} (${release.approvedAt})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRecordApproval('APPROVED', 'Approved from collaboration view')}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Approve Release
            </button>
            <button
              type="button"
              onClick={() => onRecordApproval('REJECTED', 'Blocked from collaboration view')}
              className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Block Release
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Team Collaboration Thread */}
        <section className="flex flex-col rounded-lg border border-slate-200 bg-white lg:col-span-6">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <MessageSquare className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Team Review Notes</h2>
          </div>
          <div className="flex-1 divide-y divide-slate-200">
            {release.comments.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-slate-500">
                No team review comments logged yet.
              </div>
            ) : (
              release.comments.map((c) => (
                <div key={c.id} className="px-6 py-3.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      {c.author}{' '}
                      <span className="font-normal text-slate-500">· {c.role}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {c.timestamp}
                    </span>
                  </div>
                  {c.decision && c.decision !== 'COMMENT' && (
                    <div
                      className={`mt-1 font-mono text-[11px] font-semibold ${
                        c.decision === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {c.decision.replace('_', ' ')}
                    </div>
                  )}
                  <p className="mt-1 leading-relaxed text-slate-700">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleSubmitComment}
            className="space-y-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg"
          >
            <div className="flex items-center gap-2">
              <select
                value={decision}
                onChange={(e) =>
                  setDecision(e.target.value as 'COMMENT' | 'APPROVED' | 'CHANGES_REQUESTED')
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
              >
                <option value="COMMENT">Review Note</option>
                <option value="APPROVED">Sign-Off Approved</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
              </select>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Post a review note for QA, AppSec, or SRE..."
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-3 w-3" aria-hidden="true" />
                Post
              </button>
            </div>
          </form>
        </section>

        {/* Assessment History Snapshots */}
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-6">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <History className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Assessment History Snapshots</h2>
          </div>
          {release.history.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-slate-500">
              Run a readiness assessment to record the first historical snapshot for{' '}
              {release.version}.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {release.history.map((snap) => (
                <div key={snap.id} className="space-y-2 px-6 py-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <VerdictIndicator verdict={snap.verdict} />
                    <span className="font-mono text-slate-500 tabular-nums">
                      {new Date(snap.assessedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-700">{snap.summary}</p>
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] text-slate-500 tabular-nums">
                    <span>
                      Tests: {snap.metrics.testsPassed}/{snap.metrics.testsTotal}
                    </span>
                    <span>Open Bugs: {snap.metrics.openBugs}</span>
                    <span>Crit/High Sec: {snap.metrics.openSecurityCriticalHigh}</span>
                    <span>
                      Checklist: {snap.metrics.checklistCompleted}/{snap.metrics.checklistTotal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Immutable Audit Trail */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
          <Shield className="h-4 w-4 text-slate-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">Release Audit Trail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-2.5 font-medium">Timestamp</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-6 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {release.auditTrail.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {entry.actor}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                    {entry.action}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. INTEGRATIONS ROADMAP VIEW                                               */
/* -------------------------------------------------------------------------- */

export function IntegrationsRoadmapView() {
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const connectors = [
    {
      id: 'github',
      name: 'GitHub Actions & Pull Requests',
      scope: 'Automated CI test XML/JSON ingestion, PR merge status, and release tag commit diffs.',
      dataFlow: 'Webhooks + REST API -> Test Reports & Release Metadata',
      status: 'Planned Connector',
    },
    {
      id: 'gitlab',
      name: 'GitLab CI/CD & Security Dashboard',
      scope: 'Pipeline artifact synchronization for SAST/DAST/Container scan reports and merge approvals.',
      dataFlow: 'Pipeline Artifacts -> Security Reports & Test Results',
      status: 'Planned Connector',
    },
    {
      id: 'jira',
      name: 'Atlassian Jira',
      scope: 'Bi-directional sync of FixVersion blocker tickets (P0/P1), release requirements, and waiver status.',
      dataFlow: 'JQL Sync -> Known Bugs & Requirements',
      status: 'Planned Connector',
    },
    {
      id: 'slack',
      name: 'Slack Release Channels',
      scope: 'Real-time GO / NO-GO / INCONCLUSIVE alerts, policy violation digests, and approval threads.',
      dataFlow: 'Outbound Bot Webhooks -> Notifications & Sign-Off Alerts',
      status: 'Planned Connector',
    },
  ];

  function toggleNotify(id: string) {
    setRequestedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">
          Platform Integrations Roadmap
        </h1>
        <p className="text-xs text-slate-500">
          Upcoming automated connectors for real-time evidence collection and release alerts. In the
          current release, upload exported PDF, CSV, JSON, XML, or TXT artifacts directly.
        </p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
        {connectors.map((c, idx) => {
          const isSubscribed = requestedIds.includes(c.id);
          return (
            <div
              key={c.id}
              className={`flex flex-col justify-between gap-4 px-6 py-5 ${
                idx >= 2 ? 'md:border-t md:border-slate-200' : ''
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">{c.name}</h2>
                  <span className="font-mono text-[11px] text-slate-500">{c.status}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{c.scope}</p>
                <div className="font-mono text-[11px] text-slate-500">{c.dataFlow}</div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => toggleNotify(c.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSubscribed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isSubscribed ? 'Queued for Early Access' : 'Request Connector Access'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
