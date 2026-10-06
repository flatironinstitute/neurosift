import os
from kg_core.kg import kg
from kg_core.request import Pagination

# The KG moved from the openminds.ebrains.eu namespace to openminds.om-i.org
# (openMINDS v4). Try both and use whichever has datasets.
DATASET_TYPES = [
    "https://openminds.om-i.org/types/Dataset",
    "https://openminds.ebrains.eu/core/Dataset",
]


def _prop(a, name):
    # Look a property up by its local name, whatever its namespace.
    for k in a.keys():
        if k.rsplit("/", 1)[-1] == name:
            return a[k]
    return None


def _load_ebrains_data():
    MAX_DATASETS = 5000
    MIN_DATASETS = 500  # refuse to write an index that is suspiciously small

    token = os.getenv("TOKEN")
    kg_client = kg().with_token(token).build()

    dataset_type = None
    for t in DATASET_TYPES:
        r = kg_client.instances.list(
            t, pagination=Pagination(start=0, size=1, return_total_results=True)
        )
        print(f"Type {t}: total={r.total}", flush=True)
        if dataset_type is None and r.total:
            dataset_type = t
    if dataset_type is None:
        raise Exception("No EBRAINS datasets found under any known type")

    datasets = []
    for a in kg_client.instances.list(dataset_type).items():
        full_name = _prop(a, "fullName")
        print(
            f"{len(datasets) + 1} :: Loading dataset {a.uuid} ({full_name})",
            flush=True,
        )
        has_version = _prop(a, "hasVersion")
        if isinstance(has_version, dict):
            has_version = [has_version]
        if not has_version:
            print(f"  skipping {a.uuid}: no versions")
            continue
        datasets.append(
            {
                "dataset_id": has_version[-1]["@id"].split("/")[-1],
                "name": full_name,
                "description": _prop(a, "description"),
                "first_released_at": _prop(a, "firstReleasedAt"),
                "last_released_at": _prop(a, "lastReleasedAt"),
            }
        )
        if len(datasets) >= MAX_DATASETS:
            break

    if len(datasets) < MIN_DATASETS:
        raise Exception(f"Only {len(datasets)} datasets loaded; not writing the index")
    return {"datasets": datasets}
