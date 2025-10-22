async function getLeetCodeTokens() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: "leetcode.com" });
    const session = cookies.find(c => c.name === "LEETCODE_SESSION");
    const csrftoken = cookies.find(c => c.name === "csrftoken");

    const tokenBox = document.getElementById("token");
    const status = document.getElementById("status");
    const copyBtn = document.getElementById("copy");

    if (session && csrftoken) {
      const formatted = `
        <div><span class="label">Session:</span> ${session.value}</div>
        <div><span class="label">CSRF Token:</span> ${csrftoken.value}</div>
      `;
      tokenBox.innerHTML = formatted;

      copyBtn.onclick = () => {
        const tokenString = `session=${session.value}; csrftoken=${csrftoken.value}`;
        navigator.clipboard.writeText(tokenString);
        status.textContent = "✅ Tokens copied!";
        setTimeout(() => status.textContent = "", 2000);
      };
    } else {
      tokenBox.textContent = "⚠️ Please log in to leetcode.com first.";
      copyBtn.disabled = true;
    }
  } catch (err) {
    console.error("Error fetching cookies:", err);
    document.getElementById("token").textContent = "Error fetching tokens.";
  }
}

getLeetCodeTokens();
