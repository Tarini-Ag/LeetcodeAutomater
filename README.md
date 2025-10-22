# LeetCode Auto Submission Script

This Node.js script automates fetching solved LeetCode problems, retrieves corresponding Java code (via WalkCCC data), and submits solutions directly to LeetCode using your authenticated session.

## Features

-  Fetches your solved LeetCode problems using GraphQL

- Skips premium-only & DB-only questions

- Extracts Java solutions from merged_output.json

- Submits code to LeetCode automatically

- Logs skipped/unsubmitted questions

- Tracks progress in progress.json

## Project Structure
```
project/
├── ok.js             # Your main Node.js script
├── merged_output.json    # Contains problem info (id, walkcc_url, leetcode_url)
├── progress.json         # Tracks submitted questions
├── skipped.log           # Logs skipped/unsubmitted entries
```

## Requirements
- Node.js Environment (Make sure Node.js is installed.)
```
node -v
npm -v
```
- Install Dependencies
```
npm install fs-extra
```

## Update Credentials in Script

Fill in these fields at the top of the file:
```
const LEETCODE_SESSION = "<your-session-cookie>";
const CSRFTOKEN = "<your-csrf-token>";
```
#### How to get them (Chrome browser):

- [Install this extension:](https://chromewebstore.google.com/detail/cookie-editor/iphcomljdfghbkdcfndaijbokpgddeno)

- Log in to https://leetcode.com

- Open the Cookie Editor

- Copy the values of:
```
LEETCODE_SESSION
csrftoken
```

Paste them into the script here:
```
LEETCODE_SESSION = ""
CSRFTOKEN = ""
```


## How It Works
- Constants
```
MAX_Q: Total number of questions to iterate (default: 3691)

TARGET_SUCCESS: Required success count (1 means first submission victory)

MAX_RANDOM_ATTEMPTS: Max retries per question

DELAY_BETWEEN_ATTEMPTS_MS: Delay between submissions

premiumQues: List of paid-only questions to skip

dbQues: List of SQL/DB-based questions to skip
```

## Running the Script

Run the script with Node:
```
node ok.js
```
