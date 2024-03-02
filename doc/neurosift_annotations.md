# Neurosift annotations (experimental)

Neurosift has an **experimental** feature where you can add annotations to DANDI
NWB files, with those annotions being stored in a GitHub repository. This
feature is experimental and may change in the future.

## Setup

**Step 1: Create a GitHub repository for your annotations**

Create a new GitHub repository where your annotations will be stored. This can
be a public or private repository, but it is recommended that you use a *public*
repository so that you will be able to more easily share your annotations more
easily with others. Possible names could be "annotations",
"neurosift-annotations", or "dandi-annotations". The same repo can be used to
hold annotations for multiple NWB files in multiple DANDIsets.

**Step 2: Install the neurosift-annotations GitHub app on your repository** (this is a one-time step)

Go to the [neurosift-annotations GitHub app](https://github.com/apps/neurosift-annotations) and click "Install".
Following the principle of least privilege, you should give access only to the repository where you want to store your annotations.

**Step 3: Authenticate with GitHub in Neurosift to give it access to your installed app**

In Neurosift, click on the key icon in the top right corner and click to log in
to neurosift-annotations. This will allow Neurosift to access your GitHub
repository to store your annotations.

## Usage

Navigate to a DANDI NWB file in Neurosift. You will see a new "Annotations" tab.
Click on this tab to get more information about viewing and managing the
annotations for this file.

## How annotations are stored in the repository

Suppose that the DANDset ID is `000582` and the path of the NWB file is
`000582/sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb``. Then, the
annotations will get stored at

```
dandisets/000582/sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb/annotations.jsonl
```

This is a json-lines file, a text file where each line contains a JSON object
defining the annotation. Here is an example annotation:

```
{
    "id": "annotation-1",
    "timestamp": 000000000000,
    "user": "user1",
    "type": "note",
    "data": {
        "path": "Units",
        "text": "This is a note about the Units table"
    }
}
```

except this would of course be formatted as a single line in the file.

## Types of annotations

For now the only type of annotation is a "note", which is a piece of text that
can be attached to any neurodata object in the NWB file. In the future we plan
to support other types of annotations such as unit curations, etc.