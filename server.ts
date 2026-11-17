import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type {
  AgentChatMessage,
  DocumentFormat,
  ReleaseAssessment,
  ReleaseCandidate,
  ReleasePolicy,
} from './src/types/release.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 500,
      message: 'API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API authentication failed. Verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota exceeded. Please wait briefly or check your billing quota in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: raw || 'Failed to complete AI release-readiness operation.',
  };
}

const ASSESSMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      description: 'Overall release outcome: GO, NO_GO, or INCONCLUSIVE.',
    },
    confidenceLevel: {
      type: Type.STRING,
      description: 'Confidence level based on artifact completeness, e.g. High, Moderate, or Low.',
    },
    assessedAt: {
      type: Type.STRING,
      description: 'ISO 8601 timestamp of assessment.',
    },
    executiveSummary: {
      type: Type.STRING,
      description:
        '2-3 crisp sentences summarizing readiness posture, citing the most important cross-checked documents and records.',
    },
    dimensions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: { type: Type.STRING },
          status: { type: Type.STRING, description: 'PASS, WARN, or FAIL' },
          headlineMetric: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['dimension', 'status', 'headlineMetric', 'summary'],
      },
    },
    policyEvaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          policyId: { type: Type.STRING },
          policyName: { type: Type.STRING },
          status: { type: Type.STRING, description: 'SATISFIED, VIOLATED, or UNVERIFIED' },
          mandatory: { type: Type.BOOLEAN },
          evidence: { type: Type.STRING },
        },
        required: ['policyId', 'policyName', 'status', 'mandatory', 'evidence'],
      },
    },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: 'CRITICAL, HIGH, MEDIUM, or LOW' },
          category: { type: Type.STRING },
          artifactRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
          sourceDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
          analysis: { type: Type.STRING },
          remediation: { type: Type.STRING },
        },
        required: [
          'id',
          'title',
          'severity',
          'category',
          'artifactRefs',
          'sourceDocuments',
          'analysis',
          'remediation',
        ],
      },
    },
    traceability: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          reqId: { type: Type.STRING },
          reqTitle: { type: Type.STRING },
          status: { type: Type.STRING, description: 'VERIFIED, AT_RISK, or BLOCKED' },
          linkedTests: { type: Type.ARRAY, items: { type: Type.STRING } },
          linkedBugs: { type: Type.ARRAY, items: { type: Type.STRING } },
          linkedChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          rationale: { type: Type.STRING },
        },
        required: [
          'reqId',
          'reqTitle',
          'status',
          'linkedTests',
          'linkedBugs',
          'linkedChecklist',
          'rationale',
        ],
      },
    },
    signOffConditions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'verdict',
    'confidenceLevel',
    'assessedAt',
    'executiveSummary',
    'dimensions',
    'policyEvaluations',
    'findings',
    'traceability',
    'signOffConditions',
  ],
};

const DOCUMENT_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Short 1-line summary of extracted artifacts e.g. "Extracted 5 tests and 2 security findings".',
    },
    tests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          suite: { type: Type.STRING },
          name: { type: Type.STRING },
          status: { type: Type.STRING, description: 'PASS, FAIL, FLAKY, or SKIPPED' },
          durationMs: { type: Type.INTEGER },
          coveragePct: { type: Type.NUMBER },
          environment: { type: Type.STRING },
          linkedReqIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING },
        },
        required: [
          'id',
          'suite',
          'name',
          'status',
          'durationMs',
          'coveragePct',
          'environment',
          'linkedReqIds',
        ],
      },
    },
    bugs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: 'P0, P1, P2, or P3' },
          status: { type: Type.STRING, description: 'OPEN, IN_PROGRESS, FIXED, DEFERRED, or WONT_FIX' },
          component: { type: Type.STRING },
          linkedReqIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          workaround: { type: Type.STRING },
          reportedBy: { type: Type.STRING },
        },
        required: [
          'id',
          'title',
          'severity',
          'status',
          'component',
          'linkedReqIds',
          'workaround',
          'reportedBy',
        ],
      },
    },
    requirements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          priority: { type: Type.STRING, description: 'MUST_HAVE or SHOULD_HAVE' },
          acceptanceCriteria: { type: Type.STRING },
          owner: { type: Type.STRING },
        },
        required: ['id', 'title', 'category', 'priority', 'acceptanceCriteria', 'owner'],
      },
    },
    checklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description: 'INFRASTRUCTURE, DATA_MIGRATION, SECURITY, OBSERVABILITY, or ROLLBACK',
          },
          completed: { type: Type.BOOLEAN },
          requiredForGo: { type: Type.BOOLEAN },
          owner: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ['id', 'title', 'category', 'completed', 'requiredForGo', 'owner', 'evidence'],
      },
    },
    securityReports: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: 'CRITICAL, HIGH, MEDIUM, or LOW' },
          status: { type: Type.STRING, description: 'OPEN, MITIGATED, FIXED, or ACCEPTED_RISK' },
          scanner: { type: Type.STRING },
          cweOrCve: { type: Type.STRING },
          component: { type: Type.STRING },
          remediation: { type: Type.STRING },
        },
        required: [
          'id',
          'title',
          'severity',
          'status',
          'scanner',
          'cweOrCve',
          'component',
          'remediation',
        ],
      },
    },
  },
  required: ['summary', 'tests', 'bugs', 'requirements', 'checklist', 'securityReports'],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post('/api/assess', async (req, res) => {
    try {
      const { release, policies } = req.body as {
        release?: ReleaseCandidate;
        policies?: ReleasePolicy[];
      };

      if (!release || !release.version) {
        res.status(400).json({ error: 'Invalid release payload.' });
        return;
      }

      const ai = createGeminiClient();
      const nowIso = new Date().toISOString();
      const activePolicies = (policies ?? []).filter((p) => p.enabled);

      const systemInstruction = `You are ShipShape, an AI Release-Readiness Gatekeeper for software engineering teams.
Assess whether the software release candidate is ready to ship by rigorously CROSS-CHECKING five evidence streams alongside custom organizational release policies:
1. Test Results (PASS/FAIL/FLAKY/SKIPPED, environment parity, coverage, failure notes)
2. Known Bugs (P0-P3 severity, OPEN/IN_PROGRESS/FIXED/DEFERRED status, workarounds)
3. Release Requirements (MUST_HAVE vs SHOULD_HAVE, acceptance criteria)
4. Deployment Checklist (infrastructure, data migration, security, observability, rollback steps, requiredForGo)
5. Security Reports (SAST/DAST/SCA findings, CRITICAL/HIGH/MEDIUM/LOW severity, OPEN/MITIGATED/FIXED/ACCEPTED_RISK, CVE/CWE)

Core cross-checking instructions:
- Identify failed test cases, unresolved bugs, open security vulnerabilities, missing requirements, and CONTRADICTORY information across sources (for example: a security test passes in staging while an OPEN CRITICAL security finding or P0 bug contradicts it; or a requirement lacks test coverage; or a migration lacks a completed rollback dry-run).
- Categorize every finding's severity strictly as CRITICAL, HIGH, MEDIUM, or LOW.
- Highlight BOTH the exact record IDs (artifactRefs, e.g. TEST-204, BUG-422, SEC-801, REQ-102, CHK-03) AND the responsible source document filenames (sourceDocuments, e.g. junit-checkout-rc3.xml, sast-security-rc3.json).
- Verify every enabled policy in activePolicies and populate policyEvaluations with status SATISFIED, VIOLATED, or UNVERIFIED.
- Produce strictly one of three outcomes for verdict:
  * GO: All mandatory policies are satisfied, MUST_HAVE requirements are verified by passing tests, no unresolved P0/CRITICAL blockers remain, and required deployment/rollback gates are complete (ready for human approval).
  * NO_GO: Clear blockers exist—such as unresolved P0 bugs, OPEN CRITICAL security vulnerabilities, failed tests on MUST_HAVE requirements, or violated mandatory policies.
  * INCONCLUSIVE: No definitive hard blocker proves failure, OR evidence is missing/incomplete/flaky (e.g., skipped tests, missing security reports, unverified rollback gates, or insufficient test coverage) requiring further verification before a GO/NO-GO call can be made.
- Always output 5 dimensions in order: "Test Coverage & Stability", "Defect & Bug Risk", "Security & Compliance", "Requirement Traceability", "Deployment & Rollback Readiness".
- Include every ReleaseRequirement in traceability.
- Set assessedAt to "${nowIso}".`;

      const prompt = `Release Candidate Data:
${JSON.stringify(
  {
    version: release.version,
    name: release.name,
    targetEnvironment: release.targetEnvironment,
    targetWindow: release.targetWindow,
    branch: release.branch,
    summary: release.summary,
    requirements: release.requirements,
    tests: release.tests,
    bugs: release.bugs,
    securityReports: release.securityReports,
    checklist: release.checklist,
    documents: release.documents,
  },
  null,
  2
)}

Active Release Policies:
${JSON.stringify(activePolicies, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: ASSESSMENT_SCHEMA,
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as ReleaseAssessment;
      res.json({ assessment: parsed });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/upload-document', async (req, res) => {
    try {
      const { filename, format, contentBase64, textContent, targetStream, existingReqIds } =
        req.body as {
          filename?: string;
          format?: DocumentFormat;
          contentBase64?: string;
          textContent?: string;
          targetStream?: 'AUTO' | 'tests' | 'bugs' | 'requirements' | 'checklist' | 'security';
          existingReqIds?: string[];
        };

      if (!filename || !format) {
        res.status(400).json({ error: 'Filename and document format are required.' });
        return;
      }

      if (format === 'PDF' && !contentBase64) {
        res.status(400).json({ error: 'PDF binary payload is required.' });
        return;
      }
      if (format !== 'PDF' && !textContent?.trim()) {
        res.status(400).json({ error: 'Document text content is empty.' });
        return;
      }

      const ai = createGeminiClient();
      const streamHint =
        targetStream && targetStream !== 'AUTO'
          ? `Focus extraction into the "${targetStream}" array (leave unrelated arrays empty unless clearly present).`
          : 'Auto-detect which streams are represented in this document (tests, bugs, requirements, checklist, securityReports) and populate all matching arrays.';

      const instruction = `You are a release engineering document parser.
Analyze the uploaded ${format} file named "${filename}".
${streamHint}
Existing release requirement IDs for automatic linking: ${(existingReqIds ?? []).join(', ') || 'None'}.
Rules:
- Preserve exact IDs found in the file; if missing, generate clean sequential IDs (TEST-*, BUG-*, REQ-*, CHK-*, SEC-*).
- For tests: status must be PASS, FAIL, FLAKY, or SKIPPED.
- For bugs: severity must be P0, P1, P2, or P3; status must be OPEN, IN_PROGRESS, FIXED, DEFERRED, or WONT_FIX.
- For requirements: priority must be MUST_HAVE or SHOULD_HAVE.
- For checklist: category must be INFRASTRUCTURE, DATA_MIGRATION, SECURITY, OBSERVABILITY, or ROLLBACK.
- For securityReports: severity must be CRITICAL, HIGH, MEDIUM, or LOW; status must be OPEN, MITIGATED, FIXED, or ACCEPTED_RISK.
- Populate "summary" concisely.`;

      const contents =
        format === 'PDF'
          ? {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: contentBase64 as string,
                  },
                },
                { text: instruction },
              ],
            }
          : `${instruction}\n\nDocument Content (${format}):\n${textContent}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: DOCUMENT_EXTRACTION_SCHEMA,
        },
      });

      const extracted = JSON.parse((response.text ?? '{}').trim()) as {
        summary: string;
        tests: Record<string, unknown>[];
        bugs: Record<string, unknown>[];
        requirements: Record<string, unknown>[];
        checklist: Record<string, unknown>[];
        securityReports: Record<string, unknown>[];
      };

      const stampSource = (arr: Record<string, unknown>[] = []) =>
        arr.map((item) => ({ ...item, sourceDocument: filename }));

      const result = {
        summary: extracted.summary || `Parsed ${filename}`,
        tests: stampSource(extracted.tests),
        bugs: stampSource(extracted.bugs),
        requirements: stampSource(extracted.requirements),
        checklist: stampSource(extracted.checklist),
        securityReports: stampSource(extracted.securityReports),
      };

      res.json(result);
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/parse-artifacts', async (req, res) => {
    try {
      const { rawText, targetType, existingReqIds } = req.body as {
        rawText?: string;
        targetType?: 'tests' | 'bugs' | 'requirements' | 'checklist' | 'security';
        existingReqIds?: string[];
      };

      if (!rawText?.trim() || !targetType) {
        res.status(400).json({ error: 'Raw text and target artifact type are required.' });
        return;
      }

      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extract structured ${targetType} items from the following text. Existing requirement IDs: ${(existingReqIds ?? []).join(', ') || 'None'}.\n\n${rawText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: DOCUMENT_EXTRACTION_SCHEMA,
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const mapKey = targetType === 'security' ? 'securityReports' : targetType;
      res.json({ items: parsed[mapKey] ?? [] });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/compare', async (req, res) => {
    try {
      const { releaseA, releaseB } = req.body as {
        releaseA?: ReleaseCandidate;
        releaseB?: ReleaseCandidate;
      };

      if (!releaseA || !releaseB) {
        res.status(400).json({ error: 'Two release candidates are required for comparison.' });
        return;
      }

      const ai = createGeminiClient();
      const prompt = `Compare these two software release candidates across test stability, unresolved bugs, security vulnerabilities, requirements scope, and deployment readiness.
Provide a concise, bulleted engineering comparison highlighting regressions, improvements, and relative deployment risk. Cite exact IDs and version tags.

Release A (${releaseA.version}):
${JSON.stringify(
  {
    version: releaseA.version,
    name: releaseA.name,
    tests: releaseA.tests,
    bugs: releaseA.bugs,
    securityReports: releaseA.securityReports,
    requirements: releaseA.requirements,
    checklist: releaseA.checklist,
  },
  null,
  2
)}

Release B (${releaseB.version}):
${JSON.stringify(
  {
    version: releaseB.version,
    name: releaseB.name,
    tests: releaseB.tests,
    bugs: releaseB.bugs,
    securityReports: releaseB.securityReports,
    requirements: releaseB.requirements,
    checklist: releaseB.checklist,
  },
  null,
  2
)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      res.json({ analysis: (response.text ?? '').trim() });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ask', async (req, res) => {
    try {
      const { release, assessment, policies, question, history } = req.body as {
        release?: ReleaseCandidate;
        assessment?: ReleaseAssessment | null;
        policies?: ReleasePolicy[];
        question?: string;
        history?: AgentChatMessage[];
      };

      if (!release || !question?.trim()) {
        res.status(400).json({ error: 'Release context and question are required.' });
        return;
      }

      const ai = createGeminiClient();
      const systemInstruction = `You are ShipShape, an AI release-readiness assistant helping developers inspect release readiness.
Answer concisely in clear engineering prose. Cite exact record IDs (TEST-*, BUG-*, SEC-*, REQ-*, CHK-*), policy IDs (POL-*), and source document filenames from the release context.
When asked "what-if" questions (such as fixing a bug, mitigating a CVE, or completing a checklist gate), state clearly whether the verdict would shift among GO, NO_GO, or INCONCLUSIVE.`;

      const recentHistory = (history ?? [])
        .slice(-8)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const prompt = `Release Candidate Context:
${JSON.stringify(
  {
    version: release.version,
    name: release.name,
    targetEnvironment: release.targetEnvironment,
    targetWindow: release.targetWindow,
    approvalState: release.approvalState,
    tests: release.tests,
    bugs: release.bugs,
    securityReports: release.securityReports,
    requirements: release.requirements,
    checklist: release.checklist,
    documents: release.documents,
  },
  null,
  2
)}

Enabled Policies:
${JSON.stringify((policies ?? []).filter((p) => p.enabled), null, 2)}

Latest Assessment:
${assessment ? JSON.stringify(assessment, null, 2) : 'Not assessed yet.'}

${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ''}Developer Question: ${question}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      res.json({ answer: (response.text ?? '').trim() });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShipShape server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
