import * as vault from '@pulumi/vault';
import * as pulumi from '@pulumi/pulumi';

async function createSecrets(
    vaultSourceProvider: vault.Provider,
    resourceUniqueIdPrefix: string
): Promise<Record<string, pulumi.Output<string>>> {
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
    return actionSecrets;
}

export { createSecrets };
