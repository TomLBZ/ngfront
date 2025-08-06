import { ApiBridge } from "../utils/br";
import { DictS, Func } from "../utils/types";
import { Aircraft, ConfigFile, LogMetadataQuery, Mission, MissionSettings, ReplayData } from "./app.interface";

export class AeroBridge extends ApiBridge {
    protected override readonly funcMap: DictS<Func<any, Promise<any>>> = {
        "health": (data?: any) => this.getHealth(data),
        "mission/current": (data?: any) => this.getCurrentMission(data),
        "mission/all": (data?: any) => this.getMissionConfigurations(data),
        "mission/start": (data?: any) => this.getLaunchMission(data),
        "mission/stop": (data?: any) => this.getStopMission(data),
        "mission/changelead": (data?: any) => this.getChangeMissionLead(data),
        "mission/create": (data?: any) => this.postMissionConfiguration(data),
        "mission/update": (data?: any) => this.putMissionConfiguration(data),
        "mission/delete": (data?: any) => this.deleteMissionConfiguration(data),
        "sim/stop": (data?: any) => this.getStopSimulation(data),
        "sim/reset": (data?: any) => this.getResetSimulationConfigFiles(data),
        "sim/joystick": (data?: any) => this.postAircraftJoystick(data),
        "aircraft/one": (data?: any) => this.getAircraftConfiguration(data),
        "aircraft/all": (data?: any) => this.getAircraftConfigurations(data),
        "aircraft/create": (data?: any) => this.postAircraftConfiguration(data),
        "aircraft/update": (data?: any) => this.putAircraftConfiguration(data),
        "aircraft/delete": (data?: any) => this.deleteAircraftConfiguration(data),
        "aircraft/compile": (data?: any) => this.getSetupSimulation(data),
        "aircraft/maxparams": (data?: any) => this.getAircraftMaxParams(data),
        "files/all": (data?: any) => this.getSimulationFilesConfig(data),
        "files/current": (data?: any) => this.getMissionSettings(data),
        "files/upload": (data?: any) => this.postUploadNewSimulationFile(data),
        "files/download": (data?: any) => this.getDownloadSimulationFile(data),
        "files/delete": (data?: any) => this.deleteSimulationFile(data),
        "files/apply": (data?: any) => this.putMissionSettings(data),
        "logs/dates": (data?: any) => this.getMissionLogDates(data),
        "logs/metadata": (data?: any) => this.getLoggedMissionMetadata(data),
        "logs/download": (data?: any) => this.getDownloadMissionLog(data),
        "logs/delete": (data?: any) => this.deleteMissionLog(data),
        "logs/replay": (data?: any) => this.getReplayMissionLog(data),
    }
    // GETs
    private getHealth(_: any): Promise<any> {
        return this.get(`${this.url}/health`);
    }
    private getCurrentMission(_: any): Promise<any> {
        return this.get(`${this.url}/current_mission`);
    }
    private getMissionConfigurations(_: any): Promise<any> {
        return this.get(`${this.url}/mission_configurations`);
    }
    private getLaunchMission(data: any): Promise<any> {
        return this.get(`${this.url}/launch_mission/${data.id}`, data.params);
    }
    private getStopMission(_: any): Promise<any> {
        return this.get(`${this.url}/stop_mission`);
    }
    private getChangeMissionLead(id: number): Promise<any> {
        return this.get(`${this.url}/change_mission_lead/${id}`);
    }
    private getStopSimulation(_: any): Promise<any> {
        return this.get(`${this.url}/stop_simulation`);
    }
    private getResetSimulationConfigFiles(_: any): Promise<any> {
        return this.get(`${this.url}/reset_simulation_config_files`);
    }
    private getAircraftConfiguration(data: any): Promise<any> {
        return this.get(`${this.url}/aircraft_configuration/${data.id}`);
    }
    private getAircraftConfigurations(_: any): Promise<any> {
        return this.get(`${this.url}/aircraft_configurations`);
    }
    private getSetupSimulation(_: any): Promise<any> {
        return this.get(`${this.url}/setup_simulation`);
    }
    private getSimulationFilesConfig(_: any): Promise<any> {
        return this.get(`${this.url}/simulation_files_config`);
    }
    private getDownloadSimulationFile(data: ConfigFile): Promise<any> {
        return this.get(`${this.url}/download_simulation_file/${data.id}/${data.type.file_type}/${data.type.airframe_type}`);
    }
    private getMissionLogDates(_: any): Promise<any> {
        return this.get(`${this.url}/mission_log_dates`);
    }
    private getLoggedMissionMetadata(data: LogMetadataQuery): Promise<any> {
        if (data.time !== undefined)
            return this.get(`${this.url}/mission_log_meta_data/${data.date}/${data.name}/${data.time}`);
        else if (data.name !== undefined)
            return this.get(`${this.url}/logged_missions/${data.date}/${data.name}`);
        else if (data.date !== undefined)
            return this.get(`${this.url}/logged_missions/${data.date}`);
        else return new Promise((_, reject) => {
            reject(new Error("Invalid log metadata query"));
        }
    );
    }
    private getDownloadMissionLog(data: LogMetadataQuery): Promise<any> {
        const params = { ac_id: data.id ? data.id : 0, include_flocking_logs: data.include_flocking_logs ? data.include_flocking_logs : false };
        return this.get(`${this.url}/download_mission_log/${data.date}/${data.name}/${data.time}`, params);
    }
    private getReplayMissionLog(data: ReplayData): Promise<any> {
        const params = { fg_enable: data.fg_enable, delay: data.delay };
        return this.get(`${this.url}/replay_mission_log/${data.date}/${data.name}/${data.time}`, params);
    }
    private getAircraftMaxParams(id: number): Promise<any> {
        return this.get(`${this.url}/plane${id}/max_alt_speed`);
    }
    private getMissionSettings(_: any): Promise<any> {
        return this.get(`${this.url}/mission_settings`);
    }
    // PUTs
    private putMissionConfiguration(data: Mission): Promise<any> {
        return this.put(`${this.url}/mission_configuration/${data.id}`, data);
    }
    private putMissionSettings(data: MissionSettings): Promise<any> {
        return this.put(`${this.url}/mission_settings`, data);
    }
    private putAircraftConfiguration(data: Aircraft): Promise<any> {
        return this.put(`${this.url}/aircraft_configuration/${data.id}`, data);
    }
    // DELETEs
    private deleteMissionConfiguration(id: number): Promise<any> {
        return this.delete(`${this.url}/mission_configuration/${id}`);
    }
    private deleteAircraftConfiguration(id: number): Promise<any> {
        return this.delete(`${this.url}/aircraft_configuration/${id}`);
    }
    private deleteSimulationFile(data: ConfigFile): Promise<any> {
        return this.delete(`${this.url}/delete_simulation_file/${data.id}/${data.type.file_type}/${data.type.airframe_type}`);
    }
    private deleteMissionLog(data: LogMetadataQuery): Promise<any> {
        if (data.time !== undefined && data.time.length > 0)
            return this.delete(`${this.url}/mission_log/${data.date}/${data.name}/${data.time}`);
        else if (data.name !== undefined && data.name.length > 0)
            return this.delete(`${this.url}/mission_log/${data.date}/${data.name}`);
        else if (data.date !== undefined && data.date.length > 0)
            return this.delete(`${this.url}/mission_log/${data.date}`);
        else return this.delete(`${this.url}/mission_log`);
    }
    // POSTs
    private postMissionConfiguration(data: Mission): Promise<any> {
        return this.post(`${this.url}/mission_configuration`, data);
    }
    private postAircraftConfiguration(data: Aircraft): Promise<any> {
        return this.post(`${this.url}/aircraft_configuration`, data);
    }
    private postUploadNewSimulationFile(data: any): Promise<any> {
        return this.post(`${this.url}/upload_new_simulation_file`, data);
    }
    private postAircraftJoystick(data: any): Promise<any> {
        return this.post(`${this.url}/plane${data.id}/joystick`, { "data": data.joystick });
    }
}