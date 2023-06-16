import os
import shutil
import json
import numpy as np
import zarr


def create_audio_spectrogram(*,
    audio_file_path: str,
    output_path: str
):
    import h5py
    from scipy.io import wavfile
    from matplotlib.pyplot import specgram

    if not output_path.endswith('.ns-asp'):
        raise Exception(f'Output path must end with .ns-asp: {output_path}')
    if os.path.exists(output_path):
        shutil.rmtree(output_path)

    print('Extracting audio signals')
    if audio_file_path.endswith('.h5'):
        audio_sr_hz = _get_audio_sr_from_h5(audio_file_path)
        with h5py.File(audio_file_path, 'r') as f:
            ch1 = np.array(f['ai_channels/ai0'])
            ch2 = np.array(f['ai_channels/ai1'])
            ch3 = np.array(f['ai_channels/ai2'])
            ch4 = np.array(f['ai_channels/ai3'])
            X = np.stack([ch1, ch2, ch3, ch4]).T
    elif audio_file_path.endswith('.wav'):
        audio_sr_hz, X = wavfile.read(audio_file_path)
        if X.ndim == 1:
            X = X.reshape((-1, 1))
        # n_samples = audio.shape[0]
        # n_channels = audio.shape[1]
    else:
        raise Exception(f'Unknown audio file type: {audio_file_path}')
    
    num_channels = X.shape[1]

    print('Computing spectrograms')
    spectrograms = []
    for channel_ind in range(num_channels):
        s, spectrogram_frequencies, spectrogram_times, im = specgram(X[:, channel_ind], NFFT=512, noverlap=256, Fs=audio_sr_hz)
        sr_spectrogram = float(1 / (spectrogram_times[1] - spectrogram_times[0]))
        spectrograms.append(s.T) # Use transpose so we have Nt x Nf
    print(f'Spectrogram sampling rate (Hz): {sr_spectrogram}')
    spectrogram_for_gui = np.log(sum(spectrograms) + 1e-6)

    print('Auto detecting maxval')
    maxval = _auto_detect_spectrogram_maxval(spectrogram_for_gui, sr_spectrogram=sr_spectrogram)
    minval = np.percentile(spectrogram_for_gui, 0.5)
    print(f'Absolute spectrogram max: {np.max(spectrogram_for_gui)}')
    print(f'Auto detected spectrogram max: {maxval}')

    print('Scaling spectogram data')
    
    # Nf x Nt
    scaled_vals = (spectrogram_for_gui - minval) / (maxval - minval + 1e-6) * 255
    scaled_vals = np.clip(scaled_vals, 0, 255)

    spectrogram_for_gui: np.ndarray = scaled_vals.astype(np.uint8)

    # threshold = np.percentile(spectrogram_for_gui[freq_range[0]:freq_range[1]], threshold_pct)
    # print(f'Using threshold: {threshold} ({threshold_pct} pct)')
    # spectrogram_for_gui[spectrogram_for_gui <= threshold] = 0
    
    print(f'Writing {output_path}')
    root_group = zarr.open(output_path, mode="w")
    root_group.create_dataset("spectrogram", data=spectrogram_for_gui, chunks=(50000, len(spectrogram_frequencies)))

    ds_factor = 3
    previous_spectrogram = spectrogram_for_gui
    while ds_factor < len(spectrogram_times):
        spectrogram_for_gui_downsampled = downsample_spectrogram_using_max(previous_spectrogram, ds_factor=3)
        root_group.create_dataset(f"spectrogram_ds{ds_factor}", data=spectrogram_for_gui_downsampled, chunks=(50000, len(spectrogram_frequencies)))
        previous_spectrogram = spectrogram_for_gui_downsampled
        ds_factor *= 3

    root_group.attrs['spectrogram_sr_hz'] = sr_spectrogram
    root_group.attrs['spectrogram_num_samples'] = spectrogram_for_gui.shape[0]
    root_group.attrs['spectrogram_duration_sec'] = spectrogram_for_gui.shape[0] / sr_spectrogram
    root_group.attrs['spectrogram_num_frequencies'] = spectrogram_for_gui.shape[1]
    root_group.create_dataset("frequencies", data=spectrogram_frequencies)
    root_group.create_dataset("times", data=spectrogram_times)

def _auto_detect_spectrogram_maxval(spectrogram: np.array, *, sr_spectrogram: float):
    Nt = spectrogram.shape[0]
    Nf = spectrogram.shape[1]
    chunk_num_samples = int(15 * sr_spectrogram)
    chunk_maxvals: list[float] = []
    i = 0
    while i + chunk_num_samples < Nt:
        chunk = spectrogram[i:i + chunk_num_samples]
        chunk_maxvals.append(np.max(chunk))
        i += chunk_num_samples
    v = np.median(chunk_maxvals)
    return v

def downsample_spectrogram_using_max(spectrogram: np.ndarray, *, ds_factor: int):
    Nt = spectrogram.shape[0]
    Nf = spectrogram.shape[1]
    Nt_ds = Nt // ds_factor
    spectrogram_ds = np.zeros((Nt_ds, Nf), dtype=spectrogram.dtype)
    spectrogram = spectrogram[:Nt_ds * ds_factor, :]
    spectrogram_reshaped = spectrogram.reshape((Nt_ds, ds_factor, Nf))
    spectrogram_ds = np.max(spectrogram_reshaped, axis=1)
    return spectrogram_ds

def _get_audio_sr_from_h5(h5_file: str):
    import h5py
    with h5py.File(h5_file, 'r') as f:
        d = json.loads(f['config'][()].decode('utf-8'))
        audio_sr_hz = d['microphone_sample_rate']
    return audio_sr_hz