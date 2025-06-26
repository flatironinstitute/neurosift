#!/usr/bin/env python3

import os
import json
import time
import argparse
import openai

from _load_ebrains_data import (
    _load_ebrains_data,
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
    current_description = dataset_data["description"]

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
            (
                e
                for e in embeddings
                if e["text"] == current_title and e["model"] == model
            ),
            None,
        )
        if ee is not None:
            title_embedding = ee["embedding"]
        else:
            try:
                print(f"Generating embedding for title: {current_title}")
                title_embedding = _create_embedding_for_summary(
                    current_title, model=model
                )
                need_update = True
            except:
                print(f"Error generating embedding for title: {current_title}")

    if (
        current_description is not None
        and len(current_description) < 15000
        and len(current_description) > 50
    ):
        # Important not to compute embedding for very short or very long descriptions
        # find existing embedding
        ee = next(
            (
                e
                for e in embeddings
                if e["text"] == current_description and e["model"] == model
            ),
            None,
        )
        if ee is not None:
            desc_embedding = ee["embedding"]
        else:
            try:
                print(
                    f"Generating embedding for description: {len(current_description)}"
                )
                desc_embedding = _create_embedding_for_summary(
                    current_description, model=model
                )
                need_update = True
            except:
                print(
                    f"Error generating embedding for description: {len(current_description)}"
                )

    new_embeddings = []
    if title_embedding is not None:
        new_embeddings.append(
            {"text": current_title, "model": model, "embedding": title_embedding}
        )
    if desc_embedding is not None:
        new_embeddings.append(
            {"text": current_description, "model": model, "embedding": desc_embedding}
        )
    if need_update:
        with open(embeddings_fname, "w") as f:
            json.dump(new_embeddings, f, indent=2)


def update_data(*, generate_embeddings: bool):
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    ebrains_fname = f"{data_dir}/ebrains.json"
    if os.path.exists(ebrains_fname):
        with open(ebrains_fname, "r") as f:
            ebrains_data = json.load(f)
        timestamp = ebrains_data.get("timestamp", None)
    else:
        timestamp = None
    elapsed = time.time() - (timestamp or 0)
    if elapsed > 60 * 60:
        print("Updating ebrains.json")
        ebrains_data = _load_ebrains_data()
        with open(ebrains_fname, "w") as f:
            json.dump(ebrains_data, f, indent=2)
    else:
        print("Skipping ebrains.json update")
        with open(ebrains_fname, "r") as f:
            ebrains_data = json.load(f)
    datasets = ebrains_data["datasets"]
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
        last_released_at = dataset.get("last_released_at", None)
        if dataset_data is None or last_released_at != dataset_data.get(
            "last_released_at"
        ):
            print(f"Processing dataset {dataset_id} ({ii+1}/{len(datasets)})")
            dataset_data = {
                "dataset_id": dataset_id,
                "name": dataset["name"],
                "description": dataset["description"],
                "first_released_at": dataset["first_released_at"],
                "last_released_at": dataset["last_released_at"],
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update Ebrains data index")
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
