import tempfile
import numpy as np
from numcodecs.abc import Codec
from numcodecs import register_codec


class MP4AVCCodec(Codec):
    """
    Codec for encoding/decoding MP4 AVC video data from numpy arrays.

    Example
    --------
    See examples/example_mp4avc_codec.py in the neurosift repo.
    """
    codec_id = "mp4avc"

    def __init__(
        self,
        fps: float
    ):
        """
        Parameters
        ----------
        fps : float
            The frames per second of the video.
        """
        self.fps = fps

    def encode(self, array: np.ndarray):  # type: ignore
        """
        Encode a numpy array to MP4 AVC video data.

        Parameters
        ----------
        array : np.ndarray
            The numpy array to encode. Must be a uint8 array with shape (frames,
            height, width, 3) or (frames, height, width).
        """
        import cv2

        if array.dtype != np.uint8:
            raise ValueError("MP4AVCCodec only supports uint8 arrays")

        if array.ndim not in (3, 4):
            raise ValueError("MP4AVCCodec only supports 3D or 4D arrays")

        if array.ndim == 3:
            is_color = False
        else:
            is_color = True

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_output_fname = f'{tmpdir}/output.mp4'
            fourcc = cv2.VideoWriter_fourcc(*'avc1')  # type: ignore
            writer = cv2.VideoWriter(tmp_output_fname, fourcc, self.fps, (array.shape[2], array.shape[1]), isColor=is_color)
            for i in range(array.shape[0]):
                writer.write(array[i])
            writer.release()
            with open(tmp_output_fname, 'rb') as f:
                return f.read()

    def decode(self, buf: bytes, out=None):  # type: ignore
        """
        Decode MP4 AVC video data to a numpy array.

        Parameters
        ----------
        buf : bytes
            The MP4 video data buffer to decode. Must be a valid MP4 video
            created with h264 codec.
        out: np.ndarray, optional
            Optional pre-allocated output array. Must be a uint8 array with shape
            (frames, height, width, 3) or (frames, height, width).
        """
        import cv2
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_input_fname = f'{tmpdir}/input.mp4'
            with open(tmp_input_fname, 'wb') as f:
                f.write(buf)
            cap = cv2.VideoCapture(tmp_input_fname)
            frames = []
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
            ret = np.array(frames, dtype=np.uint8)
            if out is not None:
                out[...] = ret
                return out
            return ret

    def __repr__(self):
        return (
            f'{self.__class__.__name__}(fps={self.fps})'
        )

    @staticmethod
    def register_codec():
        """
        Convenience static method to register the MP4AVCCodec with numcodecs.
        """
        register_codec(MP4AVCCodec)
