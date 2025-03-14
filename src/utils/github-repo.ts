import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';

type GitHubRepoOptions = {
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
    collaborators: Record<string, string>;
    protectDefaultBranch: boolean;
};

function createGitRepo(
    repositoryName: string,
    options: GitHubRepoOptions,
    provider: github.Provider,
    resourceUniqueIdPrefix: string
): github.Repository {
    let defaultBranch = options.defaultBranch || 'main';
    const gitHubRepoResource = new github.Repository(
        `repository-${resourceUniqueIdPrefix}`,
        {
            name: repositoryName,
            description: options.description || repositoryName,
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
                `branch-${defaultBranch}-${resourceUniqueIdPrefix}`,
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
        `default-branch-${defaultBranch}-${resourceUniqueIdPrefix}`,
        {
            repository: gitHubRepoResource.name,
            branch: defaultBranch,
        },
        {
            provider: provider,
            dependsOn: [gitHubRepoResource],
        }
    );

    if (options.protectDefaultBranch) {
        new github.BranchProtection(
            `branch-protection-${defaultBranch}-${resourceUniqueIdPrefix}`,
            {
                repositoryId: gitHubRepoResource.nodeId,
                pattern: defaultBranchResource.branch,
                enforceAdmins: false,
                allowsDeletions: false,
                requireSignedCommits: true,
                requireConversationResolution: true,
                requiredLinearHistory: true,
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
    }

    new github.BranchProtection(
        `branch-protection-backup-${resourceUniqueIdPrefix}`,
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

    Object.keys(options.actionSecrets).forEach((key) => {
        new github.ActionsSecret(
            `action-secret-${key}-${resourceUniqueIdPrefix}`,
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

    new github.RepositoryEnvironment(
        `repository-environment-production-${resourceUniqueIdPrefix}`,
        {
            environment: 'production',
            repository: gitHubRepoResource.name,
        },
        {
            provider: provider,
            dependsOn: [gitHubRepoResource],
        }
    );

    Object.keys(options.collaborators).forEach((key) => {
        new github.RepositoryCollaborator(
            `repository-collaborator-${key}-${resourceUniqueIdPrefix}`,
            {
                repository: gitHubRepoResource.name,
                username: key,
                permission: options.collaborators[key],
            },
            {
                provider: provider,
                dependsOn: [gitHubRepoResource],
            }
        );
    });

    return gitHubRepoResource;
}

export { createGitRepo, GitHubRepoOptions };
