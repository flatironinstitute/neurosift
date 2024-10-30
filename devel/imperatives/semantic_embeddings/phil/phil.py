import os
import time


def compute_semantic_embedding_vector(text: str):
    import openai
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY environment variable not set.")
    client = openai.Client(
        api_key=OPENAI_API_KEY,
    )
    model = 'text-embedding-3-large'
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding


def upload_file(url: str, filename: str):
    import boto3

    filename = str(filename)  # in case it comes in as a Path object

    print(f"Uploading {filename} to {url}")

    if not url.startswith("https://lindi.neurosift.org/tmp/"):
        raise ValueError(f"Invalid URL for uploading text file: {url}")
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        region_name="auto",  # for cloudflare
    )
    bucket = "neurosift-lindi"
    object_key = url[len("https://lindi.neurosift.org/"):]
    _upload_file_to_s3(s3, bucket, object_key, filename)


def _upload_file_to_s3(s3, bucket, object_key, fname):
    if fname.endswith(".html"):
        content_type = "text/html"
    elif fname.endswith(".js"):
        content_type = "application/javascript"
    elif fname.endswith(".css"):
        content_type = "text/css"
    elif fname.endswith(".png"):
        content_type = "image/png"
    elif fname.endswith(".jpg"):
        content_type = "image/jpeg"
    elif fname.endswith(".svg"):
        content_type = "image/svg+xml"
    elif fname.endswith(".json"):
        content_type = "application/json"
    elif fname.endswith(".gz"):
        content_type = "application/gzip"
    else:
        content_type = None
    extra_args = {}
    if content_type is not None:
        extra_args["ContentType"] = content_type
    num_retries = 3
    while True:
        try:
            s3.upload_file(fname, bucket, object_key, ExtraArgs=extra_args)
            break
        except Exception as e:
            print(f"Error uploading {object_key} to S3: {e}")
            time.sleep(3)
            num_retries -= 1
            if num_retries == 0:
                raise
