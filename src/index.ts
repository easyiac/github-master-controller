import * as pulumi from '@pulumi/pulumi';
import getVaultProvider from './utils/hashicorp-vault.js';
import { createGitHubRepos } from './arpanrec/index.js';
import 'dotenv/config';

const stack = pulumi.getStack();

if (stack !== 'production') {
    process.exit(1);
}

const vaultSource = getVaultProvider('vaultSource');
await createGitHubRepos(vaultSource, 'arpanrec-vaultSource');
