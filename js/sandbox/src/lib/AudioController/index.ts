import { AudioController } from './AudioController';

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