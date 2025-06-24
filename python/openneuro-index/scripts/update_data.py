#!/usr/bin/env python3

import os
import json
import time
import argparse
import openai

from _load_openneuro_data import (
    _load_openneuro_data,
)


def _create_embedding_for_summary(summary: str, *, model: str):
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY environment variable not set.")
    client = openai.Client(
        api_key=OPENAI_API_KEY,
    )
    response = client.embeddings.create(input=summary, model=model)
    return response.data[0].embedding


def _generate_embeddings_if_needed(*, dataset_data, embeddings_fname: str):
    model = "text-embedding-3-large"
    current_title = dataset_data["name"]
    current_description = dataset_data["snapshot_readme"]

    embeddings = []
    if os.path.exists(embeddings_fname):
        with open(embeddings_fname, "r") as f:
            embeddings = json.load(f)

    need_update = False

    title_embedding = None
    desc_embedding = None

    if len(current_title) > 15:
        # important not to compute embedding for very short titles
        # find existing embedding
        ee = next(
            (e for e in embeddings if e["text"] == current_title and e["model"] == model),
            None,
        )
        if ee is not None:
            title_embedding = ee["embedding"]
        else:
            try:
                print(f'Generating embedding for title: {current_title}')
                title_embedding = _create_embedding_for_summary(current_title, model=model)
                need_update = True
            except:
                print(f"Error generating embedding for title: {current_title}")

    if current_description is not None and len(current_description) < 15000 and len(current_description) > 50:
        # Important not to compute embedding for very short or very long descriptions
        # find existing embedding
        ee = next(
            (e for e in embeddings if e["text"] == current_description and e["model"] == model),
            None,
        )
        if ee is not None:
            desc_embedding = ee["embedding"]
        else:
            try:
                print(f'Generating embedding for description: {len(current_description)}')
                desc_embedding = _create_embedding_for_summary(current_description, model=model)
                need_update = True
            except:
                print(f"Error generating embedding for description: {len(current_description)}")

    new_embeddings = []
    if title_embedding is not None:
        new_embeddings.append({
            "text": current_title,
            "model": model,
            "embedding": title_embedding
        })
    if desc_embedding is not None:
        new_embeddings.append({
            "text": current_description,
            "model": model,
            "embedding": desc_embedding
        })
    if need_update:
        with open(embeddings_fname, "w") as f:
            json.dump(new_embeddings, f, indent=2)


def update_data(*, generate_embeddings: bool):
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    openneuro_fname = f"{data_dir}/openneuro.json"
    if os.path.exists(openneuro_fname):
        with open(openneuro_fname, "r") as f:
            openneuro_data = json.load(f)
        timestamp = openneuro_data.get("timestamp", None)
    else:
        timestamp = None
    elapsed = time.time() - (timestamp or 0)
    if elapsed > 60 * 60:
        print("Updating openneuro.json")
        openneuro_data = _load_openneuro_data()
        with open(openneuro_fname, "w") as f:
            json.dump(openneuro_data, f, indent=2)
    else:
        print("Skipping openneuro.json update")
        with open(openneuro_fname, "r") as f:
            openneuro_data = json.load(f)
    datasets = openneuro_data["datasets"]
    # sort by dataset id:
    datasets.sort(key=lambda x: x["dataset_id"])
    for ii, dataset in enumerate(datasets):
        dataset_id = dataset["dataset_id"]
        dataset_data_dir = f"{data_dir}/datasets/{dataset_id}"
        if not os.path.exists(dataset_data_dir):
            os.makedirs(dataset_data_dir)
        dataset_fname = f"{dataset_data_dir}/dataset.json"
        if os.path.exists(dataset_fname):
            with open(dataset_fname, "r") as f:
                dataset_data = json.load(f)
        else:
            dataset_data = None
        snapshot_tag = dataset["snapshot_tag"]
        if dataset_data is None or snapshot_tag != dataset_data.get("snapshot_tag"):
            print(f"Processing dataset {dataset_id} ({ii+1}/{len(datasets)})")
            dataset_data = {
                "dataset_id": dataset_id,
                "name": dataset["name"],
                "dataset_created": dataset["dataset_created"],
                "snapshot_created": dataset["snapshot_created"],
                "snapshot_tag": snapshot_tag,
                "snapshot_readme": dataset["snapshot_readme"],
                "snapshot_total_files": dataset["snapshot_total_files"],
                "snapshot_size": dataset["snapshot_size"],
            }
            with open(dataset_fname, "w") as f:
                json.dump(dataset_data, f, indent=2)
        else:
            print(f"Skipping {dataset_id} update")

        if generate_embeddings:
            embeddings_fname = f"{dataset_data_dir}/embeddings.json"
            _generate_embeddings_if_needed(
                dataset_data=dataset_data, embeddings_fname=embeddings_fname
            )

        # For now we can't get the files because it will take a lot of requests to traverse the tree
        # if update_files:
        #     for vvv0 in ["v0"]:
        #         # remove old file info files
        #         file_dir0 = f"{dataset_data_dir}/files.{vvv0}"
        #         if os.path.exists(file_dir0):
        #             print(f"Removing old file info files in {file_dir0}")
        #             for fname in os.listdir(file_dir0):
        #                 if fname.endswith(".json"):
        #                     os.remove(os.path.join(file_dir0, fname))
        #             os.rmdir(file_dir0)
        #     vvv = "v1"
        #     for nwb_file in dataset_data["files"][:50]:
        #         asset_id = nwb_file["asset_id"]
        #         asset_fname = f"{dataset_data_dir}/assets.{vvv}/{asset_id}.json"
        #         asset_path = nwb_file["path"]
        #         if not os.path.exists(asset_fname):
        #             print(f"{dataset_id}: Loading asset info for {asset_path}")
        #             if not os.path.exists(f"{dataset_data_dir}/assets.{vvv}"):
        #                 os.makedirs(f"{dataset_data_dir}/assets.{vvv}")
        #             asset_info = _load_file_info(
        #                 dataset_id=dataset_id, asset_id=asset_id
        #             )
        #             with open(asset_fname, "w") as f:
        #                 json.dump(asset_info, f, indent=2)
        #         else:
        #             print(f"{dataset_id}: Asset info for {asset_path} already exists")
        #         if time.time() - start_time > 15:
        #             print(
        #                 f"Time limit reached for dataset {dataset_id}, moving to next"
        #             )
        #             break
        # else:
        #     print(f"Skipping file updates for dataset {dataset_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update OpenNeuro data index")
    # parser.add_argument(
    #     "--files", action="store_true", help="Update file information"
    # )
    parser.add_argument(
        "--embeddings",
        action="store_true",
        help="Generate semantic embeddings for dataset titles and descriptions",
    )
    args = parser.parse_args()
    # update_data(update_files=args.files, generate_embeddings=args.embeddings)
    update_data(generate_embeddings=args.embeddings)
