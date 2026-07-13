export class Pool<T> {
    private pool: T[] = [];
    private createObjFn: () => T;
    private resetObjFn: (obj: T) => void;

    constructor(createObjFn: () => T, resetObjFn: (obj: T) => void) {
        this.createObjFn = createObjFn;
        this.resetObjFn = resetObjFn;
    }

    free(obj: T): void {
        this.pool.push(obj);
    }

    take(): T {
        if (this.pool.length > 0) {
            const obj = this.pool[0];
            this.pool.splice(0, 1);
            this.resetObjFn(obj);
            return obj;
        } else {
            return this.createObjFn();
        }
    }
}