import os


def prepare_api_for_dev_prod(mode: str):
    if mode == 'dev':
        replace_throughout_all_ts_files('.js"; // remove .js for local dev', '"; // remove .js for local dev')
    elif mode == 'prod':
        prepare_api_for_dev_prod('dev')  # first remove any .js so that this is idempotent
        replace_throughout_all_ts_files('"; // remove .js for local dev', '.js"; // remove .js for local dev')
    else:
        raise ValueError(f"mode must be 'dev' or 'prod', but was {mode}")

def replace_throughout_all_ts_files(old: str, new: str):
    thisdir = os.path.dirname(os.path.realpath(__file__))
    for root_dir in [os.path.join(thisdir, '../api'), os.path.join(thisdir, '../apiHelpers')]:
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.endswith('.ts'):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r') as f:
                        content = f.read()
                    content = content.replace(old, new)
                    with open(file_path, 'w') as f:
                        f.write(content)

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print("Usage: prepare_api_for_dev_prod.py dev|prod")
        sys.exit(1)
    prepare_api_for_dev_prod(sys.argv[1])

