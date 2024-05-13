import * as vault from '@pulumi/vault';
import * as fs from 'fs';
import path from 'path';

function getVaultProvider(resourceUniqueIdPrefix: string): vault.Provider {
    var vaultCertDir = `/tmp/${resourceUniqueIdPrefix}`;

    if (!fs.existsSync(vaultCertDir)) {
        fs.mkdirSync(vaultCertDir, { recursive: true });
    }

    const certfiles: Record<string, string> = {
        'client_certificate.pem': process.env.VAULT_CLIENT_CERTIFICATE || '',
        'client_private_key.pem': process.env.VAULT_CLIENT_PRIVATE_KEY || '',
        'root_ca_certificate.pem': process.env.ROOT_CA_CERTIFICATE || '',
    };

    Object.keys(certfiles).forEach((destination) => {
        const source = certfiles[destination];
        if (!source || source === '') {
            throw new Error(`Missing required certificate file: ${destination}`);
        }
        fs.copyFileSync(source, path.join(vaultCertDir, destination));
    });

    const vaultSource = new vault.Provider(`vault-${resourceUniqueIdPrefix}`, {
        address: process.env.VAULT_ADDR || '',
        token: 'bug',
        clientAuth: {
            certFile: path.join(vaultCertDir, 'client_certificate.pem'),
            keyFile: path.join(vaultCertDir, 'client_private_key.pem'),
        },
        caCertFile: path.join(vaultCertDir, 'root_ca_certificate.pem'),
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
