export interface TelemetryAPIResponse {
    battery: number;
    home_pos: {
        lat: number;
        lon: number;
        alt: number;
    };
    curr_pos: {
        lat: number;
        lon: number;
        alt: number;
        hdg: number;
        speed: number;
        course: number;
        climb: number;
    };
    airspeed: number;
    groundspeed: number;
    throttle: number;
    attitude: {
        roll: number;
        pitch: number;
        yaw: number;
    };
}
export class Telemetry {
    id: number = 0;
    name: string = "";
    battery: number = 0;
    homeLat: number = 0;
    homeLon: number = 0;
    homeAlt: number = 0;
    currLat: number = 0;
    currLon: number = 0;
    currAlt: number = 0;
    currHdg: number = 0;
    currSpeed: number = 0;
    currCourse: number = 0;
    currClimb: number = 0;
    airspeed: number = 0;
    groundspeed: number = 0;
    throttle: number = 0;
    roll: number = 0;
    pitch: number = 0;
    yaw: number = 0;
    constructor(data: TelemetryAPIResponse, id: number, name: string) {
        this.id = id;
        this.name = name;
        this.battery = data.battery;
        this.homeLat = data.home_pos.lat;
        this.homeLon = data.home_pos.lon;
        this.homeAlt = data.home_pos.alt;
        this.currLat = data.curr_pos.lat;
        this.currLon = data.curr_pos.lon;
        this.currAlt = data.curr_pos.alt;
        this.currHdg = data.curr_pos.hdg;
        this.currSpeed = data.curr_pos.speed;
        this.currCourse = data.curr_pos.course;
        this.currClimb = data.curr_pos.climb;
        this.airspeed = data.airspeed;
        this.groundspeed = data.groundspeed;
        this.throttle = data.throttle;
        this.roll = data.attitude.roll;
        this.pitch = data.attitude.pitch;
        this.yaw = data.attitude.yaw;
    }
}