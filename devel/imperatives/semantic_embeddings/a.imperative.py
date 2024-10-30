"""
system hash: da39a3ee5e6b4b0d3255bfef95601890afd80709
////////////////////////////////////////////////////////////////////////////////////////////////////
If the AI_GENERATED_DANDISET_SUMMARIES_DIR environment variable is not set, then raise an exception telling user to set it.
They should clone https://github.com/magland/ai_generated_dandiset_summaries.

////////////////////////////////////////////////////////////////////////////////////////////////////
Here's how files are organized in that repo

$AI_GENERATED_DANDISET_SUMMARIES_DIR/
    dandisets/
        000003/
            summary.md
        000004/
            summary.md
        ...

where 000003, 000004, etc. are the dandiset ids.

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
import struct
import phil


def get_environment_variable():
    env_var = os.getenv('AI_GENERATED_DANDISET_SUMMARIES_DIR')
    if not env_var:
        raise RuntimeError("Please set the environment variable AI_GENERATED_DANDISET_SUMMARIES_DIR. Clone the repository from https://github.com/magland/ai_generated_dandiset_summaries.")
    return env_var


def is_valid_dandiset_id(did):
    return len(did) == 6 and did.isdigit()


def compute_sha1_of_text(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()


def main():
    dir_path = get_environment_variable()
    dandisets_dir = os.path.join(dir_path, 'dandisets')
    
    dandiset_embeddings = {}
    dandiset_ids = []
    embedding_list = []

    if not os.path.exists('output'):
        os.makedirs('output')
    if not os.path.exists('embeddings_cache'):
        os.makedirs('embeddings_cache')

    dandiset_folders = os.listdir(dandisets_dir)
    total_dandisets = len(dandiset_folders)
    processed_count = 0

    for dandiset_id in dandiset_folders:
        if not is_valid_dandiset_id(dandiset_id):
            print(f"Warning: Dandiset ID {dandiset_id} is not a valid 6-digit number. Skipping it.")
            continue

        dandiset_summary_path = os.path.join(dandisets_dir, dandiset_id, 'summary.md')
        
        if not os.path.exists(dandiset_summary_path):
            print(f"Warning: No summary.md found in dandiset {dandiset_id}.")
            continue

        with open(dandiset_summary_path, 'r') as file:
            summary_text = file.read()

        sha1_hash = compute_sha1_of_text(summary_text)
        cache_file_path = os.path.join('embeddings_cache', f'{sha1_hash}.json')

        if os.path.exists(cache_file_path):
            with open(cache_file_path, 'r') as cache_file:
                vector = json.load(cache_file)
                print(f"Cache hit for dandiset {dandiset_id}.")
        else:
            vector = phil.compute_semantic_embedding_vector(summary_text)
            with open(cache_file_path, 'w') as cache_file:
                json.dump(vector, cache_file)

        dandiset_embeddings[dandiset_id] = vector
        dandiset_ids.append(dandiset_id)
        embedding_list.extend(vector)

        processed_count += 1
        print(f"Processed dandiset {dandiset_id}. {processed_count} out of {total_dandisets}. Vector length: {len(vector)}")

    # Write JSON output
    with open('output/dandiset_embeddings.json', 'w') as f:
        json.dump(dandiset_embeddings, f)

    with open('output/dandiset_ids.json', 'w') as f:
        json.dump(dandiset_ids, f)

    # Write binary embedding data
    with open('output/dandiset_embeddings.dat', 'wb') as f:
        f.write(struct.pack(f'<{len(embedding_list)}f', *embedding_list))

    print(f"Output files created:")
    print(f"dandiset_embeddings.json: {os.path.getsize('output/dandiset_embeddings.json') / (1024*1024):.2f} MB")
    print(f"dandiset_ids.json: {os.path.getsize('output/dandiset_ids.json') / (1024*1024):.2f} MB")
    print(f"dandiset_embeddings.dat: {os.path.getsize('output/dandiset_embeddings.dat') / (1024*1024):.2f} MB")

    # Write documentation
    with open('output/doc.md', 'w') as f:
        f.write("""# Dandiset Embeddings Documentation

The `dandiset_embeddings.json` file contains the semantic embedding vectors for each dandiset, structured as a JSON object where keys are dandiset ids, and values are lists of floats representing the embedding vectors.

The `dandiset_ids.json` file contains a list of dandiset ids in the same order as their corresponding embedding vectors appear in `dandiset_embeddings.dat`.

The `dandiset_embeddings.dat` file is a binary file containing 32-bit float values sequentially for the embedding vectors. The vectors appear in the same order as the ids in `dandiset_ids.json`.

All embedding vectors have a length of {0}. Make sure to handle them in the appropriate manner when using them for computation or analysis.""".format(len(next(iter(dandiset_embeddings.values())))))

    # Upload the files
    phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_embeddings.json", "output/dandiset_embeddings.json")
    phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/embeddings.dat", "output/dandiset_embeddings.dat")
    phil.upload_file("https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_ids.txt", "output/dandiset_ids.json")


if __name__ == "__main__":
    main()