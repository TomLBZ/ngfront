import { Routes } from '@angular/router';
import { PlaygroundPage } from './playground/playground';
import { ObjEditingPage } from './obj_editing/obj_editing';
import { DropSelectPage } from './drop_select/drop_select';
import { ControlsPage } from './controls/controls';
import { PathEditPage } from './path_edit/path_edit';
import { LogsPage } from './logs/logs';
import { MonitorPage } from './monitor/monitor';

export const routes : Routes = [
    {path: '', redirectTo: 'playground', pathMatch: 'full'},
    {path: 'playground', component: PlaygroundPage},
    {path: 'object-editing', component: ObjEditingPage},
    {path: 'drop-select', component: DropSelectPage},
    {path: 'controls', component: ControlsPage},
    {path: 'monitor', component: MonitorPage},
    {path: 'path-edit', component: PathEditPage},
    {path: 'logs', component: LogsPage}
]