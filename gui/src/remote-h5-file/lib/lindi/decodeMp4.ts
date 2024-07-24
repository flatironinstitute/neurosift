// This was a nice attempt but in the end
// it took way too long to decode a chunk

export const decodeMp4 = async (
  chunk: ArrayBuffer,
  numFrames: number,
  width: number,
  height: number,
) => {
  const blob = new Blob([chunk], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  const numBatches = 10;
  const framesPerBatch = Math.ceil(numFrames / numBatches);
  const batches = [];
  for (let i = 0; i < numBatches; i++) {
    const start = i * framesPerBatch;
    const end = Math.min(start + framesPerBatch, numFrames);
    batches.push({
      start,
      end,
      url,
      width,
      height,
    });
  }

  // do batches in parallel
  const promises = batches.map((batch) => doBatch(batch));
  const results = await Promise.all(promises);
  const frames = results.flat();

  // Cleanup
  URL.revokeObjectURL(url);

  return frames;
};

const doBatch = async (batch: {
  start: number;
  end: number;
  url: string;
  width: number;
  height: number;
}) => {
  const { start, end, url, width, height } = batch;
  // Prepare video element
  const video = document.createElement("video");
  video.width = width;
  video.height = height;
  video.src = url;
  video.muted = true;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Unable to create canvas context");

  video.onerror = (e) => {
    console.log("Video error", e, video.error);
  };

  // Wait for video to load
  await new Promise((resolve) => {
    video.addEventListener("loadedmetadata", resolve, { once: true });
  });

  // Utility to seek video and extract frame
  const extractFrame = (time: number) =>
    new Promise((resolve) => {
      video.currentTime = time;
      video.addEventListener(
        "seeked",
        () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData.data);
        },
        { once: true },
      );
    });

  // Step 4 & 5: Extract frames (simplified)
  const frames = [];
  for (let i = start; i < end; i++) {
    const time = i; // fps = 1
    // print every 10 frames
    if (frames.length % 10 === 0) {
      console.log("Frames", frames.length);
    }
    const frameData = await extractFrame(time);
    frames.push(frameData); // This pushes 3D data; needs adjustment for 4D structure
  }

  console.log("Frames", frames);

  return frames; // This is your 4D array
};
