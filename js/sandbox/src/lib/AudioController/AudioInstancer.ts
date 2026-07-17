import { AudioInstance } from './AudioInstance'
import { logDebug as logDebugGlobal } from './shared';
import { calculateBurstLimiterValues, sanitizeUrl, SlidingTimeLimiter } from './utils'

export type AudioInstancerPublicArgs = {
    /** Audio URL. */
    audioUrl: string,

    /**
     * Whether to preload the audio.
     * @default true
     */
    preload: boolean,

    /** 
     * Whether to only allow a single instance of the sound playing at a time. 
     * @default false
     */
    singleInstance: boolean,

    /** 
     * Initial volume (0-100).
     * @default 100
     */
    volume: boolean,

    /** 
     * Enables audio looping. 
     * @default false
     */
    loop: boolean,
}

/** Controls instancing of the same audio. */
export class AudioInstancer {
    /** Audio URL. */
    private _audioUrl: string

    /** Audio instances that are busy. */
    private _busyWorkers: Set<AudioInstance> = new Set();

    /** Audio instances that are free. */
    private _freeWorkers: AudioInstance[] = [];

    /** Limiter for for sounds count in total. */
    private _totalSoundsLimiter: SlidingTimeLimiter;

    /** Limiter for for sounds per second. */
    private _spsLimiter: SlidingTimeLimiter;

    /** Limiter for for burst sounds per second. */
    private _burstLimiter: SlidingTimeLimiter;

    /** Whether to preload the audio. */
    private _preload: boolean;

    /** Whether to only allow a single instance of the sound playing at a time. */
    private _singleInstance: boolean;

    /** Volume. */
    private _volume: boolean;

    /** Whether the audio looping is enabled. */
    private _loop: boolean;

    /** Audio URL. */
    constructor(args: AudioInstancerPublicArgs & {
        /** Limit for for sounds count in total. */
        totalSoundsLimit: number,

        /** Limit for for sounds per second. */
        spsLimit: number,

        /** Limit for for burst sounds per second. */
        burstLimit: number,
    }) {
        this._audioUrl = sanitizeUrl(args.audioUrl);
        this._totalSoundsLimiter = new SlidingTimeLimiter(1000, args.totalSoundsLimit, false);
        this._spsLimiter = new SlidingTimeLimiter(1000, args.spsLimit, false);

        const burstParams = calculateBurstLimiterValues(args.spsLimit, args.burstLimit);
        this._burstLimiter = new SlidingTimeLimiter(burstParams.burstWindow, burstParams.adjustedBurstLimit, false);

        this._preload = args.preload;
        this._singleInstance = args.singleInstance;
        this._volume = args.volume;
        this._loop = args.loop;


    }

    /** 
     * Attempts to play the audio. Calling this again while the audio is playing will result in a new play.
     * 
     * If audio limits are reached, does nothing.
     * @returns This.
     */
    play(): AudioInstancer {
        const logDebug = (...args: any[]) => {
            if (args[0] && typeof args[0] === "string") {
                args[0] = "[instancer] " + args[0];
            }
            logDebugGlobal(...args);
        }
        logDebug('attempting to play audio: ' + this._audioUrl);

        // check limits
        // burst limiter has priority due to covering the, well, burst window, while other limiters do not.
        if (!this._burstLimiter.free()) { logDebug("skipping play - burst sounds limit hit"); return this; };
        if (!this._totalSoundsLimiter.free()) { logDebug("skipping play - total sounds limit hit"); return this; };
        if (!this._spsLimiter.free()) { logDebug("skipping play - per second sounds limit hit"); return this; };

        // get instance
        let worker: AudioInstance;
        if (this._freeWorkers.length > 0) {
            worker = this._freeWorkers.splice(0, 1)[0];
            logDebug("found free instance id  " + worker.id)
        } else {
            logDebug("no free instance, creating");
            worker = new AudioInstance(this._audioUrl, { preload: this._preload });
            worker.on('free', () => {
                logDebug("instance became free, marking");
                this._busyWorkers.delete(worker);
                this._freeWorkers.push(worker);
            })
        }

        // take instance
        logDebug("marking instance busy id " + worker)
        this._busyWorkers.add(worker);
        
        // todo delay play and limit checks until audio is loaded

        // play
        logDebug("dispatching play");
        worker.play();
        return this;
        const playOk = worker.play();
        if (playOk) {
            this._totalSoundsLimiter.beat();
            this._totalSpsLimiter.beat();
            this._totalBurstSoundsLimiter.beat();
            groupBusy.spsLimiter.beat();
            groupBusy.totalSoundsLimiter.beat();
            groupBusy.burstLimiter.beat();
        }
        logDebug("worker now busy")
    }

    /** 
     * Stops all instances of the audio playing.
     * @returns This.
     */
    stop(): AudioInstancer {
        throw new Error("not impl")
        return this;
    }

    /**
     * Sets volume for all instances of the audio.
     * @param volume Volume (0-100).
     * @returns This.
     */
    setVolume(volume: number): AudioInstancer {
        throw new Error("not impl")
        return this;
    }

    /**
     * Enables audio looping.
     * @returns This.
     */
    loop(): AudioInstancer {
        throw new Error("not impl")
        return this;
    }
}