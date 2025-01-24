export class Mission {
    id: number;
    name: string;
    description: string = "";
    saved_at: Date = new Date();
    type: string = "waypoint";
    radius: number = -1;
    duration: number = 0;
    path: Array<{lat: number, lon: number, alt: number}> = [];
    leader: number = 0;
    followers: Array<number> = [];
    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        console.log(this);
    }
    setParams(config: any) {
        if (config.id) this.id = config.id;
        if (config.name) this.name = config.name;
        if (config.description) this.description = config.description;
        if (config.saved_at) this.saved_at = config.saved_at;
        if (config.type) this.type = config.type;
        if (config.radius) this.radius = config.radius;
        if (config.duration) this.duration = config.duration;
        if (config.path) this.path = config.path;
        if (config.leader) this.leader = config.leader;
        if (config.followers) this.followers = config.followers;
    }
}