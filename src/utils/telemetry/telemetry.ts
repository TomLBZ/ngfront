export interface TelemetryAPIResponse {
    battery: number;
    home_pos: {
        lat: string;
        lon: string;
        alt: string;
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
    // {
    //     "battery": 12.4,
    //     "home_pos": {
    //         "lat": "1.363",
    //         "lon": "103.822872",
    //         "alt": "15"
    //     },
    //     "curr_pos": {
    //         "lat": 1.3627777,
    //         "lon": 103.8235965,
    //         "alt": 482.504639,
    //         "hdg": 198.441257,
    //         "speed": 23.13,
    //         "course": 196.3,
    //         "climb": -0.126916,
    //     },
    //     "airspeed": 0,
    //     "groundspeed": 0,
    //     "throttle": 84,
    //     "attitude": {
    //         "roll": 0.590449,
    //         "pitch": -2.717998,
    //         "yaw": -0.019
    //     }
    // }
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
        this.homeLat = parseFloat(data.home_pos.lat); // TODO: after API update, change to number
        this.homeLon = parseFloat(data.home_pos.lon);
        this.homeAlt = parseFloat(data.home_pos.alt);
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