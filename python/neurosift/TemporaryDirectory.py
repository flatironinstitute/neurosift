import os
import shutil
import time
import random
import tempfile

class TemporaryDirectory():
    def __init__(self, *, remove: bool=True, prefix: str='tmp'):
        self._remove = remove
        self._prefix = prefix

    def __enter__(self) -> str:
        tmpdir = tempfile.gettempdir()
        self._path = f'{tmpdir}/{self._prefix}_{_random_string(8)}'
        os.mkdir(self._path)
        return self._path

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._remove:
            if not os.getenv('KACHERY_CLOUD_KEEP_TEMP_FILES') == '1':
                _rmdir_with_retries(self._path, num_retries=5)

    def path(self):
        return self._path


def _rmdir_with_retries(dirname: str, num_retries: int, delay_between_tries: float=1):
    for retry_num in range(1, num_retries + 1):
        if not os.path.exists(dirname):
            return
        try:
            shutil.rmtree(dirname)
            break
        except: # pragma: no cover
            if retry_num < num_retries:
                print('Retrying to remove directory: {}'.format(dirname))
                time.sleep(delay_between_tries)
            else:
                raise Exception('Unable to remove directory after {} tries: {}'.format(num_retries, dirname))

def _random_string(num_chars: int) -> str:
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return ''.join(random.choice(chars) for _ in range(num_chars))