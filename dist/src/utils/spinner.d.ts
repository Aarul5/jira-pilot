export declare class Spinner {
    private timer;
    private frameIndex;
    private frames;
    text: string;
    constructor(text: string | {
        text: string;
    });
    start(text?: string): Spinner;
    stop(): Spinner;
    succeed(text?: string): Spinner;
    fail(text?: string): Spinner;
    info(text?: string): Spinner;
    warn(text?: string): Spinner;
    private clearLine;
    private write;
    private color;
}
export default function ora(options?: string | {
    text: string;
}): Spinner;
