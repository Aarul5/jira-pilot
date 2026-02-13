export class Spinner {
    timer = null;
    frameIndex = 0;
    frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    text;
    constructor(text) {
        this.text = typeof text === 'string' ? text : (text?.text || '');
    }
    start(text) {
        if (text)
            this.text = text;
        this.frameIndex = 0;
        // Only start animation if TTY and not CI (basic check)
        if (process.stdout.isTTY) {
            this.timer = setInterval(() => {
                const frame = this.frames[this.frameIndex];
                this.frameIndex = (this.frameIndex + 1) % this.frames.length;
                this.write(`\r${frame} ${this.text}`);
            }, 80);
        }
        else {
            console.log(this.text);
        }
        return this;
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.clearLine();
        }
        return this;
    }
    succeed(text) {
        this.stop();
        const msg = text || this.text;
        console.log(`${this.color('green', '✔')} ${msg}`);
        return this;
    }
    fail(text) {
        this.stop();
        const msg = text || this.text;
        console.log(`${this.color('red', '✖')} ${msg}`);
        return this;
    }
    info(text) {
        this.stop();
        console.log(`${this.color('blue', 'ℹ')} ${text || this.text}`);
        return this;
    }
    warn(text) {
        this.stop();
        console.log(`${this.color('yellow', '⚠')} ${text || this.text}`);
        return this;
    }
    clearLine() {
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }
    write(str) {
        process.stdout.write(str);
    }
    color(color, str) {
        const colors = {
            green: '\x1b[32m',
            red: '\x1b[31m',
            blue: '\x1b[34m',
            yellow: '\x1b[33m',
            reset: '\x1b[0m'
        };
        return `${colors[color] || ''}${str}${colors.reset}`;
    }
}
export default function ora(options = '') {
    return new Spinner(options);
}
//# sourceMappingURL=spinner.js.map