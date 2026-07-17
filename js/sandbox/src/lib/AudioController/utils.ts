/**
 * Calculate burst-limiter-related values.
 * @param perSecondLimit Per second sound limit.
 * @param burstLimit Burst limit.
 * @returns Adjusted burst parameters.
 */
export function calculateBurstLimiterValues(perSecondLimit: number, burstLimit: number) {
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

/**
 * Controls the amount of events over a sliding window.
 */
export class SlidingTimeLimiter {
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

/**
 * Parse the url and then stringify it back for consistent formatting.
 * @param url Url to sanitize.
 */
export function sanitizeUrl(url: string): string {
    return new URL(url).toString();
}