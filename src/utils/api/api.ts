export interface APIResponse {
    "success": boolean;
    "msg": string;
    "data": any;
}

export type APICallback = (d: APIResponse) => void;
export type APIAnyCallback = (a: any) => void;