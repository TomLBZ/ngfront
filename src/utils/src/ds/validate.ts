export class StructValidator {
    static hasFields(obj: any, keys: Array<string>): boolean {
        return keys.every((k: string) => obj.hasOwnProperty(k));
    }
    static hasNonEmptyFields(obj: any, keys: Array<string>): boolean {
        return keys.every((k: string) => obj.hasOwnProperty(k) && obj[k] !== null && obj[k] !== undefined);
    }
}