export class ClassController {
    static #store = []

    static schedule(el: HTMLElement, className: string, duration: number, delay?: number, opts: Partial<{ onEndCb: () => void }> = {}) {
        delay ??= 1;
        opts.onEndCb ??= () => { };

        const ts = Date.now()

        let item = ClassController.#store.find(item => item.el === el && item.className === className);
        if (!item) {
            const expiresFn = () => {
                el.classList.remove(className);
                ClassController.#store.splice(ClassController.#store.indexOf(item, 1));
                opts.onEndCb();
            }

            let expiresHandle = null;
            const startsHandle = setTimeout(() => {
                el.classList.add(className);
                expiresHandle = setTimeout(expiresFn, duration);
            }, delay);
            item = {
                el,
                className,
                startsHandle,
                expiresFn,
                get expiresHandle() { return expiresHandle },
            }
            // console.log("new item")
            ClassController.#store.push(item);
        } else {
            if (!item.expiresHandle) {
                // haven't started yet, safe to remove
                // console.log("not yet started")
                clearTimeout(item.startsHandle);
                ClassController.#store.splice(ClassController.#store.indexOf(item, 1));
                this.schedule(el, className, duration, delay, opts);
            } else {
                // have started or expired. force cleanup.
                // console.log("have started or expired")
                clearTimeout(item.expiresHandle);
                item.expiresFn();
                this.schedule(el, className, duration, delay, opts);
            }
        }
    }
}
