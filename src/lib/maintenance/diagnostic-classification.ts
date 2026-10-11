/** Read-only diagnostic classification. Categories describe observations, not root-cause proof. */
export type DiagnosticCategory = "website_outage" | "github_build_failure" | "integration_unavailable" | "healthy";
export type DiagnosticInput = {
  websiteHealthy: boolean;
  websiteFailureStreak: number;
  github: "healthy" | "failed" | "unavailable" | "disabled";
};
export type DiagnosticFinding = {
  category: DiagnosticCategory;
  severity: "info" | "warning" | "critical";
  summary: string;
  recommendedAction: string;
  approvalRequired: boolean;
};
export function classifyScentmarkedDiagnostics(input: DiagnosticInput): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  if (!input.websiteHealthy) findings.push({
    category: "website_outage", severity: input.websiteFailureStreak >= 3 ? "critical" : "warning",
    summary: input.websiteFailureStreak >= 3 ? "Website failed at least three consecutive checks." : "Website failed its latest availability check.",
    recommendedAction: "Inspect Cloudflare deployment and request logs; verify the homepage before proposing a repair.", approvalRequired: true,
  });
  if (input.github === "failed") findings.push({
    category: "github_build_failure", severity: "warning", summary: "Recent failed GitHub Actions workflow runs were found.",
    recommendedAction: "Review failed jobs and steps in GitHub. Do not assume the currently deployed website is broken.", approvalRequired: true,
  });
  if (input.github === "unavailable") findings.push({
    category: "integration_unavailable", severity: "warning", summary: "GitHub diagnostics could not be retrieved.",
    recommendedAction: "Check GitHub integration permissions and connectivity without exposing credentials.", approvalRequired: true,
  });
  if (!findings.length) findings.push({
    category: "healthy", severity: "info", summary: input.github === "disabled" ? "Website is reachable; GitHub diagnostics are disabled." : "Website is reachable and no GitHub diagnostic issues were reported.",
    recommendedAction: input.github === "disabled" ? "Enable read-only GitHub monitoring if workflow diagnostics are needed." : "Continue scheduled monitoring.", approvalRequired: false,
  });
  return findings;
}
