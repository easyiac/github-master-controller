import * as pulumiVault from '@pulumi/vault';
import * as pulumiGitHub from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';
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
    const vaultHost = vaultSourceProvider.address.apply((addr) => {
        const url = new URL(addr);
        return url.hostname;
    });

    const vaultClientSecret = new pulumiVault.pkisecret.SecretBackendCert(
        `vault-github-client-cert-${owner}`,
        {
            backend: 'pki',
            commonName: vaultHost,
            name: 'vault_client_certificate',
        },
        {
            provider: vaultSourceProvider,
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

    const approleSecretID = new pulumiVault.approle.AuthBackendRoleSecretId(
        `vault-github-approle-${owner}`,
        {
            backend: 'approle',
            roleName: 'github-master-controller',
            metadata: JSON.stringify({
                data: 'pulumi-github-provider',
            }),
        },
        {
            provider: vaultSourceProvider,
        }
    );

    const roleID = await pulumiVault.approle.getAuthBackendRoleId(
        {
            backend: 'approle',
            roleName: 'github-master-controller',
        },
        {
            provider: vaultSourceProvider,
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
        autoInit: true,
        deleteBranchOnMerge: true,
        gitignoreTemplate: 'Node',
        topics: ['pulumi-managed'],
        defaultBranch: 'main',
        licenseTemplate: 'mit',
        actionSecrets: actionSecrets,
        allowAutoMerge: false,
    };

    const gitHubProvider = await makeGitHubProvider(vaultSourceProvider);

    const testRepoProp = JSON.parse(JSON.stringify(defaultRepoOptions)) as GitHubRepoOptions;
    testRepoProp.description = 'This is the test repository';
    createGitRepo('test-repo', testRepoProp, gitHubProvider, owner);
}
