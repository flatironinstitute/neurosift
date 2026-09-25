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


def _metadata_fields(dandiset_data) -> list:
    """(label, values) pairs for the structured metadata that the title and
    description often leave out."""
    metadata = dandiset_data["metadata"]
    assets_summary = metadata.get("assetsSummary") or {}
    return [
        ("Keywords", _names(metadata.get("keywords"))),
        ("Species", _names(assets_summary.get("species"))),
        ("Anatomy", _names(metadata.get("about"))),
        ("Approaches", _names(assets_summary.get("approach"))),
        ("Measurement techniques", _names(assets_summary.get("measurementTechnique"))),
        ("Variables measured", _names(assets_summary.get("variableMeasured"))),
    ]


def _format(title: str, fields: list) -> str:
    lines = [title]
    for label, values in fields:
        if values:
            lines.append(f"{label}: {', '.join(values)}")
    return "\n".join(lines)


def _metadata_summary(dandiset_data) -> str:
    """Title plus the structured metadata fields. The title is included to
    anchor the text to this dandiset, since the structured fields alone are
    shared by many dandisets."""
    return _format(dandiset_data["name"], _metadata_fields(dandiset_data))


MAX_CONTRIBUTORS = 10
MAX_FULL_SUMMARY_CHARS = 20000  # well under the embedding model's input limit


def _full_summary(dandiset_data) -> str:
    """Everything useful for search in one text: the metadata summary fields,
    plus contributors, funders, projects, related resources, and the
    description. Queries that combine a topic with, say, a species or method
    can only match a text that contains both."""
    metadata = dandiset_data["metadata"]
    contributors, funders = [], []
    # Organizations (labs, consortia) first: they are more likely to be
    # searched for than individual names, and the list is truncated.
    ordered = sorted(
        metadata.get("contributor") or [],
        key=lambda c: c.get("schemaKey") != "Organization",
    )
    for c in ordered:
        name = c.get("name")
        if not name:
            continue
        target = funders if "dcite:Funder" in (c.get("roleName") or []) else contributors
        if name not in target:
            target.append(name)
    fields = _metadata_fields(dandiset_data) + [
        ("Contributors", contributors[:MAX_CONTRIBUTORS]),
        ("Funders", funders),
        ("Projects", _names(metadata.get("wasGeneratedBy"))),
        ("Related resources", _names(metadata.get("relatedResource"))),
    ]
    text = _format(dandiset_data["name"], fields)
    description = metadata.get("description") or ""
    if description:
        text += "\n\n" + description
    return text[:MAX_FULL_SUMMARY_CHARS]


def _generate_embeddings_if_needed(*, dandiset_data, embeddings_fname: str):
    model = "text-embedding-3-large"
    # One embedding per text, in this order. Semantic search scores a dandiset
    # by its best-matching embedding, so each text can match a query on its own.
    texts = [
        ("title", dandiset_data["name"]),
        ("description", dandiset_data["metadata"].get("description", "")),
        ("metadata", _metadata_summary(dandiset_data)),
        ("full", _full_summary(dandiset_data)),
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
