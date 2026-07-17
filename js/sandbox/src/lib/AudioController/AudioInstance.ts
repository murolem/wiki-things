import Emittery from 'emittery';
import { DeferredPromise } from '../../utils/DeferredPromise';
import { AudioController } from './AudioController';
import { logDebug } from './shared';
import { sanitizeUrl } from './utils';

export class AudioInstance extends Emittery<{
    loaded: undefined,
    free: undefined,
}> {
    private static _globalIdCount: number = 0;
    private static _loadedAudios: Set<string> = new Set();

    /** ID of this worker. */
    get id() { return this._id; }
    private _id: string = (AudioInstance._globalIdCount++).toString();

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

    constructor(url, opts: Partial<{
        /** 
         * Whether to preload the audio.
         * @default true
         */
        preload: boolean 
    }> = {
        preload: true
    }) {
        super();
        url = sanitizeUrl(url);

        const aud = new Audio(url);
        if(!opts.preload) {
            aud.preload = 'metadata';
            this._audio.load();
        }

        const setLoaded = () => {
            this._loaded = true;
            this._free = true;
            this.onLoaded.resolve();
            this.emit('loaded');
        }
        if (AudioInstance._loadedAudios.has(url)) {
            setLoaded();
        } else {
            this.audio.addEventListener('canplaythrough', setLoaded, { once: true });
        }

        const setBusy = () => {
            this._free = false;
            this._onFree = new DeferredPromise();
        }
        const setFree = () => {
            this._free = true;
            this.onFree.resolve();
            this.emit('free');
        }

        this.audio.addEventListener('playing', setBusy)
        this.audio.addEventListener('ended', setFree);
    }

    /** 
     * Attempts to play the audio. Does nothing if already playing.
     * @returns Whether the audio has started playing.
    */
    play(): boolean {
        const logPrefix = `[worker][${this.id}] `

        logDebug(logPrefix + "play requested on worker")

        if (!this.free) {
            logDebug(logPrefix + "‼️ worker not free, not playing")
            return false;
        }

        if (!this.loaded) {
            logDebug(logPrefix + "audio not loaded, waiting for load completion before playing")
            this.onFree.then(this.play);
            return false;
        }

        logDebug(logPrefix + "playing")
        this.audio.play();
        return true;
    }
}