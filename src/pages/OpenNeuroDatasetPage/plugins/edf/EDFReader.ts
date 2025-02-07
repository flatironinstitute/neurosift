/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Converted from https://github.com/bids-standard/pyedf

class RemoteFile {
  #chunkSizeBytes = 1024 * 1024 * 1;
  #blockCache: { [key: number]: ArrayBuffer } = {};
  #smartLoadLastChunkIndexLoaded = 0;
  #smartLoadNumChunksToLoad = 1;
  #inProgressChunks: { [key: number]: boolean } = {};
  constructor(private url: string) {}
  async readBytes(offset: number, length: number): Promise<ArrayBuffer> {
    const blockIndex1 = Math.floor(offset / this.#chunkSizeBytes);
    const blockIndex2 = Math.floor(
      (offset + length - 1) / this.#chunkSizeBytes,
    );
    const nBlocks = blockIndex2 - blockIndex1 + 1;
    const blocks = await Promise.all(
      Array.from({ length: nBlocks }, (_, i) =>
        this.readChunkWithSmartLoad(blockIndex1 + i),
      ),
    );
    const buffers = blocks.map((block, i) => {
      const j1 = i === 0 ? offset - blockIndex1 * this.#chunkSizeBytes : 0;
      const j2 =
        i === nBlocks - 1
          ? offset + length - blockIndex2 * this.#chunkSizeBytes
          : this.#chunkSizeBytes;
      return block.slice(j1, j2);
    });
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset2 = 0;
    for (const buf of buffers) {
      result.set(new Uint8Array(buf), offset2);
      offset2 += buf.byteLength;
    }
    return result.buffer;
  }
  async readChunkWithSmartLoad(chunkIndex: number): Promise<ArrayBuffer> {
    while (this.#inProgressChunks[chunkIndex]) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (this.#blockCache[chunkIndex]) {
      return this.#blockCache[chunkIndex];
    }
    if (this.#smartLoadLastChunkIndexLoaded + 1 === chunkIndex) {
      this.#smartLoadNumChunksToLoad = Math.min(
        this.#smartLoadNumChunksToLoad * 2,
        10,
      );
    } else {
      this.#smartLoadNumChunksToLoad = Math.max(
        1,
        Math.floor(this.#smartLoadNumChunksToLoad / 2),
      );
    }
    // if the next chunks have already been loaded, don't reload
    for (let i = 1; i < this.#smartLoadNumChunksToLoad; i++) {
      if (this.#blockCache[chunkIndex + i]) {
        this.#smartLoadNumChunksToLoad = i;
        break;
      }
    }
    while (true) {
      let somethingInProgress = false;
      for (let i = 0; i < this.#smartLoadNumChunksToLoad; i++) {
        if (this.#inProgressChunks[chunkIndex + i]) {
          somethingInProgress = true;
        }
      }
      if (!somethingInProgress) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (let i = 0; i < this.#smartLoadNumChunksToLoad; i++) {
      if (!this.#blockCache[chunkIndex + i]) {
        this.#inProgressChunks[chunkIndex + i] = true;
      }
    }
    try {
      const offset = chunkIndex * this.#chunkSizeBytes;
      const length = this.#chunkSizeBytes * this.#smartLoadNumChunksToLoad;
      const buf = await this._readBytes(offset, length);
      // now update the cache
      for (
        let chunkIndex2 = chunkIndex;
        chunkIndex2 < chunkIndex + this.#smartLoadNumChunksToLoad;
        chunkIndex2++
      ) {
        const offset2 = (chunkIndex2 - chunkIndex) * this.#chunkSizeBytes;
        const length2 = this.#chunkSizeBytes;
        if (buf.byteLength > offset2) {
          this.#blockCache[chunkIndex2] = buf.slice(offset2, offset2 + length2);
          this.#smartLoadLastChunkIndexLoaded = chunkIndex2;
        }
      }
      return buf.slice(0, this.#chunkSizeBytes);
    } finally {
      for (let i = 0; i < this.#smartLoadNumChunksToLoad; i++) {
        this.#inProgressChunks[chunkIndex + i] = false;
      }
    }
  }
  async _readBytes(offset: number, length: number): Promise<ArrayBuffer> {
    const response = await fetch(this.url, {
      headers: {
        Range: `bytes=${offset}-${offset + length - 1}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Error reading bytes: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }
}

class EDFReader {
  #file: RemoteFile | null;
  #meas_info: any;
  #chan_info: any;
  #calibrate: Float32Array | null;
  #offset: Float32Array | null;

  constructor(file: RemoteFile | null = null) {
    this.#file = null;
    this.#meas_info = null;
    this.#chan_info = null;
    this.#calibrate = null;
    this.#offset = null;
    if (file) {
      this.open(file);
    }
  }

  static async fromURL(url: string): Promise<EDFReader> {
    const file = new RemoteFile(url);
    const reader = new EDFReader(file);
    await reader.readHeader();
    return reader;
  }

  async open(file: RemoteFile) {
    this.#file = file;
    await this.readHeader();
  }

  async readHeader() {
    if (this.#file === null) {
      throw new Error("Reader is not open");
    }

    const meas_info: any = {};
    const chan_info: any = {};

    let offset = 0;

    meas_info["magic"] = (await readString(this.#file, offset, 8)).trim();
    offset += 8;

    meas_info["subject_id"] = (await readString(this.#file, offset, 80)).trim();
    offset += 80;

    meas_info["recording_id"] = (
      await readString(this.#file, offset, 80)
    ).trim();
    offset += 80;

    const dateStr = await readString(this.#file, offset, 8);
    offset += 8;
    const dateMatch = dateStr.match(/(\d+)/g);
    const day = parseInt(dateMatch![0]);
    const month = parseInt(dateMatch![1]);
    const year = parseInt(dateMatch![2]);

    meas_info["day"] = day;
    meas_info["month"] = month;
    meas_info["year"] = year;

    const timeStr = await readString(this.#file, offset, 8);
    offset += 8;
    const timeMatch = timeStr.match(/(\d+)/g);
    const hour = parseInt(timeMatch![0]);
    const minute = parseInt(timeMatch![1]);
    const second = parseInt(timeMatch![2]);

    meas_info["hour"] = hour;
    meas_info["minute"] = minute;
    meas_info["second"] = second;

    const headerNBytesStr = await readString(this.#file, offset, 8);
    offset += 8;
    const header_nbytes = parseInt(headerNBytesStr);
    meas_info["data_offset"] = header_nbytes;

    const subtype = (await readString(this.#file, offset, 44))
      .trim()
      .slice(0, 5);
    offset += 44;

    if (subtype.length > 0) {
      meas_info["subtype"] = subtype;
    } else {
      meas_info["subtype"] = "edf"; // is this right?
    }

    if (meas_info["subtype"] === "24BIT" || meas_info["subtype"] === "bdf") {
      meas_info["data_size"] = 3;
    } else {
      meas_info["data_size"] = 2;
    }

    const nRecordsStr = await readString(this.#file, offset, 8);
    offset += 8;
    meas_info["n_records"] = parseInt(nRecordsStr);

    const recordLengthStr = await readString(this.#file, offset, 8);
    offset += 8;
    let record_length = parseFloat(recordLengthStr);
    if (record_length === 0) {
      meas_info["record_length"] = record_length = 1.0;
      console.warn(
        "Header information is incorrect for record length. Default record length set to 1.",
      );
    } else {
      meas_info["record_length"] = record_length;
    }

    const nChanStr = await readString(this.#file, offset, 4);
    offset += 4;
    const nchan = parseInt(nChanStr);
    meas_info["nchan"] = nchan;

    const channels = Array.from({ length: nchan }, (_, i) => i);

    chan_info["ch_names"] = [];
    for (const _ch of channels) {
      const chName = (await readString(this.#file, offset, 16)).trim();
      offset += 16;
      chan_info["ch_names"].push(chName);
    }

    chan_info["transducers"] = [];
    for (const _ch of channels) {
      const transducer = (await readString(this.#file, offset, 80)).trim();
      offset += 80;
      chan_info["transducers"].push(transducer);
    }

    chan_info["units"] = [];
    for (const _ch of channels) {
      const unit = (await readString(this.#file, offset, 8)).trim();
      offset += 8;
      chan_info["units"].push(unit);
    }

    chan_info["physical_min"] = new Float64Array(nchan);
    chan_info["physical_max"] = new Float64Array(nchan);
    chan_info["digital_min"] = new Float64Array(nchan);
    chan_info["digital_max"] = new Float64Array(nchan);

    for (let ch = 0; ch < nchan; ch++) {
      const physical_min_str = await readString(this.#file, offset, 8);
      chan_info["physical_min"][ch] = parseFloat(physical_min_str);
      offset += 8;
    }

    for (let ch = 0; ch < nchan; ch++) {
      const physical_max_str = await readString(this.#file, offset, 8);
      chan_info["physical_max"][ch] = parseFloat(physical_max_str);
      offset += 8;
    }

    for (let ch = 0; ch < nchan; ch++) {
      const digital_min_str = await readString(this.#file, offset, 8);
      chan_info["digital_min"][ch] = parseFloat(digital_min_str);
      offset += 8;
    }

    for (let ch = 0; ch < nchan; ch++) {
      const digital_max_str = await readString(this.#file, offset, 8);
      chan_info["digital_max"][ch] = parseFloat(digital_max_str);
      offset += 8;
    }

    const prefiltering = [];
    for (let ch = 0; ch < nchan; ch++) {
      const prefilter = (await readString(this.#file, offset, 80)).trim();
      offset += 80;
      prefiltering.push(prefilter);
    }

    const highpass = [];
    const lowpass = [];

    for (const filt of prefiltering) {
      const hpMatch = filt.match(/HP:\s+(\w+)/);
      highpass.push(hpMatch ? hpMatch[1] : null);
      const lpMatch = filt.match(/LP:\s+(\w+)/);
      lowpass.push(lpMatch ? lpMatch[1] : null);
    }

    const highpassValues = highpass.filter((hp) => hp !== null);
    const lowpassValues = lowpass.filter((lp) => lp !== null);

    const high_pass_default = 0.0;
    if (highpassValues.length === 0) {
      meas_info["highpass"] = high_pass_default;
    } else if (highpassValues.every((hp) => hp === highpassValues[0])) {
      const hpValue = highpassValues[0];
      if (hpValue === "NaN") {
        meas_info["highpass"] = high_pass_default;
      } else if (hpValue === "DC") {
        meas_info["highpass"] = 0.0;
      } else {
        meas_info["highpass"] = parseFloat(hpValue);
      }
    } else {
      meas_info["highpass"] = Math.max(
        ...highpassValues.map((hp) => parseFloat(hp)),
      );
      console.warn(
        "Channels contain different highpass filters. Highest filter setting will be stored.",
      );
    }

    if (lowpassValues.length === 0) {
      meas_info["lowpass"] = null;
    } else if (lowpassValues.every((lp) => lp === lowpassValues[0])) {
      const lpValue = lowpassValues[0];
      if (lpValue === "NaN") {
        meas_info["lowpass"] = null;
      } else {
        meas_info["lowpass"] = parseFloat(lpValue);
      }
    } else {
      meas_info["lowpass"] = Math.min(
        ...lowpassValues.map((lp) => parseFloat(lp)),
      );
      console.warn(
        "Channels contain different lowpass filters. Lowest filter setting will be stored.",
      );
    }

    chan_info["n_samps"] = new Uint32Array(nchan);
    for (let ch = 0; ch < nchan; ch++) {
      const nSampsStr = await readString(this.#file, offset, 8);
      chan_info["n_samps"][ch] = parseInt(nSampsStr);
      offset += 8;
    }

    offset += 32 * nchan;

    if (offset !== header_nbytes) {
      console.warn(
        `Header size mismatch: expected ${header_nbytes}, but read ${offset}`,
      );
    }

    const calibrate = new Float32Array(nchan);
    const offsetArr = new Float32Array(nchan);
    for (let ch = 0; ch < nchan; ch++) {
      calibrate[ch] =
        (chan_info["physical_max"][ch] - chan_info["physical_min"][ch]) /
        (chan_info["digital_max"][ch] - chan_info["digital_min"][ch]);
      offsetArr[ch] =
        chan_info["physical_min"][ch] -
        calibrate[ch] * chan_info["digital_min"][ch];
      if (calibrate[ch] < 0) {
        calibrate[ch] = 1;
        offsetArr[ch] = 0;
      }
    }

    this.#calibrate = calibrate;
    this.#offset = offsetArr;
    this.#meas_info = meas_info;
    this.#chan_info = chan_info;
  }

  async readBlockForChannel(
    block: number,
    channel: number,
  ): Promise<Float32Array> {
    if (!this.#file) {
      throw new Error("Reader is not open");
    }
    if (block < 0) {
      throw new Error("Block must be >= 0");
    }
    const meas_info = this.#meas_info;
    const chan_info = this.#chan_info;
    if (meas_info === null || chan_info === null) {
      throw new Error("No meas_info or chan_info has been read");
    }
    if (this.#offset === null || this.#calibrate === null) {
      throw new Error("No offset or calibrate has been calculated");
    }

    const blocksize =
      chan_info["n_samps"].reduce((a: number, b: number) => a + b, 0) *
      meas_info["data_size"];
    const data_offset = meas_info["data_offset"];

    const blockOffset = data_offset + block * blocksize;
    const channelOffset =
      chan_info["n_samps"]
        .slice(0, channel)
        .reduce((a: number, b: number) => a + b, 0) * meas_info["data_size"];

    const offset = blockOffset + channelOffset;
    const n_samps = chan_info["n_samps"][channel];
    const bytesToRead = n_samps * meas_info["data_size"];

    const buffer: ArrayBuffer = await this.#file.readBytes(offset, bytesToRead);
    if (buffer.byteLength !== bytesToRead) {
      throw new Error(
        `Read ${buffer.byteLength} bytes, but expected ${bytesToRead}; block ${block}, channel ${channel}; offset ${offset}`,
      );
    }
    const dataView = new DataView(buffer);

    let raw: Float32Array;
    if (meas_info["data_size"] === 2) {
      if (dataView.byteLength !== n_samps * 2) {
        throw new Error(
          `Data size mismatch: expected ${n_samps * 2}, but read ${dataView.byteLength}; block ${block}, channel ${channel}`,
        );
      }
      raw = new Float32Array(n_samps);
      for (let i = 0; i < n_samps; i++) {
        raw[i] = dataView.getInt16(i * 2, true);
      }
    } else if (meas_info["data_size"] === 3) {
      if (dataView.byteLength !== n_samps * 3) {
        throw new Error(
          `Data size mismatch: expected ${n_samps * 3}, but read ${dataView.byteLength}; block ${block}, channel ${channel}`,
        );
      }
      raw = new Float32Array(n_samps);
      for (let i = 0; i < n_samps; i++) {
        const b0 = dataView.getUint8(i * 3);
        const b1 = dataView.getUint8(i * 3 + 1);
        const b2 = dataView.getUint8(i * 3 + 2);
        let int24 = (b2 << 16) | (b1 << 8) | b0;
        if (int24 & 0x800000) {
          int24 |= ~0xffffff;
        }
        raw[i] = int24;
      }
    } else {
      throw new Error(`Unsupported data_size: ${meas_info["data_size"]}`);
    }

    const cal = this.#calibrate[channel];
    const off = this.#offset[channel];
    for (let i = 0; i < raw.length; i++) {
      raw[i] = raw[i] * cal + off;
    }

    return raw;
  }

  async readSamples(
    channel: number,
    begsample: number,
    endsample: number,
  ): Promise<Float32Array> {
    if (this.#file === null) {
      throw new Error("Reader is not open");
    }
    const chan_info = this.#chan_info;
    const meas_info = this.#meas_info;
    if (chan_info === null || meas_info === null) {
      throw new Error("No chan_info or meas_info has been read");
    }
    const n_samps = chan_info["n_samps"][channel];
    const begblock = Math.floor(begsample / n_samps);
    const endblock = Math.floor(endsample / n_samps);

    const data_blocks: Float32Array[] = [];
    for (let block = begblock; block <= endblock; block++) {
      const blockData = await this.readBlockForChannel(block, channel);
      data_blocks.push(blockData);
    }
    const data = concatFloat32Arrays(data_blocks);

    begsample -= begblock * n_samps;
    endsample -= begblock * n_samps;

    return data.slice(begsample, endsample + 1);
  }

  getSignalTextLabels(): string[] {
    if (this.#chan_info === null) {
      throw new Error("No chan_info has been read");
    }
    return this.#chan_info["ch_names"].map((x: any) => String(x));
  }

  getNSignals(): number {
    if (this.#meas_info === null) {
      throw new Error("No meas_info has been read");
    }
    return this.#meas_info["nchan"];
  }

  getSignalFreqs(): Float64Array {
    if (this.#meas_info === null || this.#chan_info === null) {
      throw new Error("No meas_info or chan_info has been read");
    }
    const n_samps = this.#chan_info["n_samps"];
    const record_length = this.#meas_info["record_length"];
    const freqs = new Float64Array(n_samps.length);
    for (let i = 0; i < n_samps.length; i++) {
      freqs[i] = n_samps[i] / record_length;
    }
    return freqs;
  }

  getNSamples(): Uint32Array {
    if (this.#meas_info === null || this.#chan_info === null) {
      throw new Error("No meas_info or chan_info has been read");
    }
    const n_samps = this.#chan_info["n_samps"];
    const n_records = this.#meas_info["n_records"];
    const n_samples = new Uint32Array(n_samps.length);
    for (let i = 0; i < n_samps.length; i++) {
      n_samples[i] = n_samps[i] * n_records;
    }
    return n_samples;
  }

  async readSignal(chanindx: number): Promise<Float32Array> {
    if (this.#meas_info === null || this.#chan_info === null) {
      throw new Error("No meas_info or chan_info has been read");
    }
    const begsample = 0;
    const endsample =
      this.#chan_info["n_samps"][chanindx] * this.#meas_info["n_records"] - 1;
    return await this.readSamples(chanindx, begsample, endsample);
  }

  padtrim(buf: string, num: number): string {
    const len = buf.length;
    if (len < num) {
      return buf + " ".repeat(num - len);
    } else {
      return buf.substring(0, num);
    }
  }
}

async function readString(
  file: RemoteFile,
  offset: number,
  length: number,
): Promise<string> {
  const buf = await file.readBytes(offset, length);
  const bytes = new Uint8Array(buf);
  const decoder = new TextDecoder("ascii");
  return decoder.decode(bytes);
}

function concatFloat32Arrays(arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export default EDFReader;
