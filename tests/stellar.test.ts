import { describe, it, expect, vi } from 'vitest';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  NETWORKS,
  fundAccountWithFriendbot,
  fetchAccountBalance,
  decodeXDRString,
  generateTestKeypair,
} from '../src/services/stellar';

describe('Stellar Service QA Suite', () => {
  describe('generateTestKeypair', () => {
    it('generates a valid Stellar keypair with Ed25519 public key format', () => {
      const keypair = generateTestKeypair();
      expect(keypair).toBeDefined();
      expect(keypair.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
      expect(keypair.secretKey).toMatch(/^S[A-Z0-9]{55}$/);
      expect(keypair.publicKey.length).toBe(56);
      expect(keypair.secretKey.length).toBe(56);
    });

    it('generates unique keypairs on consecutive invocations', () => {
      const pair1 = generateTestKeypair();
      const pair2 = generateTestKeypair();
      expect(pair1.publicKey).not.toBe(pair2.publicKey);
      expect(pair1.secretKey).not.toBe(pair2.secretKey);
    });
  });

  describe('decodeXDRString', () => {
    it('throws an error when provided an empty or whitespace-only string', () => {
      expect(() => decodeXDRString('')).toThrow('Please enter a non-empty XDR string');
      expect(() => decodeXDRString('   ')).toThrow('Please enter a non-empty XDR string');
    });

    it('successfully decodes valid ScVal boolean XDR', () => {
      const scVal = StellarSdk.nativeToScVal(true);
      const b64 = scVal.toXDR('base64');
      const decoded = decodeXDRString(b64);
      expect(decoded).toBeDefined();
      expect(decoded.type).toBe('Soroban ScVal');
      expect(decoded.json).toBe('scvBool');
    });

    it('gracefully returns Raw XDR fallback when given unknown binary string', () => {
      const rawUnknown = 'AAAAAAEBAQ==';
      const decoded = decodeXDRString(rawUnknown);
      expect(decoded).toBeDefined();
      expect(decoded.raw).toBe(rawUnknown);
    });
  });

  describe('NETWORKS configuration', () => {
    it('defines all required network profiles with correct endpoints', () => {
      expect(NETWORKS.mainnet).toBeDefined();
      expect(NETWORKS.testnet).toBeDefined();
      expect(NETWORKS.futurenet).toBeDefined();
      expect(NETWORKS.local).toBeDefined();

      expect(NETWORKS.testnet.horizonUrl).toContain('horizon-testnet.stellar.org');
      expect(NETWORKS.testnet.sorobanRpcUrl).toContain('soroban-testnet.stellar.org');
      expect(NETWORKS.testnet.friendbotUrl).toBeDefined();
    });
  });

  describe('fundAccountWithFriendbot', () => {
    it('returns failure when friendbotUrl is not configured on network', async () => {
      const result = await fundAccountWithFriendbot(NETWORKS.mainnet, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('handles network failure gracefully without crashing', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await fundAccountWithFriendbot(NETWORKS.testnet, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to connect to Friendbot');
      vi.unstubAllGlobals();
    });
  });

  describe('fetchAccountBalance', () => {
    it('returns default fallback when account is unfunded or throws 404', async () => {
      const balance = await fetchAccountBalance(NETWORKS.testnet, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
      expect(balance).toBe('0 XLM (Unfunded)');
    });
  });
});
