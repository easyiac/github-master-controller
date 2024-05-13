import * as vault from '@pulumi/vault';
import * as github from '@pulumi/github';

import { GitHubRepoOptions, createGitRepo } from '../utils/github-repo.js';

import { createSecrets } from '../utils/vault-access.js';

async function createGitHubRepos(vaultSourceProvider: vault.Provider, resourceUniqueIdPrefix: string): Promise<void> {
    const defaultRepoOptions: GitHubRepoOptions = {
        visibility: 'public',
        archived: false,
        hasIssues: true,
        hasProjects: false,
        hasWiki: false,
        isTemplate: false,
        allowMergeCommit: false,
        allowRebaseMerge: false,
        allowSquashMerge: true,
        autoInit: true,
        deleteBranchOnMerge: true,
        gitignoreTemplate: 'Node',
        topics: ['pulumi-managed'],
        defaultBranch: 'main',
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

    const dotfilesRepoProp = { ...defaultRepoOptions } as GitHubRepoOptions;
    dotfilesRepoProp.description = 'My Dot Files';
    createGitRepo('dotfiles', dotfilesRepoProp, gitHubProvider, `dotfiles-${resourceUniqueIdPrefix}`);

    const nebulaRepoProp = { ...defaultRepoOptions } as GitHubRepoOptions;
    nebulaRepoProp.description = 'Ansible Collection Nebula';
    createGitRepo('arpanrec.nebula', nebulaRepoProp, gitHubProvider, `arpanrec.nebula-${resourceUniqueIdPrefix}`);
}

export { createGitHubRepos };
