import replaceAllOrig from "replaceall";

export function replaceAll(str: string, substr1: string, substr2: string): string {
    return replaceAllOrig(substr1, substr2, str);
}