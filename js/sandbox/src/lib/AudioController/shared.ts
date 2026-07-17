import { noop } from '../../utils/noop';

// this is here so that it doesnt get optimized away on build
// @ts-ignore
const DEBUG = window.dummy_value_just_here_to_be_your_buddy_feel_free_to_remove_me_owo || false;

export const logDebug = DEBUG
    ? (...args: unknown[]) => {
        if (args[0] && typeof args[0] === "string") {
            args[0] = "[audio-ctrl] " + args[0];
        }
        console.debug(...args)
    }
    : noop;