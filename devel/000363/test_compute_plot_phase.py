# %%
import lindi
import numpy as np
import matplotlib.pyplot as plt
from behavior_signal_processing import BehaviorFun, FilterFun, Utils

# %%
# Load the data
def test1_load():
    url = 'https://lindi.neurosift.org/dandi/dandisets/000363/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/nwb.lindi.json'
    f = lindi.LindiH5pyFile.from_lindi_file(url)
    X = f['/acquisition/BehavioralTimeSeries/Camera0_side_JawTracking']
    timestamps = X['timestamps'][()]
    data = X['data'][()]
    np.save('timestamps.npy', timestamps)
    np.save('data.npy', data)

# %%
# Estimate sample rate
def estimate_sample_rate(ts):
    diffs = np.diff(ts)
    delta = np.median(diffs)
    return 1 / delta

# %%
# Main processing function
def test1():
    # %%
    # test1_load()
    ts = np.load('timestamps.npy')
    d = np.load('data.npy')
    sample_rate = estimate_sample_rate(ts)
    print(f'Estimated sample rate: {sample_rate} Hz')

    # Keep only one channel
    behavior_trace = d[:, 1]

    # [optional but recommended] Bandpass filter the data
    signal_class = 'jaw_movement'
    settings = BehaviorFun.signal_settings.get(signal_class, BehaviorFun.signal_settings['default'])
    band_pass_cutoffs = settings['band_pass_cutoffs']
    filtered_trace = FilterFun.filter_signal(behavior_trace, sample_rate, ['bandpass', band_pass_cutoffs])

    # [optional but recommended] Detect movement periods
    movement_mask = Utils.detect_movement_periods(filtered_trace, timestamps=ts)[0]

    # Compute phase
    phase = BehaviorFun.compute_phase_for_movement(filtered_trace, sample_rate=sample_rate, movement_mask=movement_mask)[0]

    print(ts[~np.isnan(phase)][:1000])
    ts_masked = ts[~np.isnan(phase)]
    phase_masked = phase[~np.isnan(phase)]

    max_t = ts_masked[10_000]

    # %%
    # Plot the data
    n = 22_500
    fig, ax = plt.subplots()
    ax.plot(ts[ts < max_t], filtered_trace[ts < max_t], label='Behavior Trace')
    ax.plot(ts_masked[ts_masked < max_t], phase_masked[ts_masked < max_t], label='Phase Trace')
    ax.legend()
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Signal/Phase')
    ax.set_title('Original Trace and Phase Trace')

    plt.show()


# %%
if __name__ == "__main__":
    test1()
