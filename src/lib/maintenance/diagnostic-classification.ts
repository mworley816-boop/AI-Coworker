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
  investigationSteps: string[];
};
export function classifyScentmarkedDiagnostics(input: DiagnosticInput): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  if (!input.websiteHealthy) findings.push({
    category: "website_outage", severity: input.websiteFailureStreak >= 3 ? "critical" : "warning",
    summary: input.websiteFailureStreak >= 3 ? "Website failed at least three consecutive checks." : "Website failed its latest availability check.",
    recommendedAction: "Inspect Cloudflare deployment and request logs; verify the homepage before proposing a repair.", approvalRequired: true,
    investigationSteps: ["Confirm the production homepage response from an independent request.", "Review the latest Cloudflare staging and production deployment statuses.", "Inspect application logs without copying secrets or user data."],
  });
  if (input.github === "failed") findings.push({
    category: "github_build_failure", severity: "warning", summary: "Recent failed GitHub Actions workflow runs were found.",
    recommendedAction: "Review failed jobs and steps in GitHub. Do not assume the currently deployed website is broken.", approvalRequired: true,
    investigationSteps: ["Open the latest failed workflow run.", "Identify the failed job and step, then inspect its error output.", "Check whether a later successful deployment supersedes the failure."],
  });
  if (input.github === "unavailable") findings.push({
    category: "integration_unavailable", severity: "warning", summary: "GitHub diagnostics could not be retrieved.",
    recommendedAction: "Check GitHub integration permissions and connectivity without exposing credentials.", approvalRequired: true,
    investigationSteps: ["Confirm the read-only GitHub token is configured.", "Check whether GitHub API requests return an authorization or availability error.", "Recheck diagnostics after restoring access; never display token values."],
  });
  if (!findings.length) findings.push({
    category: "healthy", severity: "info", summary: input.github === "disabled" ? "Website is reachable; GitHub diagnostics are disabled." : "Website is reachable and no GitHub diagnostic issues were reported.",
    recommendedAction: input.github === "disabled" ? "Enable read-only GitHub monitoring if workflow diagnostics are needed." : "Continue scheduled monitoring.", approvalRequired: false,
    investigationSteps: input.github === "disabled" ? ["Optionally configure read-only GitHub monitoring."] : ["Continue scheduled monitoring; no repair is indicated."],
  });
  return findings;
}
