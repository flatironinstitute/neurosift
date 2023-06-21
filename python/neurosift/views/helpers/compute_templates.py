import numpy.typing as npt
import numpy as np
import time
from .extract_snippets import extract_snippets


def compute_templates(*, traces: npt.NDArray[np.float32], sorting):
    unit_ids = sorting.unit_ids
    K = len(unit_ids)
    M = traces.shape[1]
    T1 = 30
    T2 = 30
    T = T1 + T2
    print('Compute templates')
    templates = np.zeros((K, T, M), dtype=np.float32)
    timer = time.time()
    for i in range(K):
        elapsed = time.time() - timer
        if elapsed > 5:
            timer = time.time()
            print(f'Computing template for unit {i + 1} of {K}')
        unit_id = unit_ids[i]
        times1 = sorting.get_unit_spike_train(unit_id, segment_index=0)
        snippets1 = extract_snippets(traces, times=times1, T1=T1, T2=T2)
        templates[i] = np.median(snippets1, axis=0)
    return templates