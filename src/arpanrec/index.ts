import * as vault from '@pulumi/vault';
import * as github from '@pulumi/github';

import { GitHubRepoOptions, createGitRepo } from '../utils/github-repo.js';

import { createSecrets } from '../utils/vault-access.js';

async function createGitHubRepos(vaultSourceProvider: vault.Provider, resourceUniqueIdPrefix: string): Promise<void> {
    const defaultRepoOptions: GitHubRepoOptions = {
        visibility: 'public',
        archived: false,
        hasIssues: true,
        hasProjects: true,
        hasWiki: true,
        isTemplate: false,
        allowMergeCommit: false,
        allowRebaseMerge: false,
        allowSquashMerge: true,
        autoInit: true,
        deleteBranchOnMerge: true,
        gitignoreTemplate: 'Node',
        topics: ['pulumi-managed'],
        defaultBranch: 'main',
        licenseTemplate: 'mit',
        actionSecrets: await createSecrets(vaultSourceProvider, resourceUniqueIdPrefix),
        allowAutoMerge: false,
        archiveOnDestroy: false,
        hasDownloads: true,
        homepageUrl: 'https://github.com',
        ignoreVulnerabilityAlertsDuringRead: false,
        vulnerabilityAlerts: true,
        collaborators: {},
        protectDefaultBranch: false,
    };

    const gitHubKV2 = await vault.kv.getSecretV2(
        {
            name: 'external_services/github',
            mount: 'secret',
        },
        { provider: vaultSourceProvider }
    );

    const botUserRes = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `token ${gitHubKV2.data.GH_BOT_API_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });

    const botUser = await botUserRes.json();

    defaultRepoOptions.collaborators[botUser.login] = 'admin';

    const gitHubProvider = new github.Provider(`github-provider-${resourceUniqueIdPrefix}`, {
        owner: 'arpanrec',
        token: gitHubKV2.data.GH_PROD_API_TOKEN,
    });

    const testRepoProp = { ...defaultRepoOptions } as GitHubRepoOptions;
    testRepoProp.description = 'This is the test repository';
    createGitRepo('test-repo', testRepoProp, gitHubProvider, `test-repo-${resourceUniqueIdPrefix}`);
}

export { createGitHubRepos };
