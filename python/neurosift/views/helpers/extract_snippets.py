from typing import Union, List
import numpy as np
import numpy.typing as npt


def extract_snippets(
    traces: npt.NDArray[np.float32], *,
    times: npt.NDArray[np.int32],
    T1: int,
    T2: int
) -> npt.NDArray[np.float32]:
    M = traces.shape[1]
    L = len(times)

    snippets = np.zeros((L, T1 + T2, M), dtype=np.float32)
    for j in range(L):
        t1 = times[j] - T1
        t2 = times[j] + T2
        if 0 <= t1 and t2 < traces.shape[0]:
            snippets[j] = traces[t1:t2]
    return snippets

def extract_snippets_in_channel_neighborhood(
    traces: npt.NDArray[np.float32], *,
    times: npt.NDArray[np.int32],
    neighborhood: Union[List[int], None],
    T1: int,
    T2: int
) -> np.ndarray:
    L = len(times)

    if neighborhood is None:
        neighborhood = list(range(traces.shape[1]))

    snippets = np.zeros((L, T1 + T2, len(neighborhood)), dtype=np.float32)
    for j in range(L):
        t1 = times[j] - T1
        t2 = times[j] + T2
        snippets[j] = traces[t1:t2][:, neighborhood]
            
    return snippets