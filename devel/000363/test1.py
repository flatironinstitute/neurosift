# pip install lindi
import lindi
import numpy as np
import matplotlib.pyplot as plt
from behavior_signal_processing import BehaviorFun


def test1_load():
    url = 'https://lindi.neurosift.org/dandi/dandisets/000363/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/nwb.lindi.json'

    # Load the remote file
    f = lindi.LindiH5pyFile.from_lindi_file(url)

    # load the neurodata object
    X = f['/acquisition/BehavioralTimeSeries/Camera0_side_JawTracking']
    assert isinstance(X, lindi.LindiH5pyGroup)

    timestamps = X['timestamps']
    assert isinstance(timestamps, lindi.LindiH5pyDataset)
    data = X['data']
    assert isinstance(data, lindi.LindiH5pyDataset)

    print(f'timestamps shape: {timestamps.shape}')
    print(f'data shape: {data.shape}')

    ts = timestamps[()]
    np.save('timestamps.npy', ts)
    d = data[()]
    np.save('data.npy', d)


def estimate_sample_rate(ts):
    diffs = np.diff(ts)
    delta = np.median(diffs)
    return 1 / delta


def test1():
    # test1_load()
    ts = np.load('timestamps.npy')
    d = np.load('data.npy')
    sample_rate = estimate_sample_rate(ts)
    print(f'Estimated sample rate: {sample_rate} Hz')
    x = BehaviorFun.compute_phase_for_movement(d[:, 1], sample_rate=sample_rate)
    assert isinstance(x, tuple)
    x1 = x[0]
    x2 = x[1]
    print(x1)
    print(x2)
    n = 10_000
    fig = plt.figure()
    ax = fig.add_subplot(2, 1, 1)
    ax.plot(ts[:n], d[:n, 1])
    ax = fig.add_subplot(2, 1, 2)
    ax.plot(ts[:n], x1[:n])
    plt.show()


if __name__ == "__main__":
    test1()
