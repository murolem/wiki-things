import "./index.css";
import { AudioController } from '../lib/AudioController';
import { openSimplexNoise } from './SimplexNoise';
import { ClassController } from './ClassController';

async function main() {
    const audioCtrl = new AudioController({
        totalSoundsLimit: 50,
        totalSpsLimit: 50,
        groupSoundsLimit: 20,
        groupSpsLimit: 20,
        groupBurstSoundsLimit: 1,
        totalBurstSoundsLimit: 5,
    });

    const audios = await audioCtrl.preloadMany({
        lobotomy: "https://static.wikitide.net/casualtiesunknownwiki/3/31/Lobotomy.ogg",
        bark: "https://static.wikitide.net/casualtiesunknownwiki/f/f2/Bark_sample.ogg",
    });

    console.debug("audios loaded!")

    let lastKey = null;
    window.addEventListener("keydown", e => {
        processInputs(e);
        lastKey = e.key;
    });

    function processInputs(e: KeyboardEvent) {
        if (e.key === "Backspace") {
            if (lastKey === e.key)
                return;

            audios.lobotomy.play();

            // const overlayDuration = 3000
            const overlay = document.createElement('div');
            overlay.classList.add('overlay');
            // TempClassController.schedule(overlay, "fade-in", overlayDuration, 1, { onEndCb: () => overlay.remove() });
            overlay.animate(
                [
                    { backgroundColor: 'white' },
                    { backgroundColor: 'transparent' },
                ],
                {
                    delay: 1000,
                    duration: 2000,
                    easing: "ease-out"
                }
            )
                .onfinish = () => overlay.remove();

            document.documentElement.animate(
                [
                    { scale: 0.1, filter: "blur(10px)" },
                    { scale: 1, filter: "blur(0px)" }
                ],
                {
                    duration: 2000,
                    easing: "ease-out",
                    delay: 1000
                }
            )

            const openSimplex = openSimplexNoise(Date.now());
            const maxIdx = 100;
            for (let i = 0; i < maxIdx; i++) {
                const t = i / (maxIdx - 1);
                const delayRes = 1000 + i * (2000 / maxIdx);
                setTimeout(() => {
                    const amplitude = 50;
                    const value = openSimplex.noise3D(1, 1, Date.now() / 60) * (1 - t) * amplitude - amplitude / 2;
                    const value2 = openSimplex.noise3D(100, 100, Date.now() / 60) * (1 - t) * amplitude - amplitude / 2;
                    document.documentElement.style.transform = "translate(" + value + "px, " + value + "px)";
                }, delayRes)
            }

            document.body.append(overlay);
        } else {
            for(let i = 0; i < 10; i++) {
                audios.bark.play();
            }
            audios.lobotomy.play()
            audios.lobotomy.play()

            const editor = document.querySelector<HTMLElement>('.wikiEditor-ui');
            if (!editor)
                return;

            ClassController.schedule(editor, "jump", 150);
        }

    }
}

main();