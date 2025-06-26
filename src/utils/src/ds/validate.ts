export class StructValidator {
    static hasFields(obj: any, keys: Array<string>): boolean {
        return keys.every((k: string) => obj.hasOwnProperty(k));
    }
    static hasNonEmptyFields(obj: any, keys: Array<string>): boolean {
        return keys.every((k: string) => obj.hasOwnProperty(k) && obj[k] !== null && obj[k] !== undefined);
    }
    static buildStruct<T>(obj: T, defaultStruct: T): T {
        if (obj === null || obj === undefined) return defaultStruct;
        // Handle arrays
        if (Array.isArray(defaultStruct)) {
            if (!Array.isArray(obj)) return defaultStruct;
            return obj.map((item, i) =>
                StructValidator.buildStruct(item, defaultStruct[i] ?? defaultStruct[0])
            ) as T;
        }
        // Handle objects
        if (typeof defaultStruct === 'object') {
            const result: any = { ...defaultStruct };
            if (typeof obj !== 'object' || obj === null) return result;
            for (const key in defaultStruct) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = StructValidator.buildStruct((obj as any)[key], (defaultStruct as any)[key]);
                }
            }
            return result;
        }
        // For primitives
        return obj;
    }
}