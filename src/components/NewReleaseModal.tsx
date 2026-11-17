import { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import type { ReleaseCandidate } from '../types/release';

interface NewReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (release: ReleaseCandidate) => void;
}

export function NewReleaseModal({ isOpen, onClose, onCreate }: NewReleaseModalProps) {
  const [version, setVersion] = useState('');
  const [name, setName] = useState('');
  const [targetEnvironment, setTargetEnvironment] = useState('Production US-East');
  const [targetWindow, setTargetWindow] = useState('2026-11-20 04:00 UTC');
  const [branch, setBranch] = useState('release/1.0.0-rc1');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim() || !name.trim()) {
      setError('Release version and title are required.');
      return;
    }

    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const newRelease: ReleaseCandidate = {
      id: `rel-${Date.now()}`,
      version: version.trim(),
      name: name.trim(),
      targetEnvironment: targetEnvironment.trim() || 'Production',
      targetWindow: targetWindow.trim() || 'TBD',
      releaseManager: 'Elena Vance',
      branch: branch.trim() || 'main',
      commitSha: Math.random().toString(16).slice(2, 9),
      approvalState: 'PENDING',
      summary:
        summary.trim() ||
        'Custom release candidate. Upload PDF, CSV, JSON, XML, or TXT reports—or add evidence manually—to run an assessment.',
      tests: [],
      bugs: [],
      requirements: [],
      checklist: [],
      securityReports: [],
      documents: [],
      comments: [],
      auditTrail: [
        {
          id: `AUD-${Date.now().toString().slice(-4)}`,
          timestamp: nowUtc,
          actor: 'Elena Vance',
          action: 'RELEASE_CREATED',
          detail: `Created release candidate ${version.trim()} (${name.trim()}).`,
        },
      ],
      history: [],
    };

    onCreate(newRelease);
    setVersion('');
    setName('');
    setSummary('');
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-release-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <h2 id="new-release-title" className="text-base font-semibold text-slate-900">
              New Release Candidate
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="rel-version" className="mb-1 block text-xs font-medium text-slate-700">
                  Version
                </label>
                <input
                  id="rel-version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v4.2.0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="rel-name" className="mb-1 block text-xs font-medium text-slate-700">
                  Release Name
                </label>
                <input
                  id="rel-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Billing Webhook Consolidation"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rel-env" className="mb-1 block text-xs font-medium text-slate-700">
                  Target Environment
                </label>
                <input
                  id="rel-env"
                  type="text"
                  value={targetEnvironment}
                  onChange={(e) => setTargetEnvironment(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="rel-window" className="mb-1 block text-xs font-medium text-slate-700">
                  Target Window
                </label>
                <input
                  id="rel-window"
                  type="text"
                  value={targetWindow}
                  onChange={(e) => setTargetWindow(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rel-branch" className="mb-1 block text-xs font-medium text-slate-700">
                Release Branch
              </label>
              <input
                id="rel-branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="rel-summary" className="mb-1 block text-xs font-medium text-slate-700">
                Scope Summary
              </label>
              <textarea
                id="rel-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of changes, migrations, or risk areas..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              Create Candidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
