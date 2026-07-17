import { AudioInstancer, type AudioInstancerPublicArgs } from './AudioInstancer';
import type { AudioPool } from './AudioPool';
import { logDebug } from './shared';
import { sanitizeUrl, type SlidingTimeLimiter } from './utils';

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

    /** Pool of audio instancers. */
    private _pool: AudioPool = new Map();

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
     * Check whether audio url is loaded.
     * @param url Url to check.
     */
    static isLoaded(url: string): boolean {
        url = sanitizeUrl(url);

        return this._loadedUrls.has(url);
    }

    /** 
     * Preloads audio for future playing.
     * @param url Audio url.
     * @returns A promise that resolves to result when the audio has finished loading.
     * */
    async preload(url: string): Promise<AudioInstancer> {
        url = sanitizeUrl(url);

        const worker = this._fetchFreeWorker(url);
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
    async preloadMany<T extends Record<string, string>>(mapping: T): Promise<Record<keyof T, AudioInstancer>> {
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
     * Plays audio from url. If the audio is preloaded, plays it instantly - otherwise, first waits for it to load.
     * 
     * If limits are exceeded, the audio won't play.
     * @param url Audio url.
     * @returns Audio instancer controls.
     */
    play(url: string): AudioInstancer {
        url = sanitizeUrl(url);
        logDebug("attempt play url: " + url)

        if (!this._totalBurstSoundsLimiter.free()) { logDebug("skipping play - total burst sounds limit hit"); return };
        if (!this._totalSoundsLimiter.free()) { logDebug("skipping play - total sounds limit hit"); return };
        if (!this._totalSpsLimiter.free()) { logDebug("skipping play - total per second sounds limit hit"); return };

        const groupBusy = this._getAudioGroup(this._busyPool, url);
        if (!groupBusy.burstLimiter.free()) { logDebug("skipping play - group burst sounds limit hit"); return };
        if (!groupBusy.totalSoundsLimiter.free()) { logDebug("skipping play - group sounds limit hit"); return };
        if (!groupBusy.spsLimiter.free()) { logDebug("skipping play - group per second sounds limit hit"); return };
        const groupFree = this._getAudioGroup(this._freePool, url);

        const worker = this._fetchFreeWorker(url);
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
     * Gets audio instancer controls for given audio.
    */
    getControls(audioUrl: string, opts: AudioInstancerPublicArgs): AudioInstancer {
        audioUrl = sanitizeUrl(audioUrl);
        logDebug("getting audio instancer for url: " + audioUrl);

        let instancer = this._pool.get(audioUrl);
        if (instancer) {
            logDebug("instancer found");
            return instancer;
        }

        logDebug("instancer not found, creating");
        instancer = new AudioInstancer({
            // private
            totalSoundsLimit: this._groupSoundsLimit,
            spsLimit: this._groupSpsLimit,
            burstLimit: this._groupBurstSoundsLimit,

            // public
            ...opts
        });
        this._pool.set(audioUrl, instancer);

        return instancer;
    }
}