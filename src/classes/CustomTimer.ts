class CustomTimer {
    public readonly totalTime: number;
    private _timeout: Timer | undefined;
    private _startTime: number;
    private callback: () => void;

    constructor(callback: () => void, delay: number) {
        this.callback = callback;
        this.totalTime = delay;
        this._startTime = Date.now();
        this._timeout = undefined;
    }

    public get remaining() : number {
        return this.totalTime - this.elapsed;
    }

    public get elapsed() : number{
        return Math.min(this.totalTime, Date.now() - this._startTime);
    }

    public start() {
        clearTimeout(this._timeout);
        this._startTime = Date.now();
        this._timeout = setTimeout(this.callback, this.totalTime);
    }

    public stop() {
        clearTimeout(this._timeout);
    }
}

export { CustomTimer }