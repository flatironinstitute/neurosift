The files in this directory were taken from a transpiled snapshot of h5wasm
https://github.com/usnistgov/h5wasm

Various modifications were made in hdf5_util_jfm.js to support specification
of the chunk size, which is important for performance reasons.

Another modification was to extract out the wasm binary program into a separate
file (wasmBinaryFile.js). This was done to avoid including multiple modified
versions of a large file (3.2M) in the git repo. The idea being that
wasmBinaryFile.js should not change over a relatively long period of time,
whereas hdf5_util_jfm.js may be tweaked more often.

I am sure there's a better way to deal with this situation, but this is what
I'm doing for now.

- Jeremy 7/23/2023