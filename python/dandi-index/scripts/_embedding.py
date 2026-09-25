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


def _names(items) -> list:
    """Names of a list of DANDI metadata entries (dicts with a "name", or strings)."""
    names = []
    for item in items or []:
        name = item.get("name") if isinstance(item, dict) else item
        if name and name not in names:
            names.append(str(name))
    return names


def _metadata_summary(dandiset_data) -> str:
    """Title plus the structured metadata that the title and description often
    leave out: keywords, species, anatomy, approaches, techniques, and measured
    variables. The title is included to anchor the text to this dandiset, since
    the structured fields alone are shared by many dandisets."""
    metadata = dandiset_data["metadata"]
    assets_summary = metadata.get("assetsSummary") or {}
    fields = [
        ("Keywords", _names(metadata.get("keywords"))),
        ("Species", _names(assets_summary.get("species"))),
        ("Anatomy", _names(metadata.get("about"))),
        ("Approaches", _names(assets_summary.get("approach"))),
        ("Measurement techniques", _names(assets_summary.get("measurementTechnique"))),
        ("Variables measured", _names(assets_summary.get("variableMeasured"))),
    ]
    lines = [dandiset_data["name"]]
    for label, values in fields:
        if values:
            lines.append(f"{label}: {', '.join(values)}")
    return "\n".join(lines)


def _generate_embeddings_if_needed(*, dandiset_data, embeddings_fname: str):
    model = "text-embedding-3-large"
    # One embedding per text, in this order. Semantic search scores a dandiset
    # by its best-matching embedding, so each text can match a query on its own.
    texts = [
        ("title", dandiset_data["name"]),
        ("description", dandiset_data["metadata"].get("description", "")),
        ("metadata", _metadata_summary(dandiset_data)),
    ]

    embeddings = []
    if os.path.exists(embeddings_fname):
        with open(embeddings_fname, "r") as f:
            embeddings = json.load(f)

    need_update = len(embeddings) != len(texts)
    new_embeddings = []
    for i, (label, text) in enumerate(texts):
        entry = embeddings[i] if i < len(embeddings) else None
        if not entry or entry["text"] != text or entry["model"] != model:
            print(f"Generating {label} embedding for {dandiset_data['dandiset_id']}")
            entry = {
                "text": text,
                "embedding": _create_embedding_for_summary(text, model=model),
                "model": model,
            }
            need_update = True
        new_embeddings.append(entry)

    if need_update:
        with open(embeddings_fname, "w") as f:
            json.dump(new_embeddings, f, indent=2)
