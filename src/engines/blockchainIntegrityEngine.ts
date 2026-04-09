/**
 * BLOCKCHAIN INTEGRITY ENGINE
 * Cryptographic anchoring of AIS data for tamper detection
 * Immutable audit trail for Coast Guard evidence
 */

import { createHash } from 'crypto';

export interface BlockchainRecord {
  hash: string;
  previousHash: string;
  timestamp: number;
  vesselId: string;
  data: string; // JSON stringified data
  signature: string;
  index: number;
}

/**
 * Simple blockchain for data integrity
 */
class BlockchainIntegrityEngine {
  private chain: BlockchainRecord[] = [];
  private privateKey: string;
  private publicKey: string;

  constructor() {
    // Generate keypair (in production, use proper PKI)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Genesis block
    this.chain.push(this.createGenesisBlock());
  }

  /**
   * Create genesis block
   */
  private createGenesisBlock(): BlockchainRecord {
    return {
      hash: '0',
      previousHash: '0',
      timestamp: Date.now(),
      vesselId: 'genesis',
      data: '{}',
      signature: '0',
      index: 0
    };
  }

  /**
   * Add new data block
   */
  addBlock(vesselId: string, data: Record<string, unknown>): BlockchainRecord {
    const previousBlock = this.chain[this.chain.length - 1];
    const jsonData = JSON.stringify(data);
    const timestamp = Date.now();

    // Create block hash
    const blockContent = `${previousBlock.hash}${timestamp}${vesselId}${jsonData}`;
    const hash = crypto
      .createHash('sha256')
      .update(blockContent)
      .digest('hex');

    // Sign block
    const sign = crypto.createSign('sha256');
    sign.update(blockContent);
    const signature = sign.sign(this.privateKey, 'hex');

    const block: BlockchainRecord = {
      hash,
      previousHash: previousBlock.hash,
      timestamp,
      vesselId,
      data: jsonData,
      signature,
      index: this.chain.length
    };

    this.chain.push(block);
    return block;
  }

  /**
   * Verify chain integrity
   */
  verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify hash chain
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(
          `Block ${i}: previousHash mismatch`,
          currentBlock.previousHash,
          previousBlock.hash
        );
        return false;
      }

      // Verify signature
      const verify = crypto.createVerify('sha256');
      const blockContent = `${currentBlock.previousHash}${currentBlock.timestamp}${currentBlock.vesselId}${currentBlock.data}`;
      verify.update(blockContent);

      const isValid = verify.verify(this.publicKey, currentBlock.signature, 'hex');
      if (!isValid) {
        console.error(`Block ${i}: signature verification failed`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get audit trail for vessel
   */
  getAuditTrail(vesselId: string): BlockchainRecord[] {
    return this.chain.filter(b => b.vesselId === vesselId);
  }

  /**
   * Detect tampering
   */
  detectTampering(): {
    isTampered: boolean;
    tamperedBlocks: number[];
  } {
    const tamperedBlocks: number[] = [];

    for (let i = 1; i < this.chain.length; i++) {
      const block = this.chain[i];
      const blockContent = `${block.previousHash}${block.timestamp}${block.vesselId}${block.data}`;

      // Verify hash
      const expectedHash = crypto
        .createHash('sha256')
        .update(blockContent)
        .digest('hex');

      if (expectedHash !== block.hash) {
        tamperedBlocks.push(i);
      }
    }

    return {
      isTampered: tamperedBlocks.length > 0,
      tamperedBlocks
    };
  }

  /**
   * Export chain for audit
   */
  exportChain(): BlockchainRecord[] {
    return [...this.chain];
  }

  /**
   * Get chain statistics
   */
  getStats(): {
    totalBlocks: number;
    totalVessels: number;
    oldestRecord: number;
    newestRecord: number;
  } {
    const vessels = new Set(this.chain.map(b => b.vesselId));
    const timestamps = this.chain.map(b => b.timestamp);

    return {
      totalBlocks: this.chain.length,
      totalVessels: vessels.size,
      oldestRecord: Math.min(...timestamps),
      newestRecord: Math.max(...timestamps)
    };
  }
}

export const blockchainEngine = new BlockchainIntegrityEngine();
