import * as pulumiVault from '@pulumi/vault';
import * as pulumiGitHub from '@pulumi/github';
import { GitHubRepoOptions, createGitRepo } from './utils/github-repo.js';

const owner = 'arpanrec';

async function makeGitHubProvider(vaultSourceProvider: pulumiVault.Provider): Promise<pulumiGitHub.Provider> {
    const arpanrecGitHubKV2 = await pulumiVault.kv.getSecretV2(
        {
            name: 'external_services/github',
            mount: 'secret',
        },
        { provider: vaultSourceProvider }
    );
    return new pulumiGitHub.Provider(owner + 'github-provider', {
        owner: owner,
        token: arpanrecGitHubKV2.data.GH_PROD_API_TOKEN,
    });
}

export async function createArpanrecGitHubRepo(vaultSourceProvider: pulumiVault.Provider) {
    const defaultRepoOptions: GitHubRepoOptions = {
        description: 'This is the default repository',
        visibility: 'public',
        archived: false,
        hasIssues: true,
        hasProjects: true,
        hasWiki: true,
        isTemplate: false,
        allowMergeCommit: false,
        allowRebaseMerge: false,
        allowSquashMerge: true,
        autoInit: false,
        deleteBranchOnMerge: true,
        gitignoreTemplate: 'Node',
        topics: ['pulumi-managed'],
        defaultBranch: 'main',
    };

    const gitHubProvider = await makeGitHubProvider(vaultSourceProvider);

    const testRepoProp = JSON.parse(JSON.stringify(defaultRepoOptions)) as GitHubRepoOptions;
    testRepoProp.description = 'This is the test repository';
    createGitRepo('test-repo', testRepoProp, gitHubProvider, owner);
}
