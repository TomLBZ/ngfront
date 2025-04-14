import { Prime } from "./prime";
import { HashMode } from "../../math";

export class Hash {

    public static mode: HashMode = HashMode.PrimeHash;

    public static nToFrac(n: number) {
        const mapped = n >= 0 ? (n + 2) / (n + 1) : 1 / (-n + 1); // map positive numbers to (1, 2), 0 to 1, negative numbers to (0, 1)
        return mapped / 2; // negative -> (0, 0.5), 0 -> 0.5, positive -> (0.5, 1)
    }

    private static primeHash(features: number[]): number {
        const len = features.length;
        const primes = Prime.getN(len);
        const hash = features.reduce((acc, val, idx) => acc * Math.pow(primes[idx], Hash.nToFrac(val)), 1);
        return hash;
    }

    private static stringHash(features: number[]): number {
        const str = features.join('');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    public static hash(features: number[]): number {
        switch (Hash.mode) {
            case HashMode.StringHash:
                return Hash.stringHash(features);
            default:
                return Hash.primeHash(features);
        }
    }
}