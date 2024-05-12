import * as pulumiVault from '@pulumi/vault';
import fs from 'fs';

function getVaultProvider(): pulumiVault.Provider {
    const envfile = fs.readFileSync('.env', 'utf8');

    const envs = envfile.split('\n');

    envs.forEach((env) => {
        const [key, value] = env.split('=');
        process.env[key] = value;
    });

    const vaultSource = new pulumiVault.Provider('vault-source', {
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
