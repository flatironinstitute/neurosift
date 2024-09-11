import os
import numpy as np
from scipy.signal import butter, filtfilt, hilbert, decimate
from scipy.interpolate import interp1d

class FilterFun:

    @staticmethod
    def filter_signal(data, sampling_rate, filter_option):
        """ Filter data based on provided options """
        if not isinstance(data, np.ndarray):
            data = np.array(data, dtype=float)

        # Calculate Nyquist frequency
        nyquist_f = sampling_rate / 2

        # Check filter type
        if filter_option[0] == 'lowpass':
            if len(filter_option) == 1:
                filt_lp = 6000
            else:
                filt_lp = filter_option[1]
            b, a = butter(3, filt_lp / nyquist_f, btype='low')
        elif filter_option[0] == 'LFP':
            if len(filter_option) == 1:
                filt_lp = 300
            else:
                filt_lp = filter_option[1]
            b, a = butter(3, filt_lp / sampling_rate, btype='low')
        elif filter_option[0] == 'highpass':
            if len(filter_option) == 1:
                filt_hp = 500
            else:
                filt_hp = filter_option[1]
            b, a = butter(3, filt_hp / nyquist_f, btype='high')
        elif filter_option[0] == 'bandpass':
            if len(filter_option) == 1:
                filt_hp, filt_lp = 500, 10000
            else:
                filt_hp, filt_lp = filter_option[1]
            b, a = butter(3, [filt_hp / nyquist_f, filt_lp / nyquist_f], btype='bandpass')
        else:
            raise ValueError(f"Unsupported filter option: {filter_option[0]}")

        # Apply filter to the data
        if data.ndim == 1:
            data = filtfilt(b, a, data)
        else:
            for ch_nm in range(data.shape[0]):
                data[ch_nm, :] = filtfilt(b, a, data[ch_nm, :])

        print(f'{filter_option[0].capitalize()} filter applied')
        return data

    @staticmethod
    def filter_car(data, sampling_rate, channel_selection=None, filter_option=['bandpass', [600, 6000]]):
        """ Common average referencing with filtering """

        # Apply filter to the data using the existing filter_signal method
        data = FilterFun.filter_signal(data, sampling_rate, filter_option)

        # If the data is 1D, just subtract the median
        if data.ndim == 1:
            data = data - np.median(data)
        else:
            # Validate channel_selection for CAR
            if channel_selection is None:
                raise ValueError('Channel selection argument is required for CAR filtering')

            # Use all channels if 'all' is specified in filter_option
            if len(filter_option) > 1 and filter_option[1] == 'all':
                channel_selection = np.arange(data.shape[0])

            # Subtract the median of the selected channels
            data = data - np.median(data[channel_selection, :], axis=0)

        print(f'CAR filtering done')
        return data

class BehaviorFun:

    signal_settings = {
        'whisking': {
            'band_pass_cutoffs': [8, 30],
            'movement_threshold': 0.01
        },
        'setpoint': {
            'band_pass_cutoffs': [0.1, 4],
            'movement_threshold': 0.005
        },
        'breathing': {
            'band_pass_cutoffs': [0.05, 8],
            'movement_threshold': 0.002
        },
        'jaw_movement': {
            'band_pass_cutoffs': [0.05, 10],
            'movement_threshold': 0.02
        },
        'tongue_movement': {
            'band_pass_cutoffs': [0.5, 12],
            'movement_threshold': 0.015
        },
        'default': {
            'band_pass_cutoffs': [0.05, 30],
            'movement_threshold': 0.01
        }
    }

    @staticmethod
    def lob_pass_behav_data(behav_trace, sampling_rate=1000, threshold=20):
        lp_behav_trace = []
        for behav_trace_num in range(behav_trace.shape[0]):
            lp_behav_trace.append(FilterFun.pre_proc_data(behav_trace[behav_trace_num, :], sampling_rate, ['lowpass']))
        return np.array(lp_behav_trace)

    @staticmethod
    def band_pass_behav_data(behav_trace, sampling_rate=1000, threshold=[4, 30]):
        bp_behav_trace = []
        for behav_trace_num in range(behav_trace.shape[0]):
            bp_behav_trace.append(FilterFun.pre_proc_data(behav_trace[behav_trace_num, :], sampling_rate, ['bandpass', threshold]))
        return np.array(bp_behav_trace)

    @staticmethod
    def high_pass_behav_data(behav_trace, sampling_rate=1000, threshold=0.3):
        hp_behav_trace = []
        for behav_trace_num in range(behav_trace.shape[0]):
            hp_behav_trace.append(FilterFun.pre_proc_data(behav_trace[behav_trace_num, :], sampling_rate, ['highpass', threshold]))
        return np.array(hp_behav_trace)

    @staticmethod
    def angle_convention(angles, whiskerpad):
        if whiskerpad['FaceSideInImage'] == 'right':
            angles = -angles
        if whiskerpad['ProtractionDirection'] == 'downward':
            angles = 180 - angles
        return angles

    @staticmethod
    def resample_behav_data(behav_tracking_data, vid_times, sampling_rate):
        vid_times_ms = vid_times / sampling_rate * 1000
        behav_trace_ms = []
        for behav_trace_num in range(behav_tracking_data.shape[0]):
            f = interp1d(vid_times_ms, behav_tracking_data[behav_trace_num, :], kind='linear', fill_value="extrapolate")
            behav_trace_ms.append(f(np.arange(vid_times_ms[0], vid_times_ms[-1])))
        return np.array(behav_trace_ms)

    @staticmethod
    def find_peak_whisking(behav_trace_ms):
        peak_whisking = []
        for behav_trace_num in range(behav_trace_ms.shape[0]):
            diff_trace = np.diff(np.abs(np.diff(behav_trace_ms[behav_trace_num, :])))
            peak_whisking.append(np.concatenate(([0, 0], np.diff(np.maximum.accumulate(diff_trace)))))
        return np.array(peak_whisking)

    def get_overall_amplitude(trace):
        """Calculates the amplitude of a given trace as max - min."""
        return np.ptp(trace)  # peak-to-peak amplitude

    @staticmethod
    def get_amplitude_trace(b_traces, b_phase):
        """Calculates the amplitude of behavior traces based on the phase."""
        return BehaviorFun.find_extrema(b_traces, b_phase, np.ptp)

    @staticmethod
    def get_set_point_trace(b_traces, b_phase):
        """Calculates the set point of behavior traces based on the phase."""
        setpoint_fun = lambda x: (np.max(x) + np.min(x)) / 2
        return BehaviorFun.find_extrema(b_traces, b_phase, setpoint_fun)

    @staticmethod
    def find_extrema(behav_trace, behav_signal_phase, operation):
        """Find extrema in the behavior trace based on the phase."""
        peak_idx = np.where((behav_signal_phase[:-1] < 0) & (behav_signal_phase[1:] >= 0))[0]
        trough_idx = np.where((behav_signal_phase[:-1] >= np.pi / 2) & (behav_signal_phase[1:] <= -np.pi / 2))[0]

        temp, pos = [], []
        for val_num in range(1, len(peak_idx)):
            vals = behav_trace[peak_idx[val_num-1]:peak_idx[val_num]]
            temp.append(operation(vals))
        if len(peak_idx) > 1:
            pos.extend(np.round(peak_idx[:-1] + np.diff(peak_idx) / 2).astype(int))

        for val_num in range(1, len(trough_idx)):
            vals = behav_trace[trough_idx[val_num-1]:trough_idx[val_num]]
            temp.append(operation(vals))
        if len(trough_idx) > 1:
            pos.extend(np.round(trough_idx[:-1] + np.diff(trough_idx) / 2).astype(int))

        pos, temp = [0] + sorted(pos) + [len(behav_trace) - 1], [temp[0]] + temp + [temp[-1]]

        interp_sig = np.zeros(len(behav_trace))
        for val_num in range(1, len(pos)):
            in_range = np.arange(pos[val_num-1], pos[val_num])
            interp_sig[in_range] = np.linspace(temp[val_num-1], temp[val_num], len(in_range))

        return interp_sig, peak_idx, trough_idx

    # @staticmethod
    # def compute_phase(behav_trace, sample_rate=500, behav_period_idx=None, signal_class='whisking'):
    #     if behav_period_idx is None:
    #         behav_period_idx = np.ones(behav_trace.shape[1], dtype=bool)

    #     if signal_class == 'whisking':
    #         band_pass_cutoffs = [8, 30]
    #     elif signal_class == 'setpoint':
    #         band_pass_cutoffs = [0.1, 4]
    #     elif signal_class == 'breathing':
    #         band_pass_cutoffs = [0.05, 8]

    #     behav_signal_phase, behav_freq, behav_amplitude = (np.nan * np.ones(behav_trace.shape) for _ in range(3))
    #     for behav_trace_num in range(behav_trace.shape[0]):
    #         w1, w2 = band_pass_cutoffs[0] / (sample_rate / 2), band_pass_cutoffs[1] / (sample_rate / 2)
    #         b, a = butter(2, [w1, w2], btype='bandpass')
    #         theta_no_nan = np.nan_to_num(behav_trace[behav_trace_num, :])
    #         filtered_signal = filtfilt(b, a, theta_no_nan)

    #         ht_angle_trace = hilbert(filtered_signal)
    #         behav_signal_phase[behav_trace_num, :] = -np.angle(ht_angle_trace)
    #         behav_freq[behav_trace_num, 1:] = sample_rate / (2 * np.pi) * np.diff(np.unwrap(behav_signal_phase[behav_trace_num, :]))
    #         behav_amplitude[behav_trace_num, :] = np.abs(ht_angle_trace)

    #     behav_signal_phase[:, ~behav_period_idx] = np.nan
    #     return behav_signal_phase, behav_freq, behav_amplitude

    @staticmethod
    def compute_phase_for_movement(trace, sample_rate, highpass_cutoff=2,
                                   movement_mask=None, return_unmasked=False):
        """
        Computes the phase of the trace using the Hilbert transform and optionally returns both masked and unmasked phases.

        Parameters:
        trace: np.ndarray
            The input behavior trace (1D array).
        sample_rate: int
            The sampling rate of the trace (in Hz).
        highpass_cutoff: float
            Cutoff frequency for the high-pass filter.
        movement_mask: np.ndarray (optional)
            Boolean array indicating periods of movement. If None, no masking is applied.
        return_unmasked: bool
            If True, returns both the masked and unmasked phase. Default is False.

        Returns:
        tuple:
            If return_unmasked is True, returns (masked_phase, unmasked_phase, analytic_signal).
            Otherwise, returns (masked_phase, analytic_signal).
        """
        # First high-pass filter and center the trace on zero for proper phase calculation
        highpass_trace = FilterFun.filter_signal(trace, sample_rate, ['highpass', highpass_cutoff])
        highpass_trace -= np.mean(highpass_trace)

        # Hilbert transform to get the analytic signal
        analytic_signal = hilbert(highpass_trace)
        phase = np.angle(analytic_signal)  # Phase in radians (-π to π)

        # If return_unmasked is requested, keep the original phase
        unmasked_phase = phase.copy() if return_unmasked else None

        # Mask phase for periods without movement if a movement mask is provided
        if movement_mask is not None:
            phase[~movement_mask] = np.nan

        if return_unmasked:
            return phase, unmasked_phase, analytic_signal
        else:
            return phase, analytic_signal

    @staticmethod
    def compute_features(behav_trace, sample_rate=500, signal_class=None, movement_threshold=0.01):
        """
        Compute phase, frequency, amplitude, and movement periods for behavior traces.

        Parameters:
        behav_trace: np.ndarray
            2D array of behavior traces.
        sample_rate: int
            Sampling rate of the behavior traces.
        signal_class: str
            Type of signal ('whisking', 'setpoint', 'breathing') for selecting bandpass filter.
        movement_threshold: float
            Threshold for detecting movement periods.

        Returns:
        dict
            Dictionary with phase, frequency, amplitude, and movement mask.
        """

        # Retrieve settings for the given signal class
        settings = BehaviorFun.signal_settings.get(signal_class, BehaviorFun.signal_settings['default'])
        band_pass_cutoffs = settings['band_pass_cutoffs']
        movement_threshold = settings['movement_threshold']

        # Initialize arrays for phase, frequency, and amplitude
        behav_signal_phase, behav_freq, behav_amplitude = (np.nan * np.ones(behav_trace.shape) for _ in range(3))
        movement_mask_list = []

        # Process each behavior trace
        for behav_trace_num in range(behav_trace.shape[0]):
            # Bandpass filter the signal
            filtered_trace = FilterFun.pre_proc_data(behav_trace[behav_trace_num, :], sample_rate, ['bandpass', band_pass_cutoffs])

            # Detect movement periods
            movement_mask = Utils.detect_movement_periods(filtered_trace, movement_threshold)
            movement_mask_list.append(movement_mask)

            # Compute Hilbert transform to get phase and amplitude
            phase, analytic_signal = BehaviorFun.compute_phase_for_movement(filtered_trace, movement_mask) # Phase in radians (-π to π)
            amplitude = np.abs(analytic_signal)  # Amplitude of the signal

            # Compute frequency based on the phase
            freq = np.zeros_like(phase)
            freq[1:] = sample_rate / (2 * np.pi) * np.diff(np.unwrap(phase))

            # Store the phase, amplitude, and frequency
            behav_signal_phase[behav_trace_num, :] = phase
            behav_amplitude[behav_trace_num, :] = amplitude
            behav_freq[behav_trace_num, :] = freq

        # Return results as a dictionary
        return {
            'phase': behav_signal_phase,
            'frequency': behav_freq,
            'amplitude': behav_amplitude,
            'movement_mask': np.array(movement_mask_list)
        }



class Utils:

    @staticmethod
    def get_file(data_dir, extension='.json', type='smallest'):
        candidate_file = None
        if type == 'smallest':
            target_value = float('inf')
        elif type == 'largest':
            target_value = 0
        elif type == 'recent':
            target_value = 0
        else:
            raise ValueError("type must be either 'smallest', 'largest', or 'recent'")

        for root, dirs, files in os.walk(data_dir):
            for file in files:
                if file.endswith(extension):
                    file_path = os.path.join(root, file)
                    size = os.path.getsize(file_path)
                    mtime = os.path.getmtime(file_path)

                    if type == 'smallest' and size < target_value:
                        target_value = size
                        candidate_file = file_path
                    elif type == 'largest' and size > target_value:
                        target_value = size
                        candidate_file = file_path
                    elif type == 'recent' and mtime > target_value:
                        target_value = mtime
                        candidate_file = file_path

        return candidate_file

    @staticmethod
    def get_best_trace(trace1, trace2):
        amplitude1 = np.ptp(trace1)
        amplitude2 = np.ptp(trace2)

        return trace1 if amplitude1 > amplitude2 else trace2


    @staticmethod
    def detect_movement_periods(trace, velocity_threshold=None, amplitude_threshold=None, duration=1, sample_rate=None, timestamps=None, min_stable_duration=0.5):
        """
        Detect periods of movement based on velocity and amplitude thresholds, and keep only movement
        periods that exceed the specified duration.

        Parameters:
        trace: np.ndarray
            The input behavior trace (1D array).
        velocity_threshold: float
            Threshold for detecting movement based on velocity.
        amplitude_threshold: float, optional
            Threshold for detecting movement based on amplitude. If not provided, it defaults to 2 * std(trace).
        duration: float
            Minimum duration (in seconds) for a movement period to be considered valid.
        sample_rate: int, optional
            The sampling rate of the trace (in Hz). Required if `timestamps` is not provided.
        timestamps: np.ndarray, optional
            The timestamps corresponding to each sample in the trace. If provided, it overrides the sample_rate.
        min_stable_duration: float, optional
            Minimum duration (in seconds) where both velocity and amplitude must drop below thresholds to end a movement epoch.

        Returns:
        np.ndarray
            A movement mask (boolean array) where True indicates movement periods that meet the duration criterion.
        """
        if timestamps is None and sample_rate is None:
            raise ValueError("You must provide either a sample_rate or timestamps.")

        # Detect movement based on velocity threshold
        velocity = np.abs(np.diff(trace, prepend=trace[0]))

        if velocity_threshold is None:
            velocity_threshold = np.std(velocity)
        velocity_mask = velocity > velocity_threshold

        # Detect movement based on amplitude threshold
        if amplitude_threshold is None:
            amplitude_threshold = 2 * np.std(trace)
        amplitude_mask = np.abs(trace) > amplitude_threshold

        # Combine velocity and amplitude masks
        combined_mask = velocity_mask & amplitude_mask

        # If sample_rate is provided, calculate duration in terms of samples
        if sample_rate is not None:
            min_duration_samples = int(duration * sample_rate)
            min_stable_samples = int(min_stable_duration * sample_rate)
        elif timestamps is not None:
            # Calculate duration based on timestamps
            time_diffs = np.diff(timestamps, prepend=timestamps[0])
            min_duration_samples = int(duration / np.mean(time_diffs))
            min_stable_samples = int(min_stable_duration / np.mean(time_diffs))

        filtered_movement_mask = np.zeros_like(combined_mask, dtype=bool)

        # Detect movement epochs based on combined mask
        in_movement = False
        start_idx = None

        for i in range(len(combined_mask)):
            if combined_mask[i] and not in_movement:
                # Instead of using the current index as the start, backtrack to find when velocity or amplitude first exceeded thresholds
                for backtrack in range(i, -1, -1):  # Start backtracking from the current index
                    if not velocity_mask[backtrack] and not amplitude_mask[backtrack]:
                        start_idx = backtrack + 1  # Start the movement at the first point where either mask is True
                        break
                else:
                    start_idx = 0  # In case the loop reaches the start, use index 0
                in_movement = True

            elif not combined_mask[i] and in_movement:
                # Check if the movement is truly ending (must be stable below both thresholds for min_stable_samples)
                stable_count = 0
                for j in range(i, min(i + min_stable_samples, len(combined_mask))):
                    if not velocity_mask[j] and not amplitude_mask[j]:
                        stable_count += 1
                    else:
                        break

                if stable_count >= min_stable_samples:
                    # End of movement epoch, check duration
                    end_idx = i
                    if (end_idx - start_idx) >= min_duration_samples:
                        filtered_movement_mask[start_idx:end_idx] = True
                    in_movement = False

        # Handle the case where the last movement period continues until the end
        if in_movement:
            end_idx = len(combined_mask)
            if (end_idx - start_idx) >= min_duration_samples:
                filtered_movement_mask[start_idx:] = True

        return filtered_movement_mask, velocity_mask, amplitude_mask
