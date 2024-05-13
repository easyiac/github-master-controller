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
};

export function createGitRepo(
    repositoryName: string,
    options: GitHubRepoOptions,
    provider: github.Provider,
    owner: string
): github.Repository {
    let description = options.description || '';
    let visibility = options.visibility || 'public';
    let archived = options.archived || false;
    let hasIssues = options.hasIssues || true;
    let hasProjects = options.hasProjects || true;
    let hasWiki = options.hasWiki || true;
    let isTemplate = options.isTemplate || false;
    let allowMergeCommit = options.allowMergeCommit || false;
    let allowRebaseMerge = options.allowRebaseMerge || false;
    let allowSquashMerge = options.allowSquashMerge || true;
    let autoInit = options.autoInit || true;
    let deleteBranchOnMerge = options.deleteBranchOnMerge || true;
    let gitignoreTemplate = options.gitignoreTemplate || 'Node';
    let topics = options.topics || [];
    let defaultBranch = options.defaultBranch || 'main';
    let licenseTemplate = options.licenseTemplate || 'mit';
    let actionSecrets = options.actionSecrets || {};
    let allowAutoMerge = options.allowAutoMerge || false;

    const gitHubRepo = new github.Repository(
        `repository-${owner}-${repositoryName}`,
        {
            name: repositoryName,
            description: description,
            visibility: visibility,
            archived: archived,
            hasIssues: hasIssues,
            hasProjects: hasProjects,
            hasWiki: hasWiki,
            isTemplate: isTemplate,
            allowMergeCommit: allowMergeCommit,
            allowRebaseMerge: allowRebaseMerge,
            allowSquashMerge: allowSquashMerge,
            autoInit: autoInit,
            deleteBranchOnMerge: deleteBranchOnMerge,
            gitignoreTemplate: gitignoreTemplate,
            topics: topics,
            licenseTemplate: licenseTemplate,
            allowAutoMerge: allowAutoMerge,
            archiveOnDestroy: true,
            hasDownloads: true,
            homepageUrl: 'https://github.com',
            ignoreVulnerabilityAlertsDuringRead: false,
            vulnerabilityAlerts: true,
        },
        { provider: provider }
    );

    let mainBranchFound = false;

    gitHubRepo.branches.apply((branches) => {
        branches.forEach((branch) => {
            if (branch.name === defaultBranch) {
                mainBranchFound = true;
            }
        });
        if (!mainBranchFound) {
            new github.Branch(
                `branch-${owner}-${repositoryName}-${defaultBranch}`,
                {
                    repository: gitHubRepo.name,
                    branch: defaultBranch,
                },
                {
                    provider: provider,
                }
            );
        }
    });

    const defaultBranchResource = new github.BranchDefault(
        `default-branch-${owner}-${repositoryName}-${defaultBranch}`,
        {
            repository: gitHubRepo.name,
            branch: defaultBranch,
        },
        {
            provider: provider,
        }
    );

    new github.BranchProtection(
        `branch-protection-${owner}-${repositoryName}-${defaultBranch}`,
        {
            repositoryId: gitHubRepo.nodeId,
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
        }
    );

    new github.BranchProtection(
        `branch-protection-${owner}-${repositoryName}-backup`,
        {
            repositoryId: gitHubRepo.nodeId,
            pattern: 'backup/**',
            allowsDeletions: false,
            allowsForcePushes: false,
        },
        {
            provider: provider,
        }
    );

    if (Object.keys(actionSecrets).length > 0) {
        Object.keys(actionSecrets).forEach((key) => {
            new github.ActionsSecret(
                `action-secret-${owner}-${repositoryName}-${key}`,
                {
                    repository: gitHubRepo.name,
                    secretName: key,
                    plaintextValue: actionSecrets[key],
                },
                {
                    provider: provider,
                }
            );
        });
    }

    return gitHubRepo;
}
