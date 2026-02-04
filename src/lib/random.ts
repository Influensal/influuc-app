
// Linear Congruential Generator (LCG) for deterministic pseudo-random numbers
// Allows us to generate the exact same "random" visual for a specific slide ID.

export class SeededRandom {
    private seed: number;

    constructor(seed: string | number) {
        if (typeof seed === 'string') {
            // Hash string to number
            let h = 2166136261;
            for (let i = 0; i < seed.length; i++) {
                h ^= seed.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            this.seed = h >>> 0;
        } else {
            this.seed = seed;
        }
    }

    // Returns float between 0 and 1
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Returns float between min and max
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    // Returns true/false based on probability
    chance(probability: number): boolean {
        return this.next() < probability;
    }

    // Pick random item from array
    pick<T>(array: T[]): T {
        return array[Math.floor(this.next() * array.length)];
    }
}
