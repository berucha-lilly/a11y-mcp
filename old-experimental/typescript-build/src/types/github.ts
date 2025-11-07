/**
 * GitHub Integration Types
 * Type definitions for GitHub API interactions
 */

export interface GitHubConfig {
  appId: number;
  installationId: number;
  privateKey: string;
  apiToken?: string; // Alternative token for API access
  webhookSecret: string;
  apiRateLimit: {
    perHour: number;
    perHourRemaining: number;
    perHourResetTime: number;
  };
}

export interface PullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
      id: number;
    };
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
    html_url: string;
  };
  sender: {
    login: string;
    id: number;
  };
}

export interface CheckRun {
  name: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required';
  output: {
    title: string;
    summary: string;
    text?: string;
    annotations_count: number;
    annotations_url?: string;
  };
}

export interface CheckRunAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  start_column?: number;
  end_column?: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  message: string;
  title?: string;
  raw_details?: string;
}

export interface GitHubFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

export interface PRAnalysisResult {
  prNumber: number;
  repository: string;
  branch: string;
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  violations: GitHubCheckViolation[];
  summary: {
    totalViolations: number;
    errors: number;
    warnings: number;
    complianceScore: number;
    estimatedFixTime: string;
  };
  checkRun: CheckRun;
  processingTime: number;
}

export interface GitHubCheckViolation {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  wcagCriteria: string[];
  fixSuggestion: string;
  codeSnippet?: string;
  annotationLevel: 'notice' | 'warning' | 'failure';
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  used: number;
  limit: number;
}

export interface GitHubError {
  status: number;
  message: string;
  documentation_url?: string;
  errors?: Array<{
    code: string;
    field?: string;
    message: string;
    resource?: string;
  }>;
}

export interface PerformanceMetrics {
  analysisStartTime: Date;
  analysisEndTime?: Date;
  filesProcessed: number;
  filesSkipped: number;
  violationsFound: number;
  apiCallsMade: number;
  cacheHits: number;
  cacheMisses: number;
  averageFileProcessingTime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}