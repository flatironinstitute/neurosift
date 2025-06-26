import requests
import os
from kg_core.kg import kg

API_URL = "https://openneuro.org/crn/graphql"


def _load_ebrains_data():
    MAX_DATASETS = 2000

    datasets = []

    token = os.getenv("TOKEN")

    kg_client = kg().with_token(token).build()

    result = kg_client.instances.list("https://openminds.ebrains.eu/core/Dataset")

    for a in result.items():
        num = len(datasets) + 1
        print(
            f'{num} :: Loading dataset {a.uuid} ({a["https://openminds.ebrains.eu/vocab/fullName"]})'
        )
        instance_id = str(a.uuid)
        full_name = a["https://openminds.ebrains.eu/vocab/fullName"]
        description = a["https://openminds.ebrains.eu/vocab/description"]
        first_released_at = a["https://core.kg.ebrains.eu/vocab/meta/firstReleasedAt"]
        last_released_at = a["https://core.kg.ebrains.eu/vocab/meta/lastReleasedAt"]
        datasets.append(
            {
                "dataset_id": instance_id,
                "name": full_name,
                "description": description,
                "first_released_at": first_released_at,
                "last_released_at": last_released_at,
            }
        )
        if MAX_DATASETS is not None and len(datasets) >= MAX_DATASETS:
            break

    return {"datasets": datasets}
