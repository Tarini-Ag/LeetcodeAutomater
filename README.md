# LeetCode Automator (Python)

- This script automatically:

- Picks a random LeetCode problem number (1–3000)

- Fetches its Java solution from WalkCCC

- Extracts the LeetCode URL

- Submits the solution to LeetCode using your session & CSRF tokens

- Logs progress and skipped questions

## Requirements

1. Python Packages
```
pip install requests beautifulsoup4
```


2. LeetCode Authentication Tokens

   To submit code, you must provide:
```
LEETCODE_SESSION

csrftoken
```

### How to get them (Chrome browser):

- [Install this extension:](https://chromewebstore.google.com/detail/cookie-editor/iphcomljdfghbkdcfndaijbokpgddeno)

- Log in to https://leetcode.com

- Open the Cookie Editor

- Copy the values of:

- LEETCODE_SESSION

- csrftoken

Paste them into the script here:
```
LEETCODE_SESSION = ""
CSRFTOKEN = ""
```

## How to Run
python ok.py


- Each run will:

- Try one random question

- Fetch Java solution (if available)

- Submit it to LeetCode

- Save the result
