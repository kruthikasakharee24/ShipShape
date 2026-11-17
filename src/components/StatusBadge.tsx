import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import type {
  BugSeverity,
  BugStatus,
  DimensionStatus,
  IssueSeverity,
  PolicyStatus,
  ReadinessVerdict,
  SecurityFindingStatus,
  TestStatus,
  TraceabilityStatus,
} from '../types/release';

export function VerdictIndicator({ verdict }: { verdict: ReadinessVerdict }) {
  if (verdict === 'GO') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 whitespace-nowrap shrink-0">
        <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        GO — Ready for Human Approval
      </span>
    );
  }
  if (verdict === 'INCONCLUSIVE') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 whitespace-nowrap shrink-0">
        <ShieldQuestion className="h-4 w-4 text-amber-700" aria-hidden="true" />
        INCONCLUSIVE — Verification Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 whitespace-nowrap shrink-0">
      <ShieldAlert className="h-4 w-4 text-red-700" aria-hidden="true" />
      NO-GO — Release Blocked
    </span>
  );
}

export function TestStatusLabel({ status }: { status: TestStatus }) {
  switch (status) {
    case 'PASS':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Pass
        </span>
      );
    case 'FAIL':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Fail
        </span>
      );
    case 'FLAKY':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Flaky
        </span>
      );
    case 'SKIPPED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Skipped
        </span>
      );
  }
}

export function SeverityLabel({ severity }: { severity: BugSeverity | IssueSeverity }) {
  const isCritical = severity === 'P0' || severity === 'CRITICAL';
  const isHigh = severity === 'P1' || severity === 'HIGH';
  const isMedium = severity === 'P2' || severity === 'MEDIUM';

  const colorClass = isCritical
    ? 'text-red-700 bg-red-50 border-red-200'
    : isHigh
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : isMedium
        ? 'text-slate-700 bg-slate-100 border-slate-200'
        : 'text-slate-600 bg-slate-50 border-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap ${colorClass}`}
    >
      {isCritical && <AlertOctagon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {severity}
    </span>
  );
}

export function BugStatusLabel({ status }: { status: BugStatus }) {
  const styles: Record<BugStatus, string> = {
    OPEN: 'text-red-700',
    IN_PROGRESS: 'text-amber-700',
    FIXED: 'text-emerald-700',
    DEFERRED: 'text-slate-600',
    WONT_FIX: 'text-slate-500',
  };
  const labels: Record<BugStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    FIXED: 'Fixed',
    DEFERRED: 'Deferred',
    WONT_FIX: "Won't Fix",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {status === 'FIXED' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : status === 'IN_PROGRESS' ? (
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : status === 'OPEN' ? (
        <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {labels[status]}
    </span>
  );
}

export function SecurityStatusLabel({ status }: { status: SecurityFindingStatus }) {
  const styles: Record<SecurityFindingStatus, string> = {
    OPEN: 'text-red-700',
    MITIGATED: 'text-amber-700',
    FIXED: 'text-emerald-700',
    ACCEPTED_RISK: 'text-slate-600',
  };
  const labels: Record<SecurityFindingStatus, string> = {
    OPEN: 'Open',
    MITIGATED: 'Mitigated',
    FIXED: 'Fixed',
    ACCEPTED_RISK: 'Accepted Risk',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {status === 'FIXED' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : status === 'OPEN' ? (
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {labels[status]}
    </span>
  );
}

export function PolicyStatusLabel({ status }: { status: PolicyStatus }) {
  if (status === 'SATISFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Satisfied
      </span>
    );
  }
  if (status === 'UNVERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Unverified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Violated
    </span>
  );
}

export function DimensionStatusLabel({ status }: { status: DimensionStatus }) {
  if (status === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Pass
      </span>
    );
  }
  if (status === 'WARN') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Fail
    </span>
  );
}

export function TraceStatusLabel({ status }: { status: TraceabilityStatus }) {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Verified
      </span>
    );
  }
  if (status === 'AT_RISK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        At Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Blocked
    </span>
  );
}
