(function () {
  "use strict";

  const checks = [
    {
      label: "Prompt model global exists",
      run: () => Boolean(window.PromptShelfModel),
    },
    {
      label: "Storage adapter global exists",
      run: () => Boolean(window.PromptShelfStorage),
    },
    {
      label: "Smoke test uses isolated localStorage",
      run: () => window.__promptShelfSmokeStorage === true,
    },
    {
      label: "Search input exists",
      run: () => Boolean(document.getElementById("searchInput")),
    },
    {
      label: "Prompt list container exists",
      run: () => Boolean(document.getElementById("libraryList")),
    },
    {
      label: "Backup JSON control exists",
      run: () => {
        const button = document.getElementById("exportButton");
        return Boolean(button && button.textContent.includes("Backup JSON"));
      },
    },
    {
      label: "Restore JSON control exists",
      run: () => {
        const button = document.getElementById("importButton");
        return Boolean(button && button.textContent.includes("Restore JSON"));
      },
    },
    {
      label: "App initialized the prompt list",
      run: () => {
        const list = document.getElementById("libraryList");
        return Boolean(list && list.children.length > 0);
      },
    },
  ];

  function renderResult(check, passed, error) {
    const results = document.getElementById("smokeResults");
    const item = document.createElement("li");
    item.className = passed ? "smoke-pass" : "smoke-fail";
    item.textContent = passed
      ? "PASS: " + check.label
      : "FAIL: " + check.label + (error ? " (" + error.message + ")" : "");
    results.append(item);
  }

  function runSmokeTest() {
    const status = document.getElementById("smokeStatus");
    let failures = 0;

    checks.forEach((check) => {
      try {
        const passed = check.run();
        if (!passed) {
          failures += 1;
        }
        renderResult(check, passed);
      } catch (error) {
        failures += 1;
        renderResult(check, false, error);
      }
    });

    const passed = failures === 0;
    document.body.dataset.smokeStatus = passed ? "pass" : "fail";
    status.className = passed ? "smoke-pass" : "smoke-fail";
    status.textContent = passed
      ? "DOM smoke test passed."
      : "DOM smoke test failed with " + failures + " issue" + (failures === 1 ? "." : "s.");

    if (passed) {
      console.info("Prompt Shelf DOM smoke test passed.");
    } else {
      console.error("Prompt Shelf DOM smoke test failed.");
    }
  }

  window.addEventListener("load", () => {
    window.setTimeout(runSmokeTest, 0);
  });
})();
