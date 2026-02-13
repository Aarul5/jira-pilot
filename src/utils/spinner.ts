export class Spinner {
    private timer: NodeJS.Timeout | null = null;
    private frameIndex = 0;
    private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    public text: string;

    constructor(text: string | { text: string }) {
        this.text = typeof text === 'string' ? text : (text?.text || '');
    }

    start(text?: string): Spinner {
        if (text) this.text = text;
        this.frameIndex = 0;
        // Only start animation if TTY and not CI (basic check)
        if (process.stdout.isTTY) {
            this.timer = setInterval(() => {
                const frame = this.frames[this.frameIndex];
                this.frameIndex = (this.frameIndex + 1) % this.frames.length;
                this.write(`\r${frame} ${this.text}`);
            }, 80);
        } else {
            console.log(this.text);
        }
        return this;
    }

    stop(): Spinner {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.clearLine();
        }
        return this;
    }

    succeed(text?: string): Spinner {
        this.stop();
        const msg = text || this.text;
        console.log(`${this.color('green', '✔')} ${msg}`);
        return this;
    }

    fail(text?: string): Spinner {
        this.stop();
        const msg = text || this.text;
        console.log(`${this.color('red', '✖')} ${msg}`);
        return this;
    }

    info(text?: string): Spinner {
        this.stop();
        console.log(`${this.color('blue', 'ℹ')} ${text || this.text}`);
        return this;
    }

    warn(text?: string): Spinner {
        this.stop();
        console.log(`${this.color('yellow', '⚠')} ${text || this.text}`);
        return this;
    }

    private clearLine() {
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }

    private write(str: string) {
        process.stdout.write(str);
    }

    private color(color: string, str: string): string {
        const colors: any = {
            green: '\x1b[32m',
            red: '\x1b[31m',
            blue: '\x1b[34m',
            yellow: '\x1b[33m',
            reset: '\x1b[0m'
        };
        return `${colors[color] || ''}${str}${colors.reset}`;
    }
}

export default function ora(options: string | { text: string } = '') {
    return new Spinner(options);
}
