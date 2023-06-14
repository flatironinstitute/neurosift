import json
from abc import abstractmethod
from ._serialize import _serialize


class View:
    """
    Base class for all views
    """
    def __init__(self, view_type: str) -> None:
        self.type = view_type
    @abstractmethod
    def to_dict(self) -> dict:
        return {}
    def save(self, fname: str) -> None:
        with open(fname, 'w') as f:
            json.dump(_serialize(self.to_dict()), f)