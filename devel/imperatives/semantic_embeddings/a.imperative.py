"""
system hash: da39a3ee5e6b4b0d3255bfef95601890afd80709
Check to see if this environment variable has been set: AI_GENERATED_DANDISET_SUMMARIES_DIR
If not, raise an exception and tell user to clone https://github.com/magland/ai_generated_dandiset_summaries

////////////////////////////////////////////////////////////////////////////////////////////////////
Here's how the input files are organized.

$AI_GENERATED_DANDISET_SUMMARIES_DIR/
    dandisets/
        000003/
            summary.md
        000004/
            summary.md
        ...

where 000003, 000004, etc. are the dandiset ids.

The output directory is relative to the directory where this script is run.

When you traverse the dandisets directory, be sure to validate that the dandiset id is a 6-digit number, and ignore the directory if it is not (print a warning).

////////////////////////////////////////////////////////////////////////////////////////////////////
For each dandiset, read the summary.md file and then compute the semantic embedding vector of it using

import phil
vec = phil.compute_semantic_embedding_vector(text: str)

Then assemble those vectors in a JSON file called output/dandiset_embeddings.json starting from the directory where this script is run.

The JSON file should look like this:

{
    "000003": [0.1, 0.2, 0.3, ...],
    "000004": [0.2, 0.3, 0.4, ...],
    ...
}

////////////////////////////////////////////////////////////////////////////////////////////////////
Then prepare a second file output/dandiset_ids.json with a list of dandiset ids like this:

['000003', '000004', ...]

////////////////////////////////////////////////////////////////////////////////////////////////////
Then prepare a third file output/dandiset_embeddings.dat with 32-bit floats containing just the vectors liek this:

0.1 0.2 0.3 ...
0.2 0.3 0.4 ...
...

The vectors should be in the same order as the dandiset_ids.json file.

////////////////////////////////////////////////////////////////////////////////////////////////////
Print progress throughout showing which dandiset is being processed and how many dandisets have been processed so far out of the total number of dandisets.
Also print the length of each embedding vector as you go.

At the end print the sizes of the output files in megabytes.

Then write a output/doc.md file describing the contents of the three files. Also point out the length of the embedding vectors.

////////////////////////////////////////////////////////////////////////////////////////////////////
Finally, upload these files to

https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_embeddings.json
https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/embeddings.dat
https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_ids.txt

using

import phil
phil.upload_file(url: str, filename: str)

////////////////////////////////////////////////////////////////////////////////////////////////////
AND you're going to implement caching. Each time you are going to compute an embedding vector do the following:
* Compute the sha1 of the text.
* Check if there is a file called embeddings_cache/<sha1>.json
* If so, then read the json file and use that as the embedding vector (it will be a list of numbers). Print that there was a cache hit.
* Otherwise, compute the embedding vector and save it to embeddings_cache/<sha1>.json
"""

import os
import json
import hashlib
import numpy as np
import phil  # Assuming phil is imported as a library
from pathlib import Path

# Check environment variable
dandiset_dir = os.getenv('AI_GENERATED_DANDISET_SUMMARIES_DIR')
if not dandiset_dir:
    raise Exception("Environment variable AI_GENERATED_DANDISET_SUMMARIES_DIR not set. Please clone https://github.com/magland/ai_generated_dandiset_summaries")

output_dir = Path("output")
cache_dir = Path("embeddings_cache")

# Create necessary directories
output_dir.mkdir(exist_ok=True)
cache_dir.mkdir(exist_ok=True)

# Initialize empty structures
dandiset_embeddings = {}
dandiset_ids = []

# Traverse dandisets directory
dandisets_path = Path(dandiset_dir) / "dandisets"
total_dandisets = sum(1 for item in dandisets_path.iterdir() if item.is_dir() and item.name.isdigit() and len(item.name) == 6)

processed_count = 0
for dandiset in dandisets_path.iterdir():
    if dandiset.is_dir() and dandiset.name.isdigit() and len(dandiset.name) == 6:
        summary_path = dandiset / "summary.md"
        if summary_path.exists():
            with open(summary_path, 'r') as file:
                text = file.read()

            # Compute SHA1 and check for cache
            text_sha1 = hashlib.sha1(text.encode('utf-8')).hexdigest()
            cache_file = cache_dir / f"{text_sha1}.json"
            
            if cache_file.exists():
                print(f"Cache hit for dandiset {dandiset.name}.")
                with open(cache_file, 'r') as cache:
                    vec = json.load(cache)
            else:
                vec = phil.compute_semantic_embedding_vector(text)
                with open(cache_file, 'w') as cache:
                    json.dump(vec, cache)

            dandiset_embeddings[dandiset.name] = vec
            dandiset_ids.append(dandiset.name)

            embedding_length = len(vec)
            print(f"Processed dandiset {dandiset.name} ({processed_count + 1}/{total_dandisets}), embedding length: {embedding_length}")

            processed_count += 1
    else:
        if dandiset.is_dir():
            print(f"Warning: Ignoring directory {dandiset.name} as it is not a valid 6-digit dandiset id.")

# Write dandiset_embeddings.json
with open(output_dir / "dandiset_embeddings.json", 'w') as f:
    json.dump(dandiset_embeddings, f)

# Write dandiset_ids.json
with open(output_dir / "dandiset_ids.json", 'w') as f:
    json.dump(dandiset_ids, f)

# Write dandiset_embeddings.dat
embeddings_array = np.array([dandiset_embeddings[dandi_id] for dandi_id in dandiset_ids], dtype=np.float32)
embeddings_array.tofile(output_dir / "dandiset_embeddings.dat")

# Print the sizes of the output files
for file_name in ["dandiset_embeddings.json", "dandiset_ids.json", "dandiset_embeddings.dat"]:
    size_mb = os.path.getsize(output_dir / file_name) / (1024 * 1024)
    print(f"Size of {file_name}: {size_mb:.2f} MB")

# Write documentation file
with open(output_dir / "doc.md", 'w') as doc_file:
    doc_file.write(f"""
# Dandiset Embeddings Documentation

This directory contains the following files:

- **dandiset_embeddings.json**: A mapping from dandiset IDs to their semantic embedding vectors.
- **dandiset_ids.json**: A list of dandiset IDs corresponding to the embeddings.
- **dandiset_embeddings.dat**: A binary file containing 32-bit floating point embedding vectors.

Each embedding vector has a length of {embedding_length}.

These files are generated by processing summaries of dandisets for semantic analysis.
""")

# Upload files
phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_embeddings.json", str(output_dir / "dandiset_embeddings.json"))
phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/embeddings.dat", str(output_dir / "dandiset_embeddings.dat"))
phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_ids.txt", str(output_dir / "dandiset_ids.json"))