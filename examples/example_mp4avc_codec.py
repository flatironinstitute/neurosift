import requests
from neurosift.codecs import MP4AVCCodec


def download_video(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()  # Ensure the download was successful
    return response.content


def main():
    # Register the custom codec
    MP4AVCCodec.register_codec()

    # Video URL
    video_url = (
        "https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_1MB.mp4"
    )

    # Download the video
    video_data = download_video(video_url)
    size_original_video = len(video_data)
    print(f'Size of original video (MB): {size_original_video / 1024**2}')

    # Create an instance of the codec
    codec = MP4AVCCodec(fps=24.0)

    # Decode the video file to a numpy array
    video_array = codec.decode(video_data)
    size_decoded_video = video_array.nbytes
    print(f'Size of decoded video (MB): {size_decoded_video / 1024**2}')

    print(f'Shape of decoded video array: {video_array.shape}')

    # Encode the numpy array back to a video file
    encoded_video = codec.encode(video_array)

    size_encoded_video = len(encoded_video)
    print(f'Size of encoded video (MB): {size_encoded_video / 1024**2}')
    print(f'Compression ratio: {size_decoded_video / size_encoded_video:.2f}')

    fname = 'example_mp4avc_original_video.mp4'
    # prompt whether user wants to save the re-encoded video
    do_save = input(f'Save re-encoded video to {fname}? (y/n): ')
    if do_save.lower() == 'y':
        print(f'Saving re-encoded video to {fname}')
        with open(fname, "wb") as f:
            f.write(encoded_video)


if __name__ == "__main__":
    main()
