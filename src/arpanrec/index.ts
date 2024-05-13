import * as vault from '@pulumi/vault';
import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';
import { GitHubRepoOptions, createGitRepo } from '../utils/github-repo.js';

async function createGitHubRepos(vaultSourceProvider: vault.Provider, resourceUniqueIdPrefix: string): Promise<void> {
    const vaultHost = vaultSourceProvider.address.apply((addr) => {
        const url = new URL(addr);
        return url.hostname;
    });

    const vaultClientSecret = new vault.pkisecret.SecretBackendCert(
        `vault-github-client-cert-${resourceUniqueIdPrefix}`,
        {
            backend: 'pki',
            commonName: vaultHost,
            name: 'vault_client_certificate',
        },
        {
            provider: vaultSourceProvider,
            dependsOn: [vaultSourceProvider],
        }
    );

    const vaultClientCertPemBase64 = vaultClientSecret.certificate.apply((certificate) => {
        certificate = certificate;
        return vaultClientSecret.caChain.apply((caChain) => {
            const vaultClientCertPem = `${certificate}\n${caChain}`;
            const vaultClientCertPemBase64 = Buffer.from(vaultClientCertPem, 'binary').toString('base64');
            return vaultClientCertPemBase64;
        });
    });

    const vaultClientKeyPemBase64 = vaultClientSecret.privateKey.apply((privateKey) => {
        const vaultClientKeyPemBase64 = Buffer.from(privateKey, 'binary').toString('base64');
        return vaultClientKeyPemBase64;
    });

    const approleSecretID = new vault.approle.AuthBackendRoleSecretId(
        `vault-github-approle-${resourceUniqueIdPrefix}`,
        {
            backend: 'approle',
            roleName: 'github-master-controller',
            metadata: JSON.stringify({
                data: 'pulumi-github-provider',
            }),
        },
        {
            provider: vaultSourceProvider,
            dependsOn: [vaultSourceProvider],
        }
    );

    const roleID = await vault.approle.getAuthBackendRoleId(
        {
            backend: 'approle',
            roleName: 'github-master-controller',
        },
        {
            provider: vaultSourceProvider,
            async: true,
        }
    );

    const actionSecrets: Record<string, pulumi.Output<string>> = {
        VAULT_ADDR: vaultSourceProvider.address,
        VAULT_CLIENT_CERTIFICATE_CONTENT_BASE64: vaultClientCertPemBase64,
        VAULT_CLIENT_PRIVATE_KEY_CONTENT_BASE64: vaultClientKeyPemBase64,
        VAULT_APPROLE_SECRET_ID: approleSecretID.secretId,
        VAULT_APPROLE_ROLE_ID: pulumi.output(roleID.roleId),
        ROOT_CA_CERTIFICATE_CONTENT_BASE64: vaultClientCertPemBase64,
    };

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
        actionSecrets: actionSecrets,
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
