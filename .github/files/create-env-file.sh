#!/usr/bin/env bash
set -e

echo -n "${ROOT_CA_CERTIFICATE_CONTENT_BASE64}" |
    base64 -d | tee /tmp/vault-ca.crt >/dev/null
echo -n "${VAULT_CLIENT_PRIVATE_KEY_CONTENT_BASE64}" |
    base64 -d | tee /tmp/vault-key.crt >/dev/null
echo -n "${VAULT_CLIENT_CERTIFICATE_CONTENT_BASE64}" |
    base64 -d | tee /tmp/vault-cert.crt >/dev/null

echo "VAULT_ADDR=${VAULT_ADDR}" | tee .env >/dev/null
echo "VAULT_APPROLE_ROLE_ID=${VAULT_APPROLE_ROLE_ID}" | tee -a .env >/dev/null
echo "VAULT_APPROLE_SECRET_ID=${VAULT_APPROLE_SECRET_ID}" | tee -a .env >/dev/null
echo "VAULT_CLIENT_CERTIFICATE=/tmp/vault-cert.crt" | tee -a .env >/dev/null
echo "VAULT_CLIENT_PRIVATE_KEY=/tmp/vault-key.crt" | tee -a .env >/dev/null
echo "ROOT_CA_CERTIFICATE=/tmp/vault-ca.crt" | tee -a .env >/dev/null
