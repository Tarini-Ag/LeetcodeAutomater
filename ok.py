import requests
import random
import json
import os
from bs4 import BeautifulSoup
import time


LEETCODE_SESSION = ""
CSRFTOKEN = ""
PROGRESS_FILE = "progress.txt"
SKIPPED_FILE = "skipped_questions.txt"
MAX_Q = 3000

HEADERS = {
    "Content-Type": "application/json",
    "Origin": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0",
    "x-csrftoken": CSRFTOKEN,
    "Cookie": f"LEETCODE_SESSION={LEETCODE_SESSION}; csrftoken={CSRFTOKEN};"
}


if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, "r") as f:
        progress = json.load(f)
else:
    progress = {}

def log_skip(qnum, reason):
    with open(SKIPPED_FILE, "a") as f:
        f.write(f"{qnum}: {reason}\n")
    print(f"⚠️ Skipping #{qnum}: {reason}")

def get_random_question():
    attempts = 0
    while attempts < 100:
        qnum = random.randint(1, MAX_Q)
        if str(qnum) not in progress or not progress[str(qnum)]:
            return qnum
        attempts += 1
    return None

# ----------------- WALKCCC -----------------
def fetch_walkccc(qnum):
    url = f"https://walkccc.me/LeetCode/problems/{qnum}/"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            return None
        return resp.text
    except requests.exceptions.RequestException:
        return None

def extract_leetcode_url_and_code(html):
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    if not h1 or not h1.find("a"):
        return None, None
    leetcode_url = h1.find("a")["href"]
    if "premium" in soup.text.lower():
        return leetcode_url, None

    tabbed_sets = soup.find_all("div", class_="tabbed-set")
    for tab_set in tabbed_sets:
        labels = tab_set.find_all("label")
        java_index = next((i for i, label in enumerate(labels) if "Java" in label.text), None)
        if java_index is None:
            continue
        content_blocks = tab_set.find_all("div", class_="tabbed-block")
        if java_index >= len(content_blocks):
            continue
        java_block = content_blocks[java_index]
        code_tag = java_block.find("code")
        if code_tag:
            return leetcode_url, code_tag.text
    return leetcode_url, None

# ----------------- LEETCODE -----------------
def get_question_id(slug):
    graphql_url = "https://leetcode.com/graphql"
    query = {
        "operationName": "questionData",
        "variables": {"titleSlug": slug},
        "query": """query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) { questionId }
        }"""
    }
    try:
        resp = requests.post(graphql_url, headers=HEADERS, json=query)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data["data"]["question"]["questionId"]
    except Exception:
        return None

def submit_to_leetcode(leetcode_url, code):
    slug = leetcode_url.rstrip("/").split("/")[-1]
    qid = get_question_id(slug)
    if not qid:
        return 400, {"error": "Could not fetch questionId"}
    url = f"https://leetcode.com/problems/{slug}/submit/"
    headers = HEADERS.copy()
    headers["Referer"] = leetcode_url
    payload = {"lang": "java", "question_id": str(qid), "typed_code": code}
    try:
        resp = requests.post(url, headers=headers, json=payload)
        try:
            data = resp.json()
        except:
            data = {"raw": resp.text}
    except Exception as e:
        return 500, {"error": str(e)}
    return resp.status_code, data

# ----------------- MAIN LOGIC -----------------
def main():
    while True:  # Keep trying until one question is fully attempted
        qnum = get_random_question()
        if not qnum:
            print("No new question available or all questions processed.")
            return
        print(f"\n🔎 Trying question #{qnum}...")

        html = fetch_walkccc(qnum)
        if not html:
            log_skip(qnum, "walkccc page not found")
            progress[str(qnum)] = False
            continue

        leetcode_url, code = extract_leetcode_url_and_code(html)
        if not leetcode_url:
            log_skip(qnum, "LeetCode URL not found in walkccc")
            progress[str(qnum)] = False
            continue
        if not code:
            log_skip(qnum, "Java solution not found or premium problem")
            progress[str(qnum)] = False
            continue

        print("\n📄 Java solution code:\n", code)
        status, resp_data = submit_to_leetcode(leetcode_url, code)
        if status == 200 and "submission_id" in str(resp_data):
            print("✅ Submitted successfully!")
            progress[str(qnum)] = True
        else:
            reason = (
                resp_data.get("error")
                or resp_data.get("message")
                or str(resp_data)
            )
            print(f"❌ Submission failed for #{qnum}!")
            print("Detailed response:", json.dumps(resp_data, indent=2))
            log_skip(qnum, f"submission failed: {reason}")
            progress[str(qnum)] = False

        # Save progress after each attempt
        with open(PROGRESS_FILE, "w") as f:
            json.dump(progress, f, indent=2)

        # One question attempt per run
        break

if __name__ == "__main__":
    main()
