/**
 * Contains common configurations for use by the extension. Not modifiable by
 * the user.
 */

export default {
    timeout: 10000, // for a testcase run
    extensions: {
        go: 'go',
    },
    compilers: {
        go: 'go',
    },
    supportedExtensions: ['go'],
    skipCompile: [] as string[],
};
