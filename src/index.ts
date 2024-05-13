import * as pulumi from '@pulumi/pulumi';
import getVaultProvider from './utils/hashicorp-vault.js';
import { createArpanrecGitHubRepo } from './arpanrec.js';
import 'dotenv/config';

const project = pulumi.getProject();
const stack = pulumi.getStack();

if (stack !== 'production') {
    process.exit(1);
}

const vaultProvider = getVaultProvider();

vaultProvider.id.apply(async (vaultProviderId) => {
    await createArpanrecGitHubRepo(vaultProvider, vaultProviderId);
});
