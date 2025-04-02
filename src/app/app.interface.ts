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
    airframe_type: number;
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
export interface LogEntry {
    ac_id: number;
    alt: number;
    datetime: string;
    lat: number;
    lng: number;
    pitch: number;
    roll: number;
    speed: number;
    yaw: number;
}
export interface MissionMetadata {
    mission_start_time: string;
    takeoff_start_time: string;
    takeoff_completion_time: string;
    lead_mission_start_time: string;
    lead_mission_completed_time: string;
}