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
  OVERALL_ATTEMPT_LIMIT: 2000,
  MAX_CLOUDFLARE_REJECTIONS: 4,
  FETCH_TIMEOUT_MS: 10000,
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

// Premium and DB questions as Sets for O(1) lookup
const premiumQues = new Set([156, 157, 158, 159, 161, 163, 170, 186, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 259, 261, 265, 266, 267, 269, 270, 271, 272, 276, 277, 280, 281, 285, 286, 288, 291, 293, 294, 296, 298, 302, 305, 308, 311, 314, 317, 320, 323, 325, 333, 339, 340, 346, 348, 351, 353, 356, 358, 359, 360, 361, 362, 364, 366, 369, 370, 379, 408, 411, 418, 422, 425, 426, 428, 431, 439, 444, 465, 469, 471, 484, 487, 489, 490, 499, 505, 510, 512, 527, 531, 533, 534, 536, 544, 545, 548, 549, 555, 562, 568, 569, 571, 573, 574, 578, 579, 580, 582, 588, 597, 603, 604, 612, 613, 614, 615, 616, 618, 625, 631, 634, 635, 642, 644, 651, 656, 660, 663, 666, 681, 683, 694, 702, 708, 711, 716, 723, 727, 734, 737, 742, 750, 751, 755, 758, 759, 760, 772, 774, 776, 800, 1055, 1056, 1057, 1058, 1059, 1060, 1062, 1063, 1064, 1065, 1066, 1067, 1069, 1076, 1077, 1082, 1083, 1085, 1086, 1087, 1088, 1097, 1098, 1099, 1100, 1101, 1102, 1107, 1112, 1113, 1118, 1119, 1120, 1121, 1126, 1127, 1132, 1133, 1134, 1135, 1136, 1142, 1149, 1150, 1151, 1152, 1153, 1159, 1165, 1166, 1167, 1168, 1173, 1176, 1180, 1181, 1182, 1183, 1188, 1194, 1196, 1197, 1198, 1199, 1205, 1212, 1213, 1214, 1215, 1216, 1225, 1228, 1229, 1230, 1231, 1236, 1241, 1242, 1243, 1244, 1245, 1246, 1256, 1257, 1258, 1259, 1264, 1265, 1270, 1271, 1272, 1273, 1274, 1279, 1285, 1294, 1303, 1308, 1322, 1336, 1350, 1355, 1364, 1369, 1384, 1398, 1412, 1421, 1426, 1427, 1428, 1429, 1430, 1435, 1440, 1445, 1454, 1459, 1468, 1469, 1474, 1479, 1485, 1490, 1495, 1500, 1501, 1506, 1511, 1516, 1522, 1532, 1533, 1538, 1543, 1548, 1549, 1554, 1555, 1564, 1565, 1570, 1571, 1580, 1586, 1596, 1597, 1602, 1607, 1612, 1613, 1618, 1623, 1628, 1634, 1635, 1644, 1645, 1650, 1651, 1660, 1666, 1676, 1677, 1682, 1692, 1698, 1699, 1708, 1709, 1714, 1715, 1724, 1730, 1740, 1746, 1747, 1756, 1762, 1767, 1772, 1777, 1778, 1783, 1788, 1794, 1804, 1809, 1810, 1811, 1820, 1821, 1826, 1831, 1836, 1841, 1842, 1843, 1852, 1853, 1858, 1867, 1868, 1874, 1875, 1885, 1891, 1892, 1902, 1908, 1917, 1918, 1919, 1924, 1933, 1939, 1940, 1949, 1950, 1951, 1956, 1966, 1972, 1973, 1983, 1988, 1989, 1990, 1999, 2004, 2005, 2010, 2015, 2020, 2021, 2026, 2031, 2036, 2041, 2046, 2051, 2052, 2061, 2066, 2067, 2072, 2077, 2082, 2083, 2084, 2093, 2098, 2107, 2112, 2113, 2118, 2123, 2128, 2137, 2142, 2143, 2152, 2153, 2158, 2159, 2168, 2173, 2174, 2175, 2184, 2189, 2198, 2199, 2204, 2205, 2214, 2219, 2228, 2229, 2230, 2237, 2238, 2247, 2252, 2253, 2254, 2263, 2268, 2277, 2282, 2291, 2292, 2297, 2298, 2307, 2308, 2313, 2314, 2323, 2324, 2329, 2330, 2339, 2340, 2345, 2346, 2355, 2361, 2362, 2371, 2372, 2377, 2378, 2387, 2388, 2393, 2394, 2403, 2408, 2417, 2422, 2431, 2436, 2445, 2450, 2459, 2464, 2473, 2474, 2479, 2480, 2489, 2494, 2495, 2504, 2505, 2510, 2519, 2524, 2533, 2534, 2539, 2548, 2557, 2590, 2599, 2604, 2613, 2628, 2632, 2633, 2636, 2638, 2647, 2655, 2664, 2668, 2669, 2674, 2675, 2676, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2700, 2701, 2702, 2714, 2720, 2728, 2737, 2738, 2743, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2764, 2773, 2774, 2775, 2776, 2777, 2782, 2783, 2792, 2793, 2794, 2795, 2796, 2797, 2802, 2803, 2804, 2805, 2814, 2819, 2820, 2821, 2822, 2823, 2832, 2837, 2838, 2847, 2852, 2853, 2854, 2863, 2868, 2892, 2893, 2898, 2907, 2912, 2921, 2922, 2927, 2936, 2941, 2950, 2955, 2964, 2969, 2978, 2979, 2984, 2985, 2986, 2987, 2988, 2989, 2990, 2991, 2992, 2993, 2994, 2995, 3004, 3009, 3018, 3023, 3032, 3037, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061, 3062, 3063, 3064, 3073, 3078, 3087, 3088, 3089, 3094, 3103, 3104, 3109, 3118, 3119, 3124, 3125, 3126, 3135, 3140, 3141, 3150, 3155, 3156, 3157, 3166, 3167, 3172, 3173, 3182, 3183, 3188, 3189, 3198, 3199, 3204, 3205, 3214, 3215, 3221, 3230, 3231, 3236, 3237, 3246, 3247, 3252, 3253, 3262, 3263, 3268, 3269, 3278, 3279, 3284, 3293, 3294, 3299, 3308, 3313, 3322, 3323, 3328, 3329, 3338, 3339, 3344, 3353, 3358, 3359, 3368, 3369, 3383, 3384, 3385, 3390, 3391, 3400, 3401, 3406, 3415, 3416, 3422, 3431, 3437, 3450, 3460, 3466, 3476, 3481, 3491, 3496, 3506, 3511, 3520, 3526, 3535, 3540, 3549, 3555, 3565, 3571, 3581, 3595, 3596, 3610, 3616, 3631, 3632, 3641, 3647, 3656, 3662, 3667, 3672, 3682, 3687]);

const dbQues = new Set([175, 176, 177, 178, 180, 181, 182, 183, 184, 185, 196, 197, 262, 511, 512, 534, 550, 569, 570, 571, 574, 577, 578, 579, 580, 584, 585, 586, 595, 596, 597, 601, 602, 603, 607, 608, 610, 612, 613, 614, 615, 618, 619, 620, 626, 627, 1045, 1050, 1068, 1069, 1070, 1075, 1076, 1077, 1082, 1083, 1084, 1097, 1098, 1107, 1112, 1113, 1126, 1127, 1132, 1141, 1142, 1148, 1149, 1158, 1159, 1164, 1173, 1174, 1179, 1193, 1194, 1204, 1205, 1211, 1212, 1225, 1241, 1251, 1264, 1270, 1280, 1285, 1294, 1303, 1308, 1321, 1322, 1327, 1336, 1341, 1350, 1355, 1364, 1369, 1378, 1384, 1393, 1398, 1407, 1412, 1421, 1435, 1440, 1445, 1454, 1459, 1468, 1479, 1484, 1495, 1501, 1511, 1517, 1527, 1532, 1543, 1549, 1555, 1565, 1571, 1581, 1587, 1596, 1607, 1613, 1623, 1633, 1635, 1645, 1651, 1661, 1667, 1677, 1683, 1693, 1699, 1709, 1715, 1729, 1731, 1741, 1747, 1757, 1767, 1777, 1783, 1789, 1795, 1809, 1811, 1821, 1831, 1841, 1843, 1853, 1867, 1873, 1875, 1890, 1892, 1907, 1917, 1919, 1934, 1939, 1949, 1951, 1965, 1972, 1978, 1988, 1990, 2004, 2010, 2020, 2026, 2041, 2051, 2066, 2072, 2082, 2084, 2112, 2118, 2142, 2153, 2159, 2173, 2175, 2199, 2205, 2228, 2230, 2238, 2252, 2253, 2292, 2298, 2308, 2314, 2324, 2329, 2339, 2346, 2356, 2362, 2372, 2377, 2388, 2394, 2474, 2480, 2494, 2504, 2668, 2669, 2686, 2687, 2688, 2701, 2720, 2738, 2752, 2783, 2837, 2853, 2854, 2893, 2922, 2978, 2984, 2985, 2986, 2987, 2988, 2989, 2990, 2991, 2993, 2994, 2995, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061, 3087, 3089, 3103, 3118, 3124, 3126, 3140, 3150, 3156, 3166, 3172, 3182, 3188, 3198, 3204, 3214, 3220, 3230, 3236, 3246, 3252, 3262, 3268, 3278, 3293, 3308, 3322, 3328, 3338, 3358, 3368, 3374, 3384, 3390, 3401, 3415, 3421, 3436, 3451, 3465, 3475, 3482, 3497, 3521, 3554, 3564, 3570, 3580, 3586, 3601, 3611]);

// State
let doneQues = [];
let progress = {};
let cloudflare_rejections = 0;
let cachedDataFile = null; // Cache the data file to avoid repeated reads

// Utility functions
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// GraphQL query for fetching questions
async function fetchQuestions(skip) {
  const payload = {
    operationName: "problemsetQuestionListV2",
    query: `
      query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $searchKeyword: String, $skip: Int, $sortBy: QuestionSortByInput, $categorySlug: String) {
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
      }
    `,
    variables: {
      skip,
      limit: 100,
      categorySlug: "all-code-essentials",
      filters: {
        filterCombineType: "ALL",
        statusFilter: { questionStatuses: [], operator: "IS" }
      },
      sortBy: { sortField: "LAST_SUBMITTED_TIME", sortOrder: "DESCENDING" },
      searchKeyword: ""
    }
  };

  try {
    const resp = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    return resp.ok ? await resp.json() : null;
  } catch (e) {
    console.error("GraphQL fetch exception:", e.message);
    return null;
  }
}

async function findDoneQuestions() {
  const localDone = new Set();
  let skip = 0;

  while (skip <= 3700) {
    const data = await fetchQuestions(skip);
    if (!data) break;

    const questions = data?.data?.problemsetQuestionListV2?.questions || [];
    if (questions.length === 0) break;

    // Add solved questions to set
    questions
      .filter(q => q.status === "SOLVED")
      .forEach(q => localDone.add(parseInt(q.questionFrontendId, 10)));

    // Early exit if last question isn't solved
    const lastQuestion = questions[questions.length - 1];
    if (lastQuestion?.status !== "SOLVED") break;

    const hasMore = data?.data?.problemsetQuestionListV2?.hasMore || false;
    if (!hasMore) break;

    skip += 100;
  }

  return Array.from(localDone);
}

// Progress management
function loadProgress() {
  if (!fs.existsSync(CONFIG.PROGRESS_FILE)) {
    progress = {};
    return;
  }

  try {
    const raw = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
    progress = JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Failed to load progress:", e.message);
    progress = {};
  }
}

function saveProgress() {
  try {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save progress:", e.message);
  }
}

function logSkip(qnum, reason) {
  try {
    fs.appendFileSync(CONFIG.SKIPPED_FILE, `${qnum}: ${reason}\n`);
  } catch (e) {
    console.error("Failed to write skip log:", e.message);
  }
  console.warn(`⚠️ Skipping #${qnum}: ${reason}`);
}

// Extract LeetCode URL and code with caching
async function extractLeetcodeUrlAndCode(qnum) {
  try {
    // Load and cache data file on first use
    if (!cachedDataFile) {
      const filePath = path.join(__dirname, CONFIG.DATA_FILE);
      const dataRaw = await fs.readFile(filePath, 'utf-8');
      cachedDataFile = JSON.parse(dataRaw);
    }

    const problem = cachedDataFile.find(p => p.id === Number(qnum));
    if (!problem) return [null, null];

    const leetcodeUrl = problem.leetcode_url || null;
    const walkccUrl = problem.walkcc_url;
    if (!walkccUrl) return [leetcodeUrl, null];

    // Fetch code from WalkCC
    const resp = await fetch(walkccUrl, { method: 'GET' });
    const javaCode = resp.ok ? await resp.text() : null;
    
    return [leetcodeUrl, javaCode];
  } catch (e) {
    console.error(`Error extracting data for question #${qnum}:`, e.message);
    return [null, null];
  }
}

// LeetCode submission helpers
async function getQuestionId(slug) {
  const query = {
    operationName: "questionData",
    variables: { titleSlug: slug },
    query: `query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) { questionId }
    }`
  };

  try {
    const resp = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(query)
    });

    if (!resp.ok) return null;
    
    const data = await resp.json();
    return data?.data?.question?.questionId || null;
  } catch (e) {
    console.error("Error fetching question ID:", e.message);
    return null;
  }
}

function isCloudflareBlocked(status, respData) {
  const respText = typeof respData === "string" ? respData : JSON.stringify(respData || {});
  const lowerText = respText.toLowerCase();
  
  return [403, 429].includes(status) || 
         lowerText.includes("cloudflare") || 
         lowerText.includes("access denied") || 
         lowerText.includes("bot");
}

async function submitToLeetcode(leetcodeUrl, code) {
  try {
    const slug = leetcodeUrl.replace(/\/+$/, "").split("/").pop();
    const qid = await getQuestionId(slug);
    
    if (!qid) {
      return [400, { error: "Could not fetch questionId" }];
    }

    const url = `https://leetcode.com/problems/${slug}/submit/`;
    const headers = { ...HEADERS, Referer: leetcodeUrl };
    const payload = { lang: "java", question_id: String(qid), typed_code: code };

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const respText = await resp.text();

    if (isCloudflareBlocked(resp.status, respText)) {
      return [resp.status, { error: "Blocked by Cloudflare or rate-limited", raw: respText }];
    }

    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      data = { raw: respText };
    }

    return [resp.status, data];
  } catch (e) {
    console.error("Submission error:", e.message);
    return [500, { error: e.message }];
  }
}

// Random question selection
function getRandomQuestionExcluding(excludeSet) {
  for (let attempt = 0; attempt < CONFIG.MAX_RANDOM_ATTEMPTS; attempt++) {
    const qnum = randInt(1, CONFIG.MAX_Q);
    if (!excludeSet.has(String(qnum))) return qnum;
  }
  return null;
}

// Check if submission was successful
function isSubmissionSuccessful(respData) {
  if (typeof respData !== "object") return false;
  
  const respText = JSON.stringify(respData);
  return respData.submission_id || 
         respData.submissionId || 
         respText.includes("submission_id") || 
         respText.toLowerCase().includes("success");
}

// Main execution
async function main() {
  loadProgress();

  // Ensure progress keys are strings
  progress = Object.fromEntries(
    Object.entries(progress).map(([k, v]) => [String(k), v])
  );

  doneQues = await findDoneQuestions();
  if (!doneQues || doneQues.length === 0) {
    console.error("❌ Failed to retrieve solved questions or none found. Exiting.");
    process.exit(1);
  }
  console.log(`ℹ️ Found ${doneQues.length} solved questions.`);

  // Build exclusion set
  const excludeSet = new Set([
    ...Array.from(premiumQues).map(String),
    ...Array.from(dbQues).map(String),
    ...doneQues.map(String),
    ...Object.entries(progress).filter(([_, v]) => v).map(([k, _]) => k)
  ]);

  console.log(`Excluding ${excludeSet.size} question IDs (premium + db + done + successful progress).`);

  let successCount = 0;
  let totalAttempts = 0;

  while (
    successCount < CONFIG.TARGET_SUCCESS && 
    cloudflare_rejections < CONFIG.MAX_CLOUDFLARE_REJECTIONS && 
    totalAttempts < CONFIG.OVERALL_ATTEMPT_LIMIT
  ) {
    totalAttempts++;

    const qnum = getRandomQuestionExcluding(excludeSet);
    if (!qnum) {
      console.log("No eligible question found after many attempts. Exiting.");
      break;
    }

    const qidStr = String(qnum);
    console.log(`\n🔎 Attempting question #${qnum} (attempt ${totalAttempts})...`);

    const [leetcodeUrl, code] = await extractLeetcodeUrlAndCode(qnum);
    
    // Validate URL and code
    if (!leetcodeUrl) {
      logSkip(qnum, "LeetCode URL not found");
      progress[qidStr] = false;
      saveProgress();
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
      continue;
    }

    if (leetcodeUrl.toLowerCase().includes("premium")) {
      logSkip(qnum, "Premium question");
      progress[qidStr] = false;
      saveProgress();
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
      continue;
    }

    // Submit to LeetCode
    const [status, respData] = await submitToLeetcode(leetcodeUrl, code);

    // Handle Cloudflare/rate limiting
    if (isCloudflareBlocked(status, respData)) {
      cloudflare_rejections++;
      console.warn(`🚫 Cloudflare/rate-limited (count ${cloudflare_rejections}/${CONFIG.MAX_CLOUDFLARE_REJECTIONS})`);
      logSkip(qnum, `Blocked (status ${status})`);
      progress[qidStr] = false;
      saveProgress();
      
      if (cloudflare_rejections >= CONFIG.MAX_CLOUDFLARE_REJECTIONS) {
        console.error("❗ Encountered maximum Cloudflare blockages. Try again later.");
        break;
      }
      
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
      continue;
    }

    // Handle non-200 responses
    if (status !== 200) {
      console.error(`❌ Submission HTTP status: ${status}`);
      logSkip(qnum, `HTTP ${status}`);
      progress[qidStr] = false;
      saveProgress();
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
      continue;
    }

    // Check if submission was successful
    if (isSubmissionSuccessful(respData)) {
      console.log(code);
      console.log(`✅ Successfully submitted #${qnum}!`);
      progress[qidStr] = true;
      saveProgress();
      successCount++;
      excludeSet.add(qidStr);
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
    } else {
      console.error(`❌ Submission failed for #${qnum}`);
      console.error("Response:", JSON.stringify(respData, null, 2));
      
      const reason = typeof respData === "object" 
        ? (respData.error || respData.message || JSON.stringify(respData))
        : String(respData);
      
      logSkip(qnum, `Submission failed: ${reason}`);
      progress[qidStr] = false;
      saveProgress();
      await sleep(CONFIG.DELAY_BETWEEN_ATTEMPTS_MS);
    }
  }

  // Final summary
  console.log("\n======= RUN SUMMARY =======");
  console.log(`Successes: ${successCount}/${CONFIG.TARGET_SUCCESS}`);
  console.log(`Total attempts: ${totalAttempts}`);
  console.log(`Cloudflare rejections: ${cloudflare_rejections}`);
}

// Run the script
main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
