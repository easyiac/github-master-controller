import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';

export type GitHubRepoOptions = {
    description?: string;
    visibility?: string;
    archived?: boolean;
    hasIssues?: boolean;
    hasProjects?: boolean;
    hasWiki?: boolean;
    isTemplate?: boolean;
    allowMergeCommit?: boolean;
    allowRebaseMerge?: boolean;
    allowSquashMerge?: boolean;
    autoInit?: boolean;
    deleteBranchOnMerge?: boolean;
    gitignoreTemplate?: string;
    topics?: string[];
    defaultBranch?: string;
    licenseTemplate?: string;
    actionSecrets: Record<string, pulumi.Output<string>>;
    allowAutoMerge?: boolean;
    archiveOnDestroy?: boolean;
    hasDownloads?: boolean;
    homepageUrl?: string;
    ignoreVulnerabilityAlertsDuringRead?: boolean;
    vulnerabilityAlerts?: boolean;
};

export function createGitRepo(
    repositoryName: string,
    options: GitHubRepoOptions,
    provider: github.Provider,
    providerId: string
): github.Repository {
    let defaultBranch = options.defaultBranch || 'main';
    const gitHubRepoResource = new github.Repository(
        `repository-${repositoryName}-${providerId}`,
        {
            name: repositoryName,
            description: options.description || '',
            visibility: options.visibility || 'public',
            archived: options.archived || false,
            hasIssues: options.hasIssues || true,
            hasProjects: options.hasProjects || true,
            hasWiki: options.hasWiki || true,
            isTemplate: options.isTemplate || false,
            allowMergeCommit: options.allowMergeCommit || false,
            allowRebaseMerge: options.allowRebaseMerge || false,
            allowSquashMerge: options.allowSquashMerge || true,
            autoInit: options.autoInit || true,
            deleteBranchOnMerge: options.deleteBranchOnMerge || true,
            gitignoreTemplate: options.gitignoreTemplate || 'Node',
            topics: options.topics || [],
            licenseTemplate: options.licenseTemplate || 'mit',
            allowAutoMerge: options.allowAutoMerge || false,
            archiveOnDestroy: options.archiveOnDestroy || false,
            hasDownloads: options.hasDownloads || true,
            homepageUrl: options.homepageUrl || 'https://github.com',
            ignoreVulnerabilityAlertsDuringRead: options.ignoreVulnerabilityAlertsDuringRead || false,
            vulnerabilityAlerts: options.vulnerabilityAlerts || true,
        },
        { provider: provider }
    );

    let mainBranchFound = false;

    gitHubRepoResource.branches.apply((branches) => {
        branches.forEach((branch) => {
            if (branch.name === defaultBranch) {
                mainBranchFound = true;
            }
        });
        if (!mainBranchFound) {
            new github.Branch(
                `branch-${repositoryName}-${defaultBranch}-${providerId}`,
                {
                    repository: gitHubRepoResource.name,
                    branch: defaultBranch,
                },
                {
                    provider: provider,
                    dependsOn: [gitHubRepoResource],
                }
            );
        }
    });

    const defaultBranchResource = new github.BranchDefault(
        `default-branch-${repositoryName}-${defaultBranch}-${providerId}`,
        {
            repository: gitHubRepoResource.name,
            branch: defaultBranch,
        },
        {
            provider: provider,
            dependsOn: [gitHubRepoResource],
        }
    );

    new github.BranchProtection(
        `branch-protection-${repositoryName}-${defaultBranch}-${providerId}`,
        {
            repositoryId: gitHubRepoResource.nodeId,
            pattern: defaultBranchResource.branch,
            enforceAdmins: true,
            allowsDeletions: false,
            requireSignedCommits: true,
            requireConversationResolution: true,
            requiredStatusChecks: [
                {
                    strict: true,
                },
            ],
            requiredPullRequestReviews: [
                {
                    dismissStaleReviews: true,
                    restrictDismissals: false,
                    requiredApprovingReviewCount: 0,
                },
            ],
        },
        {
            provider: provider,
            dependsOn: [defaultBranchResource],
        }
    );

    new github.BranchProtection(
        `branch-protection-${repositoryName}-backup-${providerId}`,
        {
            repositoryId: gitHubRepoResource.nodeId,
            pattern: 'backup/**',
            allowsDeletions: false,
            allowsForcePushes: false,
        },
        {
            provider: provider,
            dependsOn: [gitHubRepoResource],
        }
    );

    if (Object.keys(options.actionSecrets).length > 0) {
        Object.keys(options.actionSecrets).forEach((key) => {
            new github.ActionsSecret(
                `action-secret-${repositoryName}-${key}-${providerId}`,
                {
                    repository: gitHubRepoResource.name,
                    secretName: key,
                    plaintextValue: options.actionSecrets[key],
                },
                {
                    provider: provider,
                    dependsOn: [gitHubRepoResource],
                }
            );
        });
    }

    return gitHubRepoResource;
}
