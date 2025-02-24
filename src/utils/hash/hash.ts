import { Prime } from "../prime/prime";

export class HashMode {
    public static readonly PrimeHash: number = 0;
    public static readonly StringHash: number = 1;
}

export class Hash {

    public static mode: HashMode = HashMode.PrimeHash;

    public static smallNotation(n: number) {
        if (n === 0) return 0;
        if (n < 0) n = -1 / n;
        const lg = Math.log10(n);
        const lgn = (isNaN(lg) || !isFinite(lg)) ? Math.random() : lg;
        const exponent = Math.floor(lgn) + 1;
        const mantissa = n / Math.pow(10, exponent); // mantissa < 1
        return exponent + mantissa; // a decimal number with the exponent as the integer part
    }

    private static primeHash(features: number[]): number {
        const len = features.length;
        const primes = Prime.getN(len);
        const hash = features.reduce((acc, val, idx) => acc * Math.pow(primes[idx], Hash.smallNotation(val)), 1);
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