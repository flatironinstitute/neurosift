import json
import os
import openai


def _create_embedding_for_summary(summary: str, *, model: str):
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY environment variable not set.")
    client = openai.Client(
        api_key=OPENAI_API_KEY,
    )
    response = client.embeddings.create(input=summary, model=model)
    return response.data[0].embedding


def _generate_embeddings_if_needed(*, dandiset_data, embeddings_fname: str):
    model = "text-embedding-3-large"
    current_title = dandiset_data["name"]
    current_description = dandiset_data["metadata"].get("description", "")

    # Initialize with empty embeddings
    embeddings = []
    if os.path.exists(embeddings_fname):
        with open(embeddings_fname, "r") as f:
            embeddings = json.load(f)

    need_update = False

    # Check and update title embedding if needed
    title_entry = embeddings[0] if len(embeddings) > 0 else None
    if (
        not title_entry
        or title_entry["text"] != current_title
        or title_entry["model"] != model
    ):
        print(f"Generating title embedding for {dandiset_data['dandiset_id']}")
        title_embedding = _create_embedding_for_summary(current_title, model=model)
        embeddings = [
            {"text": current_title, "embedding": title_embedding, "model": model}
        ] + (embeddings[1:] if len(embeddings) > 1 else [])
        need_update = True

    # Check and update description embedding if needed
    desc_entry = embeddings[1] if len(embeddings) > 1 else None
    if (
        not desc_entry
        or desc_entry["text"] != current_description
        or desc_entry["model"] != model
    ):
        print(f"Generating description embedding for {dandiset_data['dandiset_id']}")
        desc_embedding = _create_embedding_for_summary(current_description, model=model)
        embeddings = [
            embeddings[0],
            {"text": current_description, "embedding": desc_embedding, "model": model},
        ]
        need_update = True

    # Save if any updates were made
    if need_update:
        with open(embeddings_fname, "w") as f:
            json.dump(embeddings, f, indent=2)
