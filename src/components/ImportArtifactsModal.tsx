import { useRef, useState } from 'react';
import { FileInput, FileUp, Loader2, Upload, X } from 'lucide-react';
import type {
  ChecklistItem,
  DocumentFormat,
  KnownBug,
  ReleaseRequirement,
  SecurityFinding,
  TestSuiteResult,
  UploadedDocument,
} from '../types/release';

type TargetArtifactType = 'tests' | 'bugs' | 'requirements' | 'checklist' | 'security';

export interface ExtractedDocumentPayload {
  document?: UploadedDocument;
  summary: string;
  tests: TestSuiteResult[];
  bugs: KnownBug[];
  requirements: ReleaseRequirement[];
  checklist: ChecklistItem[];
  securityReports: SecurityFinding[];
}

interface ImportArtifactsModalProps {
  isOpen: boolean;
  defaultTarget: TargetArtifactType | 'AUTO';
  defaultMode?: 'file' | 'paste';
  existingReqIds: string[];
  onClose: () => void;
  onImportPayload: (payload: ExtractedDocumentPayload) => void;
}

const PLACEHOLDER_BY_TYPE: Record<TargetArtifactType, string> = {
  tests: `Paste CI output, JUnit summary, or test notes, e.g.:
- [FAIL] Payment Webhook Retry Test (staging-eu) - 12.4s - timed out waiting on lock for REQ-101
- [PASS] Card Vault Encryption Spec (staging-us) - 3.1s - 96% cov for REQ-102`,
  bugs: `Paste Jira/Linear tickets or bug triage notes, e.g.:
- BUG-512 (P1, Open): Webhook signature fails when header contains trailing whitespace in webhook-router. Affects REQ-101. No workaround.
- BUG-515 (P2, Deferred): Admin table pagination off by 1 on page 10.`,
  requirements: `Paste PRD acceptance criteria or release scope items, e.g.:
- Must Have: Zero-downtime schema migration for orders table with verified rollback script (Owner: D. Patel)
- Should Have: Audit log export completes in under 5s for 10k entries`,
  checklist: `Paste deployment runbook or pre-flight items, e.g.:
- [x] Rotate webhook signing secret in prod-us-east (Security, Owner: S. Lindqvist)
- [ ] Run rollback dry-run on staging snapshot (Rollback, Required for Go, Owner: D. Patel)`,
  security: `Paste SAST/DAST/SCA security scan output or CVE notes, e.g.:
- [CRITICAL / OPEN] SQL injection vector in legacy reporting filter (CWE-89, component: reporting-api, Semgrep)
- [HIGH / MITIGATED] lodash prototype pollution CVE-2026-1022 patched at gateway`,
};

function detectFormatFromFilename(name: string): DocumentFormat {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (ext === 'csv') return 'CSV';
  if (ext === 'json') return 'JSON';
  if (ext === 'xml') return 'XML';
  return 'TXT';
}

export function ImportArtifactsModal({
  isOpen,
  defaultTarget,
  defaultMode = 'file',
  existingReqIds,
  onClose,
  onImportPayload,
}: ImportArtifactsModalProps) {
  const [mode, setMode] = useState<'file' | 'paste'>(defaultMode);
  const [streamScope, setStreamScope] = useState<TargetArtifactType | 'AUTO'>(defaultTarget);
  const [pasteTarget, setPasteTarget] = useState<TargetArtifactType>(
    defaultTarget === 'AUTO' ? 'tests' : defaultTarget
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  function handleFileChange(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
  }

  async function handleUploadFile() {
    if (!selectedFile) {
      setError('Select a PDF, CSV, JSON, XML, or TXT document first.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const format = detectFormatFromFilename(selectedFile.name);
      let contentBase64: string | undefined;
      let textContent: string | undefined;

      if (format === 'PDF') {
        contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to read PDF file.'));
          reader.readAsDataURL(selectedFile);
        });
      } else {
        textContent = await selectedFile.text();
      }

      const res = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          format,
          contentBase64,
          textContent,
          targetStream: streamScope,
          existingReqIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse uploaded document.');
      }

      const totalCount =
        (data.tests?.length ?? 0) +
        (data.bugs?.length ?? 0) +
        (data.requirements?.length ?? 0) +
        (data.checklist?.length ?? 0) +
        (data.securityReports?.length ?? 0);

      if (totalCount === 0) {
        throw new Error('No release evidence records could be extracted from this document.');
      }

      const docRecord: UploadedDocument = {
        id: `DOC-${Date.now().toString().slice(-5)}`,
        filename: selectedFile.name,
        format,
        sizeBytes: selectedFile.size,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
        streamSummary: data.summary || `${totalCount} extracted items`,
        extractedCount: totalCount,
      };

      onImportPayload({
        document: docRecord,
        summary: data.summary,
        tests: data.tests ?? [],
        bugs: data.bugs ?? [],
        requirements: data.requirements ?? [],
        checklist: data.checklist ?? [],
        securityReports: data.securityReports ?? [],
      });

      setSelectedFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process document.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleParsePaste() {
    if (!rawText.trim()) {
      setError('Paste raw release notes, logs, or scan outputs to extract.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/parse-artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          targetType: pasteTarget,
          existingReqIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse pasted content.');
      }
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('No structured items could be extracted from the pasted text.');
      }

      onImportPayload({
        summary: `Extracted ${data.items.length} ${pasteTarget} item(s)`,
        tests: pasteTarget === 'tests' ? data.items : [],
        bugs: pasteTarget === 'bugs' ? data.items : [],
        requirements: pasteTarget === 'requirements' ? data.items : [],
        checklist: pasteTarget === 'checklist' ? data.items : [],
        securityReports: pasteTarget === 'security' ? data.items : [],
      });

      setRawText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse artifacts.');
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileInput className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <h2 id="import-modal-title" className="text-base font-semibold text-slate-900">
              Upload Documents & Extract Release Evidence
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

        <div className="space-y-4 px-6 py-5">
          {/* Mode Toggle: Upload File vs Paste Text */}
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('file');
                setError(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                mode === 'file'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Document (PDF, CSV, JSON, XML, TXT)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('paste');
                setError(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                mode === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Raw Logs or Notes
            </button>
          </div>

          {mode === 'file' ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Extraction Scope
                </label>
                <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
                  {(
                    [
                      { key: 'AUTO', label: 'Auto-Detect All Streams' },
                      { key: 'tests', label: 'Tests' },
                      { key: 'bugs', label: 'Bugs' },
                      { key: 'security', label: 'Security' },
                      { key: 'requirements', label: 'Requirements' },
                      { key: 'checklist', label: 'Checklist' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStreamScope(opt.key)}
                      className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        streamScope === opt.key
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleFileChange(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-slate-400 hover:bg-slate-100/70"
              >
                <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
                <p className="mt-2 text-xs font-medium text-slate-900">
                  {selectedFile
                    ? selectedFile.name
                    : 'Click to browse or drop a release report file'}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {selectedFile
                    ? `${detectFormatFromFilename(selectedFile.name)} · ${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'Supports .pdf, .csv, .json, .xml, .txt'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.json,.xml,.txt,.log,.md"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Target Evidence Stream
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 sm:grid-cols-5">
                  {(
                    [
                      { key: 'tests', label: 'Tests' },
                      { key: 'bugs', label: 'Bugs' },
                      { key: 'security', label: 'Security' },
                      { key: 'requirements', label: 'Requirements' },
                      { key: 'checklist', label: 'Checklist' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPasteTarget(tab.key)}
                      className={`rounded px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                        pasteTarget === tab.key
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="raw-artifact-input"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Paste unstructured test output, bug list, security report, PRD, or runbook
                </label>
                <textarea
                  id="raw-artifact-input"
                  rows={7}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={PLACEHOLDER_BY_TYPE[pasteTarget]}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </>
          )}

          {existingReqIds.length > 0 && (
            <p className="text-xs text-slate-500">
              Existing requirement IDs available for automatic linking:{' '}
              <span className="font-mono text-slate-700">{existingReqIds.join(', ')}</span>
            </p>
          )}

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
            disabled={isParsing}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={mode === 'file' ? handleUploadFile : handleParsePaste}
            disabled={isParsing}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {isParsing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isParsing
              ? 'Extracting Evidence...'
              : mode === 'file'
                ? 'Upload & Extract'
                : 'Parse & Append'}
          </button>
        </div>
      </div>
    </div>
  );
}
