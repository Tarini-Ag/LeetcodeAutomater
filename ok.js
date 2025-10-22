const fs = require("fs-extra");
const path = require("path");

// Configuration
const CONFIG = {
  LEETCODE_SESSION: "",
  CSRFTOKEN: "",
  MAX_Q: 3691,
  TARGET_SUCCESS: 1,
  MAX_RANDOM_ATTEMPTS: 4,
  DELAY_BETWEEN_ATTEMPTS_MS: 1500,
  PROGRESS_FILE: "progress.json",
  SKIPPED_FILE: "skipped.log",
  DATA_FILE: "merged_output.json"
};

const HEADERS = {
  "Content-Type": "application/json",
  "Origin": "https://leetcode.com",
  "User-Agent": "Mozilla/5.0",
  "x-csrftoken": CONFIG.CSRFTOKEN,
  "Cookie": `LEETCODE_SESSION=${CONFIG.LEETCODE_SESSION}; csrftoken=${CONFIG.CSRFTOKEN};`
};

// Question filters (would be better to load from external files)
const PREMIUM_QUESTIONS = [156, 157, 158, /* ... */];
const DB_QUESTIONS = [175, 176, 177, /* ... */];

class LeetCodeSubmitter {
  constructor() {
    this.progress = {};
    this.doneQuestions = [];
    this.cloudflareRejections = 0;
    this.excludeSet = new Set();
  }

  // Utility functions
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // File operations
  loadProgress() {
    try {
      if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        const raw = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
        this.progress = JSON.parse(raw || "{}");
      }
    } catch (e) {
      console.error("Failed to load progress:", e.message);
      this.progress = {};
    }
  }

  saveProgress() {
    try {
      fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (e) {
      console.error("Failed to save progress:", e.message);
    }
  }

  logSkip(qnum, reason) {
    try {
      fs.appendFileSync(CONFIG.SKIPPED_FILE, `${qnum}: ${reason}\n`);
    } catch (e) {
      console.error("Failed to write skip log:", e.message);
    }
    console.warn(`⚠️ Skipping #${qnum}: ${reason}`);
  }

  // GraphQL operations
  async fetchGraphQL(payload) {
    try {
      const resp = await fetch("https://leetcode.com/graphql/", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(payload),
      });

      return resp.ok ? await resp.json() : null;
    } catch (e) {
      console.error("GraphQL fetch exception:", e.message);
      return null;
    }
  }

  async fetchSolvedQuestions() {
    const solved = new Set();
    let skip = 0;

    while (skip <= 3700) {
      const payload = {
        operationName: "problemsetQuestionListV2",
        query: `query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $searchKeyword: String, $skip: Int, $sortBy: QuestionSortByInput, $categorySlug: String) {
          problemsetQuestionListV2(
            filters: $filters
            limit: $limit
            searchKeyword: $searchKeyword
            skip: $skip
            sortBy: $sortBy
            categorySlug: $categorySlug
          ) {
            questions {
              questionFrontendId
              status
            }
            hasMore
          }
        }`,
        variables: {
          skip,
          limit: 100,
          categorySlug: "all-code-essentials",
          filters: { filterCombineType: "ALL", statusFilter: { questionStatuses: [], operator: "IS" } },
          sortBy: { sortField: "LAST_SUBMITTED_TIME", sortOrder: "DESCENDING" },
          searchKeyword: ""
        }
      };

      const data = await this.fetchGraphQL(payload);
      if (!data) break;

      const questions = data?.data?.problemsetQuestionListV2?.questions || [];
      if (questions.length === 0) break;

      // Add solved questions
      questions
        .filter(q => q.status === "SOLVED")
        .forEach(q => solved.add(parseInt(q.questionFrontendId, 10)));

      // Check if we should continue
      const hasMore = data?.data?.problemsetQuestionListV2?.hasMore || false;
      const lastQuestionSolved = questions[questions.length - 1]?.status === "SOLVED";
      
      if (!hasMore || !lastQuestionSolved) break;
      skip += 100;
    }

    return Array.from(solved);
  }

  // Question data extraction
  async extractQuestionData(qnum) {
    try {
      const filePath = path.join(__dirname, CONFIG.DATA_FILE);
      const dataRaw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(dataRaw);

      const problem = data.find(p => p.id === qnum);
      if (!problem) return [null, null];

      const leetcodeUrl = problem.leetcode_url;
      const walkccUrl = problem.walkcc_url;

      if (!walkccUrl) return [leetcodeUrl, null];

      // Fetch Java code
      const resp = await fetch(walkccUrl, { method: 'GET' });
      return resp.ok ? [leetcodeUrl, await resp.text()] : [leetcodeUrl, null];

    } catch (e) {
      return [null, null];
    }
  }

  // LeetCode submission
  async getQuestionId(slug) {
    const payload = {
      operationName: "questionData",
      variables: { titleSlug: slug },
      query: `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) { questionId }
      }`
    };

    const data = await this.fetchGraphQL(payload);
    return data?.data?.question?.questionId || null;
  }

  async submitToLeetCode(leetcodeUrl, code) {
    try {
      const slug = leetcodeUrl.replace(/\/+$/, "").split("/").pop();
      const questionId = await this.getQuestionId(slug);
      if (!questionId) {
        return [400, { error: "Could not fetch questionId" }];
      }

      const url = `https://leetcode.com/problems/${slug}/submit/`;
      const headers = { ...HEADERS, Referer: leetcodeUrl };
      const payload = { 
        lang: "java", 
        question_id: String(questionId), 
        typed_code: code 
      };

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const respText = await resp.text().catch(() => "");
      
      // Check for blocking
      if ([403, 429].includes(resp.status) || respText.toLowerCase().includes("cloudflare")) {
        return [resp.status, { error: "Blocked by Cloudflare or rate-limited", raw: respText }];
      }

      try {
        return [resp.status, JSON.parse(respText)];
      } catch {
        return [resp.status, { raw: respText }];
      }

    } catch (e) {
      return [500, { error: e.message }];
    }
  }

  // Question selection
  getRandomQuestion() {
    let attempts = 0;
    while (attempts < CONFIG.MAX_RANDOM_ATTEMPTS) {
      const qnum = this.randInt(1, CONFIG.MAX_Q);
      if (!this.excludeSet.has(String(qnum))) {
        return qnum;
      }
      attempts++;
    }
    return null;
  }

  buildExcludeSet() {
    // Add premium and database questions
    [...PREMIUM_QUESTIONS, ...DB_QUESTIONS].forEach(q => this.excludeSet.add(String(q)));
    
    // Add solved questions
    this.doneQuestions.forEach(q => this.excludeSet.add(String(q)));
    
    // Add already successful progress
    Object.entries(this.progress)
      .filter(([_, success]) => success)
      .forEach(([qnum, _]) => this.excludeSet.add(qnum));
  }

  // Main execution
  async run() {
    console.log("🚀 Starting LeetCode Submitter...");
    
    this.loadProgress();
    this.doneQuestions = await this.fetchSolvedQuestions();
    
    if (!this.doneQuestions?.length) {
      console.error("❌ Failed to retrieve solved questions. Exiting.");
      return;
    }

    console.log(`ℹ️ Found ${this.doneQuestions.length} solved questions.`);
    this.buildExcludeSet();
    console.log(`Excluding ${this.excludeSet.size} question ids.`);

    let successCount = 0;
    let totalAttempts = 0;
    const overallAttemptLimit = 2000;

    while (successCount < CONFIG.TARGET_SUCCESS && 
           this.cloudflareRejections < 4 && 
           totalAttempts < overallAttemptLimit) {
      
      totalAttempts++;
      const qnum = this.getRandomQuestion();
      
      if (!qnum) {
        console.log("No eligible question found after many attempts.");
        break;
      }

      const result = await this.processQuestion(qnum);
      if (result === "SUCCESS") {
        successCount++;
        this.excludeSet.add(String(qnum));
      }

      await this.sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
    }

    this.showSummary(successCount, totalAttempts);
  }

  async processQuestion(qnum) {
    console.log(`\n🔎 Attempting question #${qnum}...`);
    const qidStr = String(qnum);

    const [leetcodeUrl, code] = await this.extractQuestionData(qnum);
    
    if (!leetcodeUrl) {
      this.logSkip(qnum, "LeetCode URL not found");
      this.updateProgress(qidStr, false);
      return "SKIP";
    }

    if (leetcodeUrl.toLowerCase().includes("premium")) {
      this.logSkip(qnum, "LeetCode page is premium");
      this.updateProgress(qidStr, false);
      return "SKIP";
    }

    if (!code) {
      this.logSkip(qnum, "No code found");
      this.updateProgress(qidStr, false);
      return "SKIP";
    }

    return await this.submitQuestion(qnum, leetcodeUrl, code, qidStr);
  }

  async submitQuestion(qnum, leetcodeUrl, code, qidStr) {
    const [status, respData] = await this.submitToLeetCode(leetcodeUrl, code);
    const respText = JSON.stringify(respData || {});

    // Handle blocking
    if ([403, 429].includes(status) || respText.toLowerCase().includes("cloudflare")) {
      this.cloudflareRejections++;
      console.warn(`🚫 Cloudflare detected (count ${this.cloudflareRejections}/4)`);
      this.logSkip(qnum, `blocked (status ${status})`);
      this.updateProgress(qidStr, false);
      return "BLOCKED";
    }

    // Handle submission failure
    if (status !== 200) {
      console.error(`❌ Submission failed with status: ${status}`);
      this.logSkip(qnum, `HTTP status ${status}`);
      this.updateProgress(qidStr, false);
      return "FAILED";
    }

    // Check for success
    if (this.isSubmissionSuccessful(respData, respText)) {
      console.log(`✅ Submitted successfully for #${qnum}!`);
      this.updateProgress(qidStr, true);
      return "SUCCESS";
    } else {
      console.error(`❌ Submission failed for #${qnum}`);
      this.logSkip(qnum, "submission failed");
      this.updateProgress(qidStr, false);
      return "FAILED";
    }
  }

  isSubmissionSuccessful(respData, respText) {
    return (respData?.submission_id || 
            respData?.submissionId || 
            respText.includes("submission_id") || 
            respText.toLowerCase().includes("success"));
  }

  updateProgress(qidStr, success) {
    this.progress[qidStr] = success;
    this.saveProgress();
  }

  showSummary(successCount, totalAttempts) {
    console.log("\n======= RUN SUMMARY =======");
    console.log(`Successes: ${successCount}/${CONFIG.TARGET_SUCCESS}`);
    console.log(`Total attempts: ${totalAttempts}`);
    console.log(`Cloudflare rejections: ${this.cloudflareRejections}`);
    
    if (this.cloudflareRejections >= 4) {
      console.warn("⚠️ Aborted due to Cloudflare blocking");
    } else if (successCount >= CONFIG.TARGET_SUCCESS) {
      console.log("🎉 Target achieved!");
    } else {
      console.log("ℹ️ Finished without achieving target");
    }
    console.log("===========================");
  }
}

// Run if called directly
if (require.main === module) {
  const submitter = new LeetCodeSubmitter();
  submitter.run().catch(err => {
    console.error("Unhandled error:", err);
  });
}

module.exports = LeetCodeSubmitter;