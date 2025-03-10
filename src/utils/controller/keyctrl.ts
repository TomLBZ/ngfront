export class KeyControlMode {
    public static readonly STATE_ONLY = 0; // tracks the state of a key
    public static readonly EVENT_UP = 1; // triggers an event on key up
    public static readonly EVENT_DOWN = 2; // triggers an event on key down
    public static readonly EVENT_PRESS = 4; // triggers an event on key press
    public static readonly EVENT_EDGE = 3; // triggers an event on key edge (up & down)
}
export class KeyController {
    private keyStates: Map<string, boolean> = new Map<string, boolean>();
    private upCallbacks: Map<string, Function> = new Map<string, Function>();
    private downCallbacks: Map<string, Function> = new Map<string, Function>();
    private pressCallbacks: Map<string, Function> = new Map<string, Function>();
    constructor(public mode: number = KeyControlMode.STATE_ONLY) {
        window.addEventListener("keydown", (e) => this.onWindowKey(e, KeyControlMode.EVENT_DOWN));
        window.addEventListener("keyup", (e) => this.onWindowKey(e, KeyControlMode.EVENT_UP));
        window.addEventListener("keypress", (e) => this.onWindowKey(e, KeyControlMode.EVENT_PRESS));
    }
    private onWindowKey(e: KeyboardEvent, eMode?: number) {
        const keyUpEnabled = (this.mode & KeyControlMode.EVENT_UP) === KeyControlMode.EVENT_UP;
        const keyDownEnabled = (this.mode & KeyControlMode.EVENT_DOWN) === KeyControlMode.EVENT_DOWN;
        const keyPressEnabled = (this.mode & KeyControlMode.EVENT_PRESS) === KeyControlMode.EVENT_PRESS;
        if (eMode === KeyControlMode.EVENT_UP) {
            this.keyStates.set(e.key, false);
            if (keyUpEnabled) this.upCallbacks.get(e.key)?.call(this);
        }
        if (eMode === KeyControlMode.EVENT_DOWN) {
            this.keyStates.set(e.key, true);
            if (keyDownEnabled) this.downCallbacks.get(e.key)?.call(this);
        }
        if (eMode === KeyControlMode.EVENT_PRESS && keyPressEnabled) {
            this.pressCallbacks.get(e.key)?.call(this);
        }
    }
    public setKeyCallback(key: string, callback: Function, eMode: number = KeyControlMode.STATE_ONLY) {
        if (eMode & KeyControlMode.EVENT_UP) this.upCallbacks.set(key, callback);
        if (eMode & KeyControlMode.EVENT_DOWN) this.downCallbacks.set(key, callback);
        if (eMode & KeyControlMode.EVENT_PRESS) this.pressCallbacks.set(key, callback);
    }
    public removeKeyCallback(key: string, eMode: number = KeyControlMode.STATE_ONLY) {
        if (eMode & KeyControlMode.EVENT_UP) this.upCallbacks.delete(key);
        if (eMode & KeyControlMode.EVENT_DOWN) this.downCallbacks.delete(key);
        if (eMode & KeyControlMode.EVENT_PRESS) this.pressCallbacks.delete(key);
    }
    public getKeyState(key: string): boolean {
        return this.keyStates.get(key) || false;
    }
}