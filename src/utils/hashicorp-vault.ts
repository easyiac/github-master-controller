import * as vault from '@pulumi/vault';

function getVaultProvider(): vault.Provider {
    const vaultSource = new vault.Provider('vault-source', {
        address: process.env.VAULT_ADDR || '',
        token: 'bug',
        clientAuth: {
            certFile: process.env.VAULT_CLIENT_CERTIFICATE || '',
            keyFile: process.env.VAULT_CLIENT_PRIVATE_KEY || '',
        },
        caCertFile: process.env.ROOT_CA_CERTIFICATE || '',
        authLogin: {
            path: 'auth/approle/login',
            parameters: {
                role_id: process.env.VAULT_APPROLE_ROLE_ID || '',
                secret_id: process.env.VAULT_APPROLE_SECRET_ID || '',
            },
        },
    });
    return vaultSource;
}

export default getVaultProvider;
