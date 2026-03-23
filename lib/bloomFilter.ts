class BloomFilter {
  private bitArray: Uint8Array;
  private size: number;
  private hashCount: number;

  constructor(expectedItems: number = 100000, falsePositiveRate: number = 0.01) {
    this.size = Math.ceil(-(expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.log(2));
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  private hash(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    }
    return ((h ^ (h >>> 16)) >>> 0) % this.size;
  }

  add(identifier: string) {
    const normalized = String(identifier).toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this.hash(normalized, i);
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      this.bitArray[byteIndex] |= (1 << bitIndex);
    }
  }

  mightBeDuplicate(identifier: string): boolean {
    const normalized = String(identifier).toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this.hash(normalized, i);
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  bulkAdd(identifiers: string[]) {
    identifiers.forEach(id => this.add(id));
  }

  clear() {
    this.bitArray.fill(0);
  }
}

export const duplicateFilter = new BloomFilter(100000, 0.01);
export { BloomFilter };
