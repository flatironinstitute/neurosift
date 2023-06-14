import json
from ._serialize import _serialize

class VideoAnnotationElement():
    def __init__(
        self,
        *,
        type: str,
        id: str,
        data: dict
    ) -> None:
        self.type = type
        self.id = id
        self.data = data
    def to_dict(self):
        return {
            't': self.type, # type
            'i': self.id, # id
            **_serialize(self.data) # data
        }

class VideoAnnotationNodeElement(VideoAnnotationElement):
    def __init__(self, id: str, *, x: float, y: float) -> None:
        super().__init__(type='n', id=id, data={'x': x, 'y': y})

class VideoAnnotationEdgeElement(VideoAnnotationElement):
    def __init__(self, id: str, *, id1: str, id2: str) -> None:
        super().__init__(type='e', id=id, data={'i1': id1, 'i2': id2})

class VideoAnnotationFrame():
    def __init__(self, elements: list[VideoAnnotationElement]) -> None:
        self.elements = elements
    def to_dict(self):
        return {
            'e': [el.to_dict() for el in self.elements]
        }

class VideoAnnotationNode():
    def __init__(self, *, id: str, label: str, color_index: int) -> None:
        self.id = id
        self.label = label
        self.color_index = color_index
    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'colorIndex': self.color_index
        }

class VideoAnnotation:
    def __init__(self, *,
                 width: int,
                 height: int,
                 nodes: list[VideoAnnotationNode],
                 frames: list[VideoAnnotationFrame],
                 frames_per_second: float
                ) -> None:
        self.width = width
        self.height = height
        self.nodes = nodes
        self.frames = frames
        self.frames_per_second = frames_per_second
    def save(self, path: str):
        if not path.endswith('ns-van'):
            raise ValueError('VideoAnnotation.save() requires a path ending in .ns-van')
        first_line = json.dumps({
            'width': self.width,
            'height': self.height,
            'frames_per_second': self.frames_per_second,
            'nodes': [node.to_dict() for node in self.nodes]
        })
        lines: list[str] = [first_line]
        for frame in self.frames:
            lines.append(json.dumps(frame.to_dict()))
        line_lengths = [len(line) for line in lines]
        with open(path, 'w') as f:
            f.write(json.dumps(line_lengths))
            f.write('\n')
            for line in lines:
                f.write(line)
                f.write('\n')