import json


class TimeseriesAnnotationEvent:
    def __init__(self, *,
                 start_time: float,
                 end_time: float,
                 event_type: str,
                 event_id: str
                 ):
        self.start_time = start_time
        self.end_time = end_time
        self.event_type = event_type
        self.event_id = event_id
    def to_dict(self):
        return {
            's': self.start_time,
            'e': self.end_time,
            't': self.event_type,
            'i': self.event_id
        }

class TimeseriesAnnotationEventType:
    def __init__(self, *,
                 event_type: str,
                 label: str,
                 color_index: int
                 ):
        self.event_type = event_type
        self.label = label
        self.color_index = color_index
    def to_dict(self):
        return {
            'event_type': self.event_type,
            'label': self.label,
            'color_index': self.color_index
        }

class TimeseriesAnnotation:
    def __init__(self, *,
                 events: list[TimeseriesAnnotationEvent],
                 event_types: list[TimeseriesAnnotationEventType]
                 ):
        self.events = events
        self.event_types = event_types
    def to_dict(self):
        return {
            'type': 'TimeseriesAnnotation',
            'event_types': [et.to_dict() for et in self.event_types],
            'events': [e.to_dict() for e in self.events]
        }
    def save(self, path: str):
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f)