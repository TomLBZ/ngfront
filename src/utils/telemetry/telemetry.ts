export interface TelemetryResponseInstance {
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
export interface TelemetryAPIResponse {
    [key: number]: TelemetryResponseInstance;
}
export class TelemetryInstance {
    id: number = 0;
    roll: number = 0;
    pitch: number = 0;
    yaw: number = 0;
    lat: number = 0;
    lon: number = 0;
    alt: number = 0;
    hdg: number = 0;
    agl: number = 0;
    speed: number = 0;
    course: number = 0;
    climb: number = 0;
    throttle: number = 0;
    constructor(data: TelemetryResponseInstance, id: number) {
        this.id = id;
        this.roll = data.roll;
        this.pitch = data.pitch;
        this.yaw = data.yaw;
        this.lat = data.lat;
        this.lon = data.lon;
        this.alt = data.alt;
        this.hdg = data.hdg;
        this.agl = data.agl;
        this.speed = data.speed;
        this.course = data.course;
        this.climb = data.climb;
        this.throttle = data.throttle;
    }
    public static fromAPIResponse(data: TelemetryAPIResponse): Array<TelemetryInstance> {
        const instances: Array<TelemetryInstance> = [];
        for (const key in data) {
            instances.push(new TelemetryInstance(data[key], parseInt(key)));
        }
        return instances;
    }
}