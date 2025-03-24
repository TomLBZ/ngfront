export interface APIResponse {
    "success": boolean;
    "msg": string;
    "data": any;
}
export type APICallback = (d: APIResponse) => void;
export type APIAnyCallback = (a: any) => void;

export interface Waypoint {
    alt: number;
    lat: number;
    lon: number;
    toa: number;
}
export interface Mission {
    id: number;
    name: string;
    description: string;
    lead_id: number;
    lead_path: Array<Waypoint>;
    follower_ids: Array<number>;
}
export interface StartPos {
    lat: number;
    lon: number;
    alt: number;
    hdg: number;
}
export interface Aircraft {
    id: number;
    aircraft_type: number;
    name: string;
    start_pos: StartPos;
}
export interface Telemetry {
    id: number;
    roll: number;
    pitch: number;
    yaw: number;
    lat: number;
    lon: number;
    alt: number;
    hdg: number;
    agl: number;
    speed: number;
    course: number;
    climb: number;
    throttle: number;
}
export interface Telemetries {
    [key: number]: Telemetry;
}
export interface RawFileConfig {
    id: number;
    name: string;
    description: string;
    type: {
        file_type: string;
        airframe_type: number | null;
    }
}
export interface DownloadConfig {
    id: number;
    type: {
        file_type: string;
        airframe_type: number | null;
    }
}