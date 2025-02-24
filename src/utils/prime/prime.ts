export class Prime {
    private static _primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    static getN(n: number): Array<number> {
        if (n <= 0) return [];
        else if (n <= Prime._primes.length) {
            return Prime._primes.slice(0, n);
        }
        let num = Prime._primes[Prime._primes.length - 1] + 2; // start from the next odd number
        let len = Prime._primes.length;
        while (len < n) {
            let isPrime = true;
            for (let i = 0; i < len; i++) {
                if (Prime._primes[i] * Prime._primes[i] > num) break; // only check up to sqrt(num)
                if (num % Prime._primes[i] === 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                Prime._primes.push(num);
                len++;
            }
            num++;
        }
        return Prime._primes.slice(); // return a copy
    }
    static getLEN(n: number): Array<number> {
        if (n <= 1) return [];
        else if (n === Prime._primes[Prime._primes.length - 1]) return Prime._primes.slice();
        else if (n < Prime._primes[Prime._primes.length - 1]) {
            return Prime._primes.filter(p => p < n);
        }
        let num = Prime._primes[Prime._primes.length - 1] + 2; // start from the next odd number
        while (num <= n) {
            let isPrime = true;
            for (let i = 0; i < Prime._primes.length; i++) {
                if (Prime._primes[i] * Prime._primes[i] > num) break; // only check up to sqrt(num)
                if (num % Prime._primes[i] === 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                Prime._primes.push(num);
            }
            num++;
        }
        return Prime._primes.slice(); // return a copy
    }
    static getLTN(n: number): Array<number> {
        return Prime.getLEN(n - 1);
    }
    static getNth(n: number): number {
        if (n < 0) return 0; // invalid input
        if (n < Prime._primes.length) return Prime._primes[n];
        return Prime.getN(n)[n - 1];
    }
    static getBtwIncl(a: number, b: number): Array<number> {
        if (a > b) { // make sure that a <= b
            const temp = a;
            a = b;
            b = temp;
        }
        if (b < 2) return []; // no prime number
        if (a < 2) a = 2; // start from 2
        return Prime.getLEN(b).filter(p => p >= a);
    }
    static getBtw(a: number, b: number): Array<number> {
        if (a > b) { // make sure that a <= b
            const temp = a;
            a = b;
            b = temp;
        }
        if (b - a < 2) return []; // no prime number in between
        return Prime.getBtwIncl(a + 1, b - 1);
    }
}