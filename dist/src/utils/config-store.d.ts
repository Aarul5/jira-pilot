declare class ConfigStore {
    private dir;
    private path;
    constructor(projectName: string);
    ensureDir(): void;
    load(): any;
    save(data: any): void;
    get(key?: string): any;
    set(key: string, value: any): void;
    delete(key: string): void;
    clear(): void;
    get all(): any;
    set all(data: any);
}
export default ConfigStore;
