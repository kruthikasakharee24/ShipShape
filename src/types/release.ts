export type TestStatus = 'PASS' | 'FAIL' | 'FLAKY' | 'SKIPPED';

export interface TestSuiteResult {
  id: string;
  suite: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  coveragePct: number;
  environment: string;
  linkedReqIds: string[];
  sourceDocument?: string;
  notes?: string;
}

export type BugSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'DEFERRED' | 'WONT_FIX';

export interface KnownBug {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  component: string;
  linkedReqIds: string[];
  workaround: string;
  reportedBy: string;
  sourceDocument?: string;
}

export type ReqPriority = 'MUST_HAVE' | 'SHOULD_HAVE';

export interface ReleaseRequirement {
  id: string;
  title: string;
  category: string;
  priority: ReqPriority;
  acceptanceCriteria: string;
  owner: string;
  sourceDocument?: string;
}

export type ChecklistCategory =
  | 'INFRASTRUCTURE'
  | 'DATA_MIGRATION'
  | 'SECURITY'
  | 'OBSERVABILITY'
  | 'ROLLBACK';

export interface ChecklistItem {
  id: string;
  title: string;
  category: ChecklistCategory;
  completed: boolean;
  requiredForGo: boolean;
  owner: string;
  evidence: string;
  sourceDocument?: string;
}

export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SecurityFindingStatus = 'OPEN' | 'MITIGATED' | 'FIXED' | 'ACCEPTED_RISK';

export interface SecurityFinding {
  id: string;
  title: string;
  severity: IssueSeverity;
  status: SecurityFindingStatus;
  scanner: string;
  cweOrCve: string;
  component: string;
  remediation: string;
  sourceDocument?: string;
}

export type DocumentFormat = 'PDF' | 'CSV' | 'JSON' | 'XML' | 'TXT';

export interface UploadedDocument {
  id: string;
  filename: string;
  format: DocumentFormat;
  sizeBytes: number;
  uploadedAt: string;
  streamSummary: string;
  extractedCount: number;
}

export interface ReleasePolicy {
  id: string;
  name: string;
  description: string;
  category: 'TESTING' | 'DEFECTS' | 'SECURITY' | 'REQUIREMENTS' | 'DEPLOYMENT';
  enabled: boolean;
  mandatory: boolean;
}

export interface TeamComment {
  id: string;
  author: string;
  role: string;
  content: string;
  timestamp: string;
  decision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
}

export interface ReleaseHistorySnapshot {
  id: string;
  assessedAt: string;
  verdict: ReadinessVerdict;
  confidenceLevel: string;
  summary: string;
  metrics: {
    testsPassed: number;
    testsTotal: number;
    openBugs: number;
    openSecurityCriticalHigh: number;
    checklistCompleted: number;
    checklistTotal: number;
  };
}

export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReleaseCandidate {
  id: string;
  version: string;
  name: string;
  targetEnvironment: string;
  targetWindow: string;
  releaseManager: string;
  branch: string;
  commitSha: string;
  summary: string;
  approvalState: ApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  tests: TestSuiteResult[];
  bugs: KnownBug[];
  requirements: ReleaseRequirement[];
  checklist: ChecklistItem[];
  securityReports: SecurityFinding[];
  documents: UploadedDocument[];
  comments: TeamComment[];
  auditTrail: AuditEntry[];
  history: ReleaseHistorySnapshot[];
}

export type ReadinessVerdict = 'GO' | 'NO_GO' | 'INCONCLUSIVE';
export type DimensionStatus = 'PASS' | 'WARN' | 'FAIL';
export type TraceabilityStatus = 'VERIFIED' | 'AT_RISK' | 'BLOCKED';
export type PolicyStatus = 'SATISFIED' | 'VIOLATED' | 'UNVERIFIED';

export interface CrossCheckFinding {
  id: string;
  title: string;
  severity: IssueSeverity;
  category: string;
  artifactRefs: string[];
  sourceDocuments: string[];
  analysis: string;
  remediation: string;
}

export interface DimensionAssessment {
  dimension: string;
  status: DimensionStatus;
  headlineMetric: string;
  summary: string;
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  status: PolicyStatus;
  mandatory: boolean;
  evidence: string;
}

export interface RequirementTrace {
  reqId: string;
  reqTitle: string;
  status: TraceabilityStatus;
  linkedTests: string[];
  linkedBugs: string[];
  linkedChecklist: string[];
  rationale: string;
}

export interface ReleaseAssessment {
  verdict: ReadinessVerdict;
  confidenceLevel: string;
  assessedAt: string;
  executiveSummary: string;
  dimensions: DimensionAssessment[];
  policyEvaluations: PolicyEvaluation[];
  findings: CrossCheckFinding[];
  traceability: RequirementTrace[];
  signOffConditions: string[];
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
  releaseId: string;
  targetTab?: string;
}
