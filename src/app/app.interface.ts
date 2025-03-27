export type UniResponseType = 'json' | 'blob'; // | 'text' | 'arraybuffer' are not supported yet
export type FormDataEntry = { name: string, value: FormDataEntryValue };

export interface APIResponse {
    "success": boolean;
    "msg": string;
    "data": any;
}
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
export interface ConfigFileType {
    id?: number;
    file_type: string;
    airframe_type: number;
}
export interface ConfigFile {
    id: number;
    name: string;
    description: string;
    type: ConfigFileType;
}