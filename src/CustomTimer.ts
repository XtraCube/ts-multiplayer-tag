class CustomTimer {
    public readonly totalTime: number;
    private lastTime: number;
    private remaining: number;
    private callback: () => void;

    constructor(callback: () => void, delay: number) {
        this.callback = callback;
        this.lastTime = Date.now();
        this.remaining = -1;
        this.totalTime = delay;
        setInterval(this.update.bind(this), 0);
    }

    private update(){
        if (this.remaining >= 0) {
            const deltaTime = Date.now() - this.lastTime;
            this.lastTime = Date.now();
            this.remaining -= deltaTime;
            
            if (this.remaining < 0) {
                this.callback();
            }
        }
    }

    start() {
        this.remaining = this.totalTime;
        this.lastTime = Date.now();
    }

    stop() {
        this.remaining = -1;
    }

    setCallback(callback: () => void) {
        this.callback = callback;
    }

    getTimeLeft() {
        return this.remaining;
    }
}

export { CustomTimer }