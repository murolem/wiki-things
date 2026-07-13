import Emittery from 'emittery';
import { DeferredPromise } from '../utils/DeferredPromise';
import { noop } from '../utils/noop';

// this is here so that it doesnt get optimized away on build
// @ts-ignore
const DEBUG = window.dummy_value_just_here_to_be_your_buddy_feel_free_to_remove_me_owo || false;

const logDebug = DEBUG
    ? (...args: unknown[]) => {
        if (args[0] && typeof args[0] === "string") {
            args[0] = "[audio-ctrl] " + args[0];
        }
        console.debug(...args)
    }
    : noop;

/** Pool of Audio classes grouped by url. */
export type WorkerPool = Map<string, WorkerGroup>;

/** A group of Audio classes that share the same url (aka workers). */
export type WorkerGroup = {
    /** Sounds limiter for this group for sounds count in total. */
    totalSoundsLimiter: SlidingTimeLimiter,

    /** Sounds limiter for this group for sounds per second. */
    spsLimiter: SlidingTimeLimiter,

    /** Sounds limiter for this group for burst sounds per second. */
    burstLimiter: SlidingTimeLimiter,

    /** Workers in this group. */
    workers: AudioWorker[]
};

export type PreloadResult = {
    /** Plays audio. */
    play: () => void
}

export class AudioController {
    /** Contains audio urls that were loaded. */
    private static _loadedUrls = new Set<string>();

    /** Limit on sounds per second per group. */
    private _groupSpsLimit: number;

    /** Limit on sounds per second in total. */
    private _totalSpsLimiter: SlidingTimeLimiter;

    /** Limit on sounds playing simultaneously in a group. */
    private _groupSoundsLimit: number;

    /** Limit on sounds playing simultaneously in total. */
    private _totalSoundsLimiter: SlidingTimeLimiter;

    /** Limit on sounds starting to play in roughly the same time per group. The window is equal to `1 / groupSpsLimit` seconds. */
    private _groupBurstSoundsLimit: number;

    /** Limit on sounds starting to play in roughly the same time in total. The window is equal to `1 / totalSpsLimit` seconds. */
    private _totalBurstSoundsLimiter: SlidingTimeLimiter;

    /** Pool of busy workers. */
    private _busyPool: WorkerPool = new Map();

    /** Pool of free workers. */
    private _freePool: WorkerPool = new Map();

    constructor(args: {
        /** Limit on sounds per second per group. */
        groupSpsLimit: number,
        /** Limit on sounds per second in total. */
        totalSpsLimit: number,
        /** Limit on sounds playing simultaneously in a group. */
        groupSoundsLimit: number,
        /** Limit on sounds playing simultaneously in total. */
        totalSoundsLimit: number,
        /** Limit on sounds startsing to play in roughly the same time per group. The window is equal to `1 / groupSpsLimit` seconds. */
        groupBurstSoundsLimit: number,
        /** Limit on sounds starting to play in roughly the same time in total. The window is equal to `1 / totalSpsLimit` seconds. */
        totalBurstSoundsLimit: number,
    }) {
        this._groupSpsLimit = args.groupSpsLimit;
        this._totalSpsLimiter = new SlidingTimeLimiter(1000, args.totalSpsLimit, false);
        this._groupSoundsLimit = args.groupSoundsLimit;
        this._totalSoundsLimiter = new SlidingTimeLimiter(1000, args.totalSoundsLimit, false);
        this._groupBurstSoundsLimit = args.groupBurstSoundsLimit;

        const burstParams = this._calculateBurstValues(args.totalSpsLimit, args.totalBurstSoundsLimit);
        this._totalBurstSoundsLimiter = new SlidingTimeLimiter(burstParams.burstWindow, burstParams.adjustedBurstLimit, false);
    }

    /**
     * Parse the url and then stringify it back for consistent formatting.
     * @param url Url to sanitize.
     */
    static sanitizeUrl(url: string): string {
        return new URL(url).toString();
    }

    /**
     * Check whether audio url was loaded.
     * @param url Url to check.
     */
    static isLoaded(url: string): boolean {
        url = this.sanitizeUrl(url);

        return this._loadedUrls.has(url);
    }

    /** 
     * Preloads audio for future playing. 
     * @param url Audio url.
     * @returns A promise that resolves to result when the audio has finished loading.
     * */
    async preload(url: string): Promise<PreloadResult> {
        url = AudioController.sanitizeUrl(url);

        const worker = this._getFreeWorker(url);
        return new Promise(resolve => {
            worker.once('loaded', () => {
                AudioController._loadedUrls.add(url);
                resolve({ play: () => this.play(url) });
                return true;
            });
        });
    }

    /**
     * Preloads many audios for future playing.
     * 
     * @example Example of usage with `preloadMany()`
const audios = await audioCtrl.preloadMany({
    lobotomy: "https://static.wikitide.net/casualtiesunknownwiki/3/31/Lobotomy.ogg",
    bark: "https://static.wikitide.net/casualtiesunknownwiki/f/f2/Bark_sample.ogg",
});
...
audios.lobotomy.play();
     * @param mapping Mapping of audio names to their urls.
     * @returns A promise that resolves to mapping when all audios have finished loading.
     */
    async preloadMany<T extends Record<string, string>>(mapping: T): Promise<Record<keyof T, PreloadResult>> {
        const resObj: any = {};
        const resArr = [];
        for (const audioName in mapping) {
            const url = mapping[audioName];
            const preload = this.preload(url);
            preload.then(preloadRes => resObj[audioName] = preloadRes);
            resArr.push(preload);
        }

        return await Promise.all(resArr)
            .then(() => resObj);
    }

    /**
     * Plays audio from url. If preloaded, plays instantly, otherwise first waits for it to load.
     * 
     * Plays audio only if it can according to the limits. If over the limits, does not play the audio.
     * @param url Audio url.
     */
    play(url: string): void {
        url = AudioController.sanitizeUrl(url);
        logDebug("attempt play url: " + url)

        if (!this._totalBurstSoundsLimiter.free()) { logDebug("skipping play - total burst sounds limit hit"); return };
        if (!this._totalSoundsLimiter.free()) { logDebug("skipping play - total sounds limit hit"); return };
        if (!this._totalSpsLimiter.free()) { logDebug("skipping play - total per second sounds limit hit"); return };

        const groupBusy = this._getPoolGroup(this._busyPool, url);
        if (!groupBusy.burstLimiter.free()) { logDebug("skipping play - group burst sounds limit hit"); return };
        if (!groupBusy.totalSoundsLimiter.free()) { logDebug("skipping play - group sounds limit hit"); return };
        if (!groupBusy.spsLimiter.free()) { logDebug("skipping play - group per second sounds limit hit"); return };
        const groupFree = this._getPoolGroup(this._freePool, url);

        const worker = this._getFreeWorker(url);
        logDebug("got worker id " + worker.id)
        const indexFree = groupFree.workers.indexOf(worker);
        logDebug("removing worker from free pool at idx " + indexFree);
        groupFree.workers.splice(indexFree, 1);
        groupBusy.workers.push(worker);
        worker.once('free', () => {
            const indexBusy = groupBusy.workers.indexOf(worker);
            logDebug("worker free; removing from busy pool at idx " + indexBusy)
            groupBusy.workers.splice(groupBusy.workers.indexOf(worker), 1);
            groupFree.workers.push(worker);
            return true;
        });
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
     * Ensures (gets if exists, creates if doesn't) that a pool group with given url exists for the given pool and returns it.
     * @param pool 
     * @param url 
     */
    private _getPoolGroup(pool: WorkerPool, url: string): WorkerGroup {
        url = AudioController.sanitizeUrl(url);

        let group = pool.get(url);
        if (!group) {
            const burstParams = this._calculateBurstValues(this._groupSpsLimit, this._groupBurstSoundsLimit);

            group = {
                workers: [],
                totalSoundsLimiter: new SlidingTimeLimiter(1000, this._groupSoundsLimit, false),
                spsLimiter: new SlidingTimeLimiter(1000, this._groupSpsLimit, false),
                burstLimiter: new SlidingTimeLimiter(burstParams.burstWindow, burstParams.adjustedBurstLimit, false)
            }
            pool.set(url, group);
        }
        return group;
    }

    /**
     * Returns a free worker for given url. If there's no free workers, creates one.
     * @param url Url to get the worker for.
     */
    private _getFreeWorker(url: string): AudioWorker {
        url = AudioController.sanitizeUrl(url);

        const group = this._getPoolGroup(this._freePool, url);
        if (group.workers.length > 0) {
            logDebug("free worker: " + group.workers.length)
            const worker = group.workers[0];
            return worker;
        } else {
            const worker = new AudioWorker(url);
            group.workers.push(worker);
            worker.once('loaded', () => {
                AudioController._loadedUrls.add(url);
                return true;
            })
            return worker;
        }
    }

    /**
     * Calculate burst related values.
     * @param perSecondLimit Per second sound limit.
     * @param burstLimit Burst limit.
     * @returns Adjusted burst parameters.
     */
    private _calculateBurstValues(perSecondLimit: number, burstLimit: number) {
        const burstWindowUncapped = 1000 / perSecondLimit;
        // ensure min window so that we dont die on high sps
        const burstWindowCapped = Math.max(5, burstWindowUncapped);
        const burstWindowCountModifier = burstWindowCapped / burstWindowUncapped;
        // if uncapped is below the cop, scale on the burst amount to compensate
        const burstCount = burstLimit * burstWindowCountModifier;

        return {
            burstWindow: burstWindowCapped, 
            adjustedBurstLimit: burstCount 
        }
    }
}

class AudioWorker extends Emittery<{
    loaded: undefined,
    free: undefined,
}> {
    private static _globalIdCount: number = 0;

    /** ID of this worker. */
    get id() { return this._id; }
    private _id: string = (AudioWorker._globalIdCount++).toString();

    /** Audio class. */
    get audio() { return this._audio; }
    private _audio: HTMLAudioElement;

    /** Whether the audio has loaded. */
    get loaded() { return this._loaded; }
    private _loaded: boolean = false;

    /** Whether this worker is free. */
    get free() { return this._free; }
    private _free: boolean = false;

    /** 
     * A promise that resolves when the audio loads. 
     * If the audio is already loaded, returns a resolved promise.
     * */
    get onLoaded() { return this._onLoaded; }
    private _onLoaded: DeferredPromise<void> = new DeferredPromise();

    /** 
     * A promise that resolves when the worker becomes free. After that, the promise is replaced with a new one.
     * If worker is already free, returns a resolved promise.
     */
    get onFree() { return this._onFree; }
    private _onFree: DeferredPromise<void> = new DeferredPromise();

    constructor(url) {
        super();
        url = AudioController.sanitizeUrl(url);

        this._audio = new Audio(url);

        if (AudioController.isLoaded(url)) {
            this._loaded = true;
            this._free = true;
        } else {
            this.audio.addEventListener('canplaythrough', () => {
                this._loaded = true;
                this._free = true;
                this.onLoaded.resolve();
                this.emit('loaded');
            }, { once: true });
        }

        this.audio.addEventListener('playing', () => {
            this._free = false;
            this._onFree = new DeferredPromise();
        })
        this.audio.addEventListener('ended', () => {
            this._free = true;
            this.onFree.resolve();
            this.emit('free');
        });
    }

    /** 
     * Play the audio as soon as it's available. Does nothing if already playing. 
     * @returns Whether the audio has started playing.
    */
    play(): boolean {
        const logPrefix = `[worker][${this.id}] `

        if (!this.free) {
            logDebug(logPrefix + "worker not free, not playing")
            return false;
        }

        if (!this.loaded) {
            logDebug(logPrefix + "audio not loaded, waiting and then playing")
            this.onFree.then(this.play);
            return false;
        }

        this.audio.play();
        logDebug(logPrefix + "audio loaded, playing")
        return true;
    }
}

/**
 * Controls the amount of events over a sliding window.
 */
class SlidingTimeLimiter {
    /** Current window number. */
    private _counter = 0;
    /** Max window number. */
    private _limit = 0;
    /** Window size, in ms. */
    private _windowSizeMs = 0;
    /** Duration of one event, after which the counter is decreased by one. */
    private _eventDurationMs = 100;
    // Whether to allow only a single event per a subwindow timeframe.
    private _spread: boolean = false;

    /**
     * @param windowSizeMs How big is the window, in ms.
     * @param limit Limit of events per given window.
     * @param spread Whether to allow only a single event per a subwindow timeframe.
     */
    constructor(windowSizeMs: number, limit: number, spread: boolean = false) {
        this._windowSizeMs = windowSizeMs;
        this._limit = limit;
        this._eventDurationMs = windowSizeMs / limit;
        this._spread = spread;

        setInterval(() => {
            if (this._counter > 0)
                this._counter--;

        }, this._eventDurationMs);
    }

    /** Whether the limit is not hit. */
    free(): boolean {
        return this._spread
            ? this._counter === 0
            : this._counter < this._limit;
    }

    /** Whether the limit is hit. */
    full(): boolean {
        return this._spread
            ? this._counter > 0
            : this._counter === this._limit;
    }

    /**
     * Attempts to add one to the number of events.
     * @returns Whether the addition was successful. If not, then it means the limit was hit and the limiter is full.
     */
    beat(): boolean {
        if (this.free()) {
            this._counter++;
            return true;
        } else {
            return false;
        }
    }
}

// this is for the wiki module so that it's exported correctly since there you cant use export bla bla.
// (which is removed on build via the lib config OwO ).
// @ts-ignore
let windowUtils = window.utils;
if (!windowUtils) {
    windowUtils = {};
    // @ts-ignore
    window.utils = windowUtils;
}
windowUtils.AudioController = AudioController;