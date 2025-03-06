export interface APIResponse {
    "success": boolean;
    "msg": string;
    "data": any;
}

export type APICallback = (d: APIResponse) => void;
export type APIErrorCallback = (e: any) => void;
export type APIDataCallback = (d: any) => void;