import requests

API_URL = "https://openneuro.org/crn/graphql"


def _load_openneuro_data():
    PAGE_SIZE = 25
    MAX_DATASETS = 100

    datasets = []
    cursor = None
    while MAX_DATASETS is None or len(datasets) < MAX_DATASETS:
        query = """
        query FetchDatasets($first: Int!, $after: String) {
            datasets(first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        id
                        name
                        created
                        draft {
                            modified
                        }
                        latestSnapshot {
                            tag
                            summary {
                                totalFiles
                                size
                            }
                            readme
                            created
                        }
                    }
                }
            }
        }
        """
        variables = {
            "first": PAGE_SIZE,
            "after": cursor,
        }

        response = requests.post(API_URL, json={"query": query, "variables": variables})
        response.raise_for_status()
        data0 = response.json()

        dataset_edges = data0["data"]["datasets"]["edges"]
        for edge in dataset_edges:
            if edge is None:
                continue
            node = edge["node"]
            try:
                datasets.append(
                    {
                        "dataset_id": node["id"],
                        "name": node["name"],
                        "dataset_created": node["created"],
                        "snapshot_created": node["latestSnapshot"]["created"],
                        "snapshot_tag": node["latestSnapshot"]["tag"],
                        "snapshot_readme": node["latestSnapshot"]["readme"],
                        "snapshot_total_files": (
                            node["latestSnapshot"]["summary"]["totalFiles"]
                            if node["latestSnapshot"]
                            and node["latestSnapshot"]["summary"]
                            else 0
                        ),
                        "snapshot_size": (
                            node["latestSnapshot"]["summary"]["size"]
                            if node["latestSnapshot"]
                            and node["latestSnapshot"]["summary"]
                            else 0
                        ),
                    }
                )
            except Exception as e:
                print(node)
                print(f"Error processing dataset {node['id']}: {e}")
            if MAX_DATASETS is not None and len(datasets) >= MAX_DATASETS:
                break

        page_info = data0["data"]["datasets"]["pageInfo"]
        if not page_info["hasNextPage"]:
            break
        cursor = page_info["endCursor"]
        print(f"Loaded {len(datasets)} datasets so far...")

    return {"datasets": datasets}
