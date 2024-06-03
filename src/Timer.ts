class CustomTimer {
    private id: Timer | undefined;
    private startTime: Date;
    private totalTime: number;
    private remaining: number;
    private callback: () => void;
    running: boolean = false;

    constructor(callback: () => void, delay: number) {
        this.callback = callback;
        this.startTime = new Date();
        this.remaining = this.totalTime = delay;
    }

    start() {
        this.running = true;
        this.startTime = new Date();
        this.id = setTimeout(this.callback, this.remaining);
    }

    reset() {
        this.running = false;
        this.startTime = new Date();
        this.remaining = this.totalTime;
        clearTimeout(this.id);
    }

    pause() {
        this.running = false;
        this.remaining -= new Date().getTime() - this.startTime.getTime();
        clearTimeout(this.id);
    }

    setCallback(callback: () => void) {
        this.callback = callback;
    }

    setTotalTime(time: number) {
        this.totalTime = time;
    }

    getTimeLeft() {
        return this.remaining;
    }
}

export { CustomTimer }