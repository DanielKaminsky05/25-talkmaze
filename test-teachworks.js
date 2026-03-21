const apiKey = "st_test_PHsFyiBmC3J8QQZFYRLi9w"; // Copied from your .env.local

async function fetchEmployees() {
  const url = "https://api.teachworks.com/v1/employees";

  try {
    console.log("Fetching employees from Teachworks...");
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Token token=${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status}: ${response.statusText}`);
      console.error("Response:", errorText);
      return;
    }

    const data = await response.json();
    console.log("Successfully fetched employees!");
    console.log(`Found ${Array.isArray(data) ? data.length : "unknown amount of"} employees.`);
    
    // Inspect all employees
    if (Array.isArray(data) && data.length > 0) {
      console.log("\nAll Employees Data:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("\nZero employees returned.");
    }
    
  } catch (error) {
    console.error("Network or parsing error:", error);
  }
}

fetchEmployees();
