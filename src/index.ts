import * as pulumi from '@pulumi/pulumi';
import getVaultProvider from './utils/hashicorp-vault.js';
import { createArpanrecGitHubRepo } from './arpanrec.js';
import 'dotenv/config';

const project = pulumi.getProject();
const stack = pulumi.getStack();
console.log(`Project: ${project}, Stack: ${stack}`);

if (stack !== 'production') {
    console.error('Stack is not production');
    process.exit(1);
}

const vaultProvider = getVaultProvider();

await createArpanrecGitHubRepo(vaultProvider);
