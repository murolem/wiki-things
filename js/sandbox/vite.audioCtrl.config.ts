import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite'
// import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const outputFilename = "index.js";

export default defineConfig({
    build: {
        rolldownOptions: {
            input: {
                app: "./index.audioCtrl.html"
            }
        },
        target: 'es6',
        lib: {
            entry: "./src/lib/AudioController.ts",
            fileName: outputFilename.split(".")[0],
            name: "wawa",
            formats: ["es"]
        },
        minify: false,
    },
    plugins: [
        // cssInjectedByJsPlugin(),
        // dts(),
        {
            // a simple plugin for appending text to the resulting.
            // in this case, it makes the resulting code to be able to run 
            // in a bookmarklet (only to have the ability to start, without changing the code) 
            // in a self-contained IIFE mode.
            name: 'vite-plugin-append-text',
            // ensures that the wrapped code remains wrapped and not interrupted
            // by other plugins.
            enforce: 'post',
            generateBundle(options, bundle) {
                const output = bundle[outputFilename];
                if (!output)
                    throw new Error(`'${outputFilename}' output file not found by 'vite-plugin-append-text'`);
                else if (output.type !== 'chunk')
                    throw new Error(`'${output.type}' output type is not supported by 'vite-plugin-append-text'`);

                // const prepend = "mw.hook( 'wikipage.content' ).add( () => {\n";
                // const append = "\n})";
                const prepend = `\
// Audio controller utility.
// Provides audio preloading and simultaneous audio play. 
// Supports limits for audios playing in total/per timeframe/burst, in total or per single audio source.
// Author: aliser
// Source code: https://github.com/murolem/wiki-things/blob/main/js/sandbox/src/lib/AudioController.ts
// 
// #=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=
// #=#=#=#=#=#=#=#=#=#=#=#=#=# [ Public interface ] #=#=#=#=#=#=#=#=#=#=#=#=#=#
// #=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=
// 
// export type PreloadResult = {
//     /** Plays audio. */
//     play: () => void;
// };
// 
// export declare class AudioController {
//     constructor(args: {
//         /** Limit on sounds per second per group. */
//         groupSpsLimit: number;
// 
//         /** Limit on sounds per second in total. */
//         totalSpsLimit: number;
// 
//         /** Limit on sounds playing simultaneously in a group. */
//         groupSoundsLimit: number;
// 
//         /** Limit on sounds playing simultaneously in total. */
//         totalSoundsLimit: number;

//         /** Limit on sounds starting to play in roughly the same time per group. The window is equal to \`1 / groupSpsLimit\` seconds. */
//         groupBurstSoundsLimit: number;
//        
//         /** Limit on sounds starting to play in roughly the same time in total. The window is equal to \`1 / totalSpsLimit\` seconds. */
//         totalBurstSoundsLimit: number;
//     });
// 
//     /**
//      * Parse the url and then stringify it back for consistent formatting.
//      * @param url Url to sanitize.
//      */
//     static sanitizeUrl(url: string): string;
// 
//     /**
//      * Check whether audio url was loaded.
//      * @param url Url to check.
//      */
//     static isLoaded(url: string): boolean;
// 
//     /**
//      * Preloads audio for future playing.
//      * @param url Audio url.
//      * @returns A promise that resolves to result when the audio has finished loading.
//      * */
//     preload(url: string): Promise<PreloadResult>;
// 
//     /**
//      * Preloads many audios for future playing.
//      * @param mapping Mapping of audio names to their urls.
//      * @returns A promise that resolves to mapping when all audios have finished loading.
//      */
//     preloadMany<T extends Record<string, string>>(mapping: T): Promise<Record<keyof T, PreloadResult>>;
//     
//     /**
//      * Plays audio from url. If preloaded, plays instantly, otherwise first waits for it to load.
//      *
//      * Plays audio only if it can according to the limits. If over the limits, does not play the audio.
//      * @param url Audio url.
//      */
//     play(url: string): void;
// }

(() => {\n`;
                const append = "\n})();";

                let lines = [];
                for(const line of output.code.split("\n")) {
                    if (line.trim().startsWith("export {"))
                        continue;

                    lines.push("    " + line);
                }

                output.code = 
                    prepend 
                    + lines.join("\n")
                    + append;
            }
        },
    ],
})