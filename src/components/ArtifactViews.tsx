import { useState } from 'react';
import { FileInput, FileText, Plus, Search, Trash2, Upload } from 'lucide-react';
import type {
  BugSeverity,
  BugStatus,
  ChecklistCategory,
  ChecklistItem,
  IssueSeverity,
  KnownBug,
  ReleaseCandidate,
  ReleaseRequirement,
  ReqPriority,
  SecurityFinding,
  SecurityFindingStatus,
  TestStatus,
  TestSuiteResult,
  UploadedDocument,
} from '../types/release';
import {
  BugStatusLabel,
  SecurityStatusLabel,
  SeverityLabel,
  TestStatusLabel,
} from './StatusBadge';

/* -------------------------------------------------------------------------- */
/* 1. TEST RESULTS VIEW                                                       */
/* -------------------------------------------------------------------------- */

interface TestsViewProps {
  release: ReleaseCandidate;
  onUpdateTests: (tests: TestSuiteResult[]) => void;
  onOpenImport: () => void;
}

export function TestsView({ release, onUpdateTests, onOpenImport }: TestsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TestStatus>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [newSuite, setNewSuite] = useState('Integration Suite');
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<TestStatus>('PASS');
  const [newEnv, setNewEnv] = useState('staging-us-east');
  const [newReqId, setNewReqId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filtered = release.tests.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.suite.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  function handleStatusChange(id: string, status: TestStatus) {
    onUpdateTests(release.tests.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function handleDelete(id: string) {
    onUpdateTests(release.tests.filter((t) => t.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const nextNum = release.tests.length + 201;
    const created: TestSuiteResult = {
      id: `TEST-${nextNum}`,
      suite: newSuite.trim() || 'General',
      name: newName.trim(),
      status: newStatus,
      durationMs: 2400,
      coveragePct: 90.0,
      environment: newEnv.trim() || 'staging',
      linkedReqIds: newReqId ? [newReqId] : [],
      sourceDocument: 'manual-entry',
      notes: newNotes.trim() || undefined,
    };
    onUpdateTests([created, ...release.tests]);
    setNewName('');
    setNewNotes('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Test Suite Reports</h1>
          <p className="text-xs text-slate-500">
            Update test statuses inline to simulate re-runs, or upload JUnit/XML/CSV/TXT reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileInput className="h-3.5 w-3.5" aria-hidden="true" />
            Upload / Import
          </button>
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Test
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={newSuite}
            onChange={(e) => setNewSuite(e.target.value)}
            placeholder="Suite name"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-2"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Test case description *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-2"
          />
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as TestStatus)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="FLAKY">FLAKY</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
          <select
            value={newReqId}
            onChange={(e) => setNewReqId(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          >
            <option value="">No Req Link</option>
            {release.requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newEnv}
            onChange={(e) => setNewEnv(e.target.value)}
            placeholder="Environment"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 sm:col-span-2"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Execution notes or failure trace"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
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

      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by ID, suite, or test name..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
          {(['ALL', 'PASS', 'FAIL', 'FLAKY', 'SKIPPED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No test results found</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a test case or upload a test report file (XML, CSV, JSON, PDF, TXT).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Test & Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Env</th>
                <th className="px-4 py-3 font-medium">Linked Reqs</th>
                <th className="px-4 py-3 text-right font-medium">Coverage</th>
                <th className="px-4 py-3 text-right font-medium">Duration</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 align-top font-mono font-medium text-slate-700 tabular-nums whitespace-nowrap">
                    {test.id}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="text-[11px] text-slate-500">
                      {test.suite}
                      {test.sourceDocument ? ` · ${test.sourceDocument}` : ''}
                    </div>
                    <div className="font-medium text-slate-900">{test.name}</div>
                    {test.notes && (
                      <div className="mt-1 max-w-md text-slate-600">{test.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      <TestStatusLabel status={test.status} />
                      <select
                        aria-label={`Change status for ${test.id}`}
                        value={test.status}
                        onChange={(e) => handleStatusChange(test.id, e.target.value as TestStatus)}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 focus:border-slate-500 focus:outline-none"
                      >
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                        <option value="FLAKY">FLAKY</option>
                        <option value="SKIPPED">SKIPPED</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-600 whitespace-nowrap">
                    {test.environment}
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-700 whitespace-nowrap">
                    {test.linkedReqIds.length > 0 ? test.linkedReqIds.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {test.coveragePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {(test.durationMs / 1000).toFixed(1)}s
                  </td>
                  <td className="px-6 py-3.5 align-top text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(test.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                      aria-label={`Remove ${test.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. KNOWN BUGS VIEW                                                         */
/* -------------------------------------------------------------------------- */

interface BugsViewProps {
  release: ReleaseCandidate;
  onUpdateBugs: (bugs: KnownBug[]) => void;
  onOpenImport: () => void;
}

export function BugsView({ release, onUpdateBugs, onOpenImport }: BugsViewProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | BugSeverity>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('P1');
  const [status, setStatus] = useState<BugStatus>('OPEN');
  const [component, setComponent] = useState('');
  const [linkedReq, setLinkedReq] = useState('');
  const [workaround, setWorkaround] = useState('');

  const filtered = release.bugs.filter((b) => {
    const matchesSev = severityFilter === 'ALL' || b.severity === severityFilter;
    const q = search.trim().toLowerCase();
    const matchesQ =
      !q ||
      b.id.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q) ||
      b.component.toLowerCase().includes(q);
    return matchesSev && matchesQ;
  });

  function handleUpdateStatus(id: string, nextStatus: BugStatus) {
    onUpdateBugs(release.bugs.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)));
  }

  function handleDelete(id: string) {
    onUpdateBugs(release.bugs.filter((b) => b.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created: KnownBug = {
      id: `BUG-${release.bugs.length + 501}`,
      title: title.trim(),
      severity,
      status,
      component: component.trim() || 'core-service',
      linkedReqIds: linkedReq ? [linkedReq] : [],
      workaround: workaround.trim() || 'No documented workaround.',
      reportedBy: 'Release Triage',
      sourceDocument: 'manual-entry',
    };
    onUpdateBugs([created, ...release.bugs]);
    setTitle('');
    setComponent('');
    setWorkaround('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Bug Reports & Defects</h1>
          <p className="text-xs text-slate-500">
            Mark defects fixed or deferred to observe how the readiness verdict recalculates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileInput className="h-3.5 w-3.5" aria-hidden="true" />
            Upload / Import
          </button>
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Log Bug
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bug title *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as BugSeverity)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          >
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BugStatus)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="FIXED">FIXED</option>
            <option value="DEFERRED">DEFERRED</option>
          </select>
          <select
            value={linkedReq}
            onChange={(e) => setLinkedReq(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          >
            <option value="">No Req Link</option>
            {release.requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            placeholder="Component (e.g. billing-api)"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 sm:col-span-2"
          />
          <input
            type="text"
            value={workaround}
            onChange={(e) => setWorkaround(e.target.value)}
            placeholder="Workaround or mitigation notes"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
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

      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by ID, summary, or component..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
          {(['ALL', 'P0', 'P1', 'P2', 'P3'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                severityFilter === sev
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No known bugs recorded</p>
          <p className="mt-1 text-xs text-slate-500">
            Log an open defect or upload a CSV/JSON/PDF bug report.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Summary & Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-4 py-3 font-medium">Linked Reqs</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((bug) => (
                <tr key={bug.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 align-top font-mono font-medium text-slate-700 whitespace-nowrap">
                    {bug.id}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <SeverityLabel severity={bug.severity} />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-medium text-slate-900">{bug.title}</div>
                    <div className="mt-1 max-w-md text-slate-600">
                      Workaround: {bug.workaround}
                      {bug.sourceDocument ? (
                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                          · {bug.sourceDocument}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      <BugStatusLabel status={bug.status} />
                      <select
                        aria-label={`Change status for ${bug.id}`}
                        value={bug.status}
                        onChange={(e) => handleUpdateStatus(bug.id, e.target.value as BugStatus)}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 focus:border-slate-500 focus:outline-none"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="FIXED">FIXED</option>
                        <option value="DEFERRED">DEFERRED</option>
                        <option value="WONT_FIX">WONT_FIX</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-600 whitespace-nowrap">
                    {bug.component}
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-700 whitespace-nowrap">
                    {bug.linkedReqIds.length > 0 ? bug.linkedReqIds.join(', ') : '—'}
                  </td>
                  <td className="px-6 py-3.5 align-top text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(bug.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                      aria-label={`Delete ${bug.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. SECURITY REPORTS VIEW                                                   */
/* -------------------------------------------------------------------------- */

interface SecurityReportsViewProps {
  release: ReleaseCandidate;
  onUpdateSecurity: (findings: SecurityFinding[]) => void;
  onOpenImport: () => void;
}

export function SecurityReportsView({
  release,
  onUpdateSecurity,
  onOpenImport,
}: SecurityReportsViewProps) {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IssueSeverity>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('HIGH');
  const [status, setStatus] = useState<SecurityFindingStatus>('OPEN');
  const [scanner, setScanner] = useState('Semgrep SAST');
  const [cweOrCve, setCweOrCve] = useState('');
  const [component, setComponent] = useState('');
  const [remediation, setRemediation] = useState('');

  const filtered = release.securityReports.filter(
    (s) => severityFilter === 'ALL' || s.severity === severityFilter
  );

  function handleStatusChange(id: string, next: SecurityFindingStatus) {
    onUpdateSecurity(
      release.securityReports.map((s) => (s.id === id ? { ...s, status: next } : s))
    );
  }

  function handleDelete(id: string) {
    onUpdateSecurity(release.securityReports.filter((s) => s.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created: SecurityFinding = {
      id: `SEC-${release.securityReports.length + 801}`,
      title: title.trim(),
      severity,
      status,
      scanner: scanner.trim() || 'Manual AppSec',
      cweOrCve: cweOrCve.trim() || 'Unclassified',
      component: component.trim() || 'core-api',
      remediation: remediation.trim() || 'Apply security patch prior to cutover.',
      sourceDocument: 'manual-entry',
    };
    onUpdateSecurity([created, ...release.securityReports]);
    setTitle('');
    setCweOrCve('');
    setComponent('');
    setRemediation('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Security Reports & Scans</h1>
          <p className="text-xs text-slate-500">
            SAST, DAST, container, and dependency scan findings cross-checked against release gates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileInput className="h-3.5 w-3.5" aria-hidden="true" />
            Upload Scan Report
          </button>
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Finding
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vulnerability or finding title *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          >
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SecurityFindingStatus)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="OPEN">OPEN</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="FIXED">FIXED</option>
            <option value="ACCEPTED_RISK">ACCEPTED_RISK</option>
          </select>
          <input
            type="text"
            value={cweOrCve}
            onChange={(e) => setCweOrCve(e.target.value)}
            placeholder="CVE / CWE"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          />
          <input
            type="text"
            value={scanner}
            onChange={(e) => setScanner(e.target.value)}
            placeholder="Scanner (e.g. Trivy)"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-2"
          />
          <input
            type="text"
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            placeholder="Component"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
          />
          <input
            type="text"
            value={remediation}
            onChange={(e) => setRemediation(e.target.value)}
            placeholder="Remediation or mitigation control"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-2"
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
        <div className="text-xs text-slate-500 tabular-nums">
          {release.securityReports.filter((s) => s.status === 'OPEN').length} open findings of{' '}
          {release.securityReports.length}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                severityFilter === sev
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No security findings recorded</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a SAST/DAST/SCA report in JSON, XML, CSV, PDF, or TXT format.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Finding & Remediation</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">CWE / CVE</th>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 align-top font-mono font-medium text-slate-700 whitespace-nowrap">
                    {item.id}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <SeverityLabel severity={item.severity} />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="text-[11px] text-slate-500">
                      {item.scanner}
                      {item.sourceDocument ? ` · ${item.sourceDocument}` : ''}
                    </div>
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 max-w-md text-slate-600">{item.remediation}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      <SecurityStatusLabel status={item.status} />
                      <select
                        aria-label={`Change status for ${item.id}`}
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value as SecurityFindingStatus)
                        }
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 focus:border-slate-500 focus:outline-none"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="MITIGATED">MITIGATED</option>
                        <option value="FIXED">FIXED</option>
                        <option value="ACCEPTED_RISK">ACCEPTED_RISK</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-700">
                    {item.cweOrCve}
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-slate-600 whitespace-nowrap">
                    {item.component}
                  </td>
                  <td className="px-6 py-3.5 align-top text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                      aria-label={`Delete ${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. RELEASE REQUIREMENTS VIEW                                               */
/* -------------------------------------------------------------------------- */

interface RequirementsViewProps {
  release: ReleaseCandidate;
  onUpdateRequirements: (reqs: ReleaseRequirement[]) => void;
  onOpenImport: () => void;
}

export function RequirementsView({
  release,
  onUpdateRequirements,
  onOpenImport,
}: RequirementsViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ReqPriority>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Core');
  const [priority, setPriority] = useState<ReqPriority>('MUST_HAVE');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [owner, setOwner] = useState('');

  const filtered = release.requirements.filter(
    (r) => priorityFilter === 'ALL' || r.priority === priorityFilter
  );

  function handlePriorityToggle(id: string) {
    onUpdateRequirements(
      release.requirements.map((r) =>
        r.id === id
          ? { ...r, priority: r.priority === 'MUST_HAVE' ? 'SHOULD_HAVE' : 'MUST_HAVE' }
          : r
      )
    );
  }

  function handleDelete(id: string) {
    onUpdateRequirements(release.requirements.filter((r) => r.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created: ReleaseRequirement = {
      id: `REQ-${release.requirements.length + 101}`,
      title: title.trim(),
      category: category.trim() || 'General',
      priority,
      acceptanceCriteria: acceptanceCriteria.trim() || 'Verified in staging pre-cutover.',
      owner: owner.trim() || 'Engineering',
      sourceDocument: 'manual-entry',
    };
    onUpdateRequirements([...release.requirements, created]);
    setTitle('');
    setAcceptanceCriteria('');
    setOwner('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Release Requirements</h1>
          <p className="text-xs text-slate-500">
            Acceptance criteria and priority gates cross-checked against test coverage and open bugs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileInput className="h-3.5 w-3.5" aria-hidden="true" />
            Upload / Import
          </button>
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Requirement
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Requirement title *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ReqPriority)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="MUST_HAVE">Must-Have</option>
            <option value="SHOULD_HAVE">Should-Have</option>
          </select>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          />
          <input
            type="text"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="Measurable acceptance criteria"
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

      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div className="text-xs text-slate-500 tabular-nums">
          Showing {filtered.length} of {release.requirements.length} requirements
        </div>
        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'MUST_HAVE', label: 'Must-Have' },
              { key: 'SHOULD_HAVE', label: 'Should-Have' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPriorityFilter(tab.key)}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                priorityFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No requirements defined</p>
          <p className="mt-1 text-xs text-slate-500">
            Add release acceptance criteria or upload a PRD PDF/TXT document.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map((req) => {
            const linkedTests = release.tests.filter((t) => t.linkedReqIds.includes(req.id));
            const linkedBugs = release.bugs.filter((b) => b.linkedReqIds.includes(req.id));

            return (
              <div
                key={req.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-900">{req.id}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-600">{req.category}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePriorityToggle(req.id)}
                      className={`font-medium underline-offset-2 hover:underline ${
                        req.priority === 'MUST_HAVE' ? 'text-red-700' : 'text-slate-600'
                      }`}
                      title="Click to toggle Must-Have vs Should-Have"
                    >
                      {req.priority === 'MUST_HAVE' ? 'Must-Have' : 'Should-Have'}
                    </button>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500">Owner: {req.owner}</span>
                    {req.sourceDocument && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {req.sourceDocument}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">{req.title}</h2>
                  <p className="max-w-3xl text-xs leading-relaxed text-slate-600">
                    {req.acceptanceCriteria}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4 text-xs text-slate-500">
                  <div className="text-right font-mono tabular-nums">
                    <div>{linkedTests.length} linked tests</div>
                    <div>{linkedBugs.length} linked bugs</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(req.id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                    aria-label={`Delete ${req.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. DEPLOYMENT CHECKLIST VIEW                                               */
/* -------------------------------------------------------------------------- */

interface ChecklistViewProps {
  release: ReleaseCandidate;
  onUpdateChecklist: (items: ChecklistItem[]) => void;
  onOpenImport: () => void;
}

export function ChecklistView({
  release,
  onUpdateChecklist,
  onOpenImport,
}: ChecklistViewProps) {
  const [catFilter, setCatFilter] = useState<'ALL' | ChecklistCategory>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChecklistCategory>('ROLLBACK');
  const [requiredForGo, setRequiredForGo] = useState(true);
  const [owner, setOwner] = useState('');
  const [evidence, setEvidence] = useState('');

  const filtered = release.checklist.filter(
    (c) => catFilter === 'ALL' || c.category === catFilter
  );

  function toggleComplete(id: string) {
    onUpdateChecklist(
      release.checklist.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  }

  function handleEvidenceChange(id: string, nextEvidence: string) {
    onUpdateChecklist(
      release.checklist.map((c) => (c.id === id ? { ...c, evidence: nextEvidence } : c))
    );
  }

  function handleDelete(id: string) {
    onUpdateChecklist(release.checklist.filter((c) => c.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created: ChecklistItem = {
      id: `CHK-${String(release.checklist.length + 1).padStart(2, '0')}`,
      title: title.trim(),
      category,
      completed: false,
      requiredForGo,
      owner: owner.trim() || 'SRE',
      evidence: evidence.trim() || 'Pending verification.',
      sourceDocument: 'manual-entry',
    };
    onUpdateChecklist([...release.checklist, created]);
    setTitle('');
    setOwner('');
    setEvidence('');
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Deployment Checklist</h1>
          <p className="text-xs text-slate-500">
            Toggle pre-flight, migration, observability, and rollback verification gates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileInput className="h-3.5 w-3.5" aria-hidden="true" />
            Upload Runbook
          </button>
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Gate Item
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Deployment or rollback verification step *"
            required
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-3"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ChecklistCategory)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
            <option value="DATA_MIGRATION">DATA_MIGRATION</option>
            <option value="SECURITY">SECURITY</option>
            <option value="OBSERVABILITY">OBSERVABILITY</option>
            <option value="ROLLBACK">ROLLBACK</option>
          </select>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner"
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={requiredForGo}
              onChange={(e) => setRequiredForGo(e.target.checked)}
              className="rounded border-slate-300 text-slate-900"
            />
            Required for Go
          </label>
          <input
            type="text"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Evidence link or verification note"
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
        <div className="text-xs text-slate-500 tabular-nums">
          {release.checklist.filter((c) => c.completed).length} of {release.checklist.length}{' '}
          completed
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
          {(
            [
              'ALL',
              'INFRASTRUCTURE',
              'DATA_MIGRATION',
              'SECURITY',
              'OBSERVABILITY',
              'ROLLBACK',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                catFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No checklist items match</p>
          <p className="mt-1 text-xs text-slate-500">
            Add deployment verification gates or upload a runbook document.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/70">
              <input
                id={`chk-${item.id}`}
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleComplete(item.id)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-700">{item.id}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="font-medium text-slate-600">
                    {item.category.replace('_', ' ')}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className={item.requiredForGo ? 'font-medium text-red-700' : 'text-slate-500'}>
                    {item.requiredForGo ? 'Required Gate' : 'Optional'}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-slate-500">Owner: {item.owner}</span>
                  {item.sourceDocument && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {item.sourceDocument}
                      </span>
                    </>
                  )}
                </div>
                <label
                  htmlFor={`chk-${item.id}`}
                  className={`block cursor-pointer text-sm font-medium ${
                    item.completed ? 'text-slate-500 line-through' : 'text-slate-900'
                  }`}
                >
                  {item.title}
                </label>
                <input
                  type="text"
                  value={item.evidence}
                  onChange={(e) => handleEvidenceChange(item.id, e.target.value)}
                  aria-label={`Evidence for ${item.id}`}
                  className="w-full max-w-2xl rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                aria-label={`Delete ${item.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. UPLOADED DOCUMENTS REPOSITORY VIEW                                      */
/* -------------------------------------------------------------------------- */

interface DocumentsViewProps {
  release: ReleaseCandidate;
  onDeleteDocument: (docId: string) => void;
  onOpenUpload: () => void;
}

export function DocumentsView({
  release,
  onDeleteDocument,
  onOpenUpload,
}: DocumentsViewProps) {
  const [formatFilter, setFormatFilter] = useState<'ALL' | UploadedDocument['format']>('ALL');

  const filtered = release.documents.filter(
    (d) => formatFilter === 'ALL' || d.format === formatFilter
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Source Documents Repository</h1>
          <p className="text-xs text-slate-500">
            Uploaded PDF, CSV, JSON, XML, and TXT reports parsed and cross-checked by ShipShape
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Upload Document
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
        <div className="text-xs text-slate-500 tabular-nums">
          {filtered.length} document(s) attached to {release.version}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
          {(['ALL', 'PDF', 'CSV', 'JSON', 'XML', 'TXT'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(fmt)}
              className={`rounded px-2.5 py-1 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                formatFilter === fmt
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No documents attached</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload test reports, bug exports, security scans, PRDs, or deployment checklists in PDF,
            CSV, JSON, XML, or TXT format.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-6 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Extracted Scope</th>
                <th className="px-4 py-3 text-right font-medium">Records</th>
                <th className="px-4 py-3 text-right font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded At</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {doc.filename}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700">{doc.format}</td>
                  <td className="px-4 py-3.5 text-slate-600">{doc.streamSummary}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                    {doc.extractedCount}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-500 tabular-nums">
                    {(doc.sizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                    {doc.uploadedAt}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                      aria-label={`Remove ${doc.filename}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
