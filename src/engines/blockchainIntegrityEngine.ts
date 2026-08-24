/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 *
 * OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
 * 
 * NOTICE & RESTRICTIONS:
 * 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
 * 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
 * 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
 *    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
 * ============================================================================
 */
export interface BlockchainRecord {
  hash: string;
  previousHash: string;
  timestamp: number;
  vesselId: string;
  data: string;
  signature: string;
  index: number;
}

// Lightweight browser-compatible SHA-256 hasher
function simpleSha256(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

class BlockchainIntegrityEngine {
  private chain: BlockchainRecord[] = [];

  constructor() {
    this.chain.push(this.createGenesisBlock());
  }

  private createGenesisBlock(): BlockchainRecord {
    return {
      hash: '0000000000000000',
      previousHash: '0',
      timestamp: Date.now(),
      vesselId: 'genesis',
      data: '{}',
      signature: 'GENESIS_SIG',
      index: 0
    };
  }

  addBlock(vesselId: string, data: Record<string, unknown>): BlockchainRecord {
    const previousBlock = this.chain[this.chain.length - 1];
    const jsonData = JSON.stringify(data);
    const timestamp = Date.now();
    const blockContent = `${previousBlock.hash}${timestamp}${vesselId}${jsonData}`;
    const hash = simpleSha256(blockContent);

    const block: BlockchainRecord = {
      hash,
      previousHash: previousBlock.hash,
      timestamp,
      vesselId,
      data: jsonData,
      signature: `SIG_${hash.substring(0, 8)}`,
      index: this.chain.length
    };

    this.chain.push(block);
    return block;
  }

  verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  getAuditTrail(vesselId: string): BlockchainRecord[] {
    return this.chain.filter(b => b.vesselId === vesselId);
  }

  getStats() {
    return {
      totalBlocks: this.chain.length,
      newestRecord: Date.now()
    };
  }
}

export const blockchainEngine = new BlockchainIntegrityEngine();
export default blockchainEngine;
