import * as pulumiGitHub from '@pulumi/github';

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
};

export function createGitRepo(
    repositoryName: string,
    options: GitHubRepoOptions,
    provider: pulumiGitHub.Provider,
    owner: string
): void {
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
    let autoInit = options.autoInit || false;
    let deleteBranchOnMerge = options.deleteBranchOnMerge || true;
    let gitignoreTemplate = options.gitignoreTemplate || 'Node';
    let topics = options.topics || [];
    let defaultBranch = options.defaultBranch || 'main';

    const gitHubRepo = new pulumiGitHub.Repository(
        owner + '-' + repositoryName + '-repository',
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
        },
        { provider: provider }
    );

    const mainBranch = new pulumiGitHub.Branch(
        owner + '-' + repositoryName + '-' + defaultBranch + '-branch',
        {
            repository: gitHubRepo.name,
            branch: defaultBranch,
        },
        {
            provider: provider,
        }
    );
    const defaultBranchResource = new pulumiGitHub.BranchDefault(
        owner + '-' + repositoryName + '-' + defaultBranch + '-default-branch',
        {
            repository: gitHubRepo.name,
            branch: mainBranch.branch,
        },
        {
            provider: provider,
        }
    );

    new pulumiGitHub.BranchProtection(
        owner + '-' + repositoryName + '-' + defaultBranch + '-branch-protection',
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

    new pulumiGitHub.BranchProtection(
        owner + '-' + repositoryName + '-backup-' + '-branch-protection',
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
}
