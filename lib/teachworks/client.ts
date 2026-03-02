import { GetLessonsParams, TeachworksLesson, TeachworksStudent, TeachworksEmployee, StudentUpdateInput} from "./types";

const TEACHWORKS_API_URL = "https://api.teachworks.com/v1";

export class TeachworksClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Helper to perform fetch requests with correct headers
   */
  private async request<T>(endpoint: string, method: "GET" | "POST" | "PUT" = "GET", payload?: unknown): Promise<T> {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);
    
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Token token=${this.apiKey}`, // Teachworks format
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    };

    if(method === "GET" && payload && typeof payload === "object"){
      // Append query parameters for GET requests
      const params = payload as Record<string, string | number>;
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }else if(payload){
      //Send JSON body POST/PUT requests
      options.body = JSON.stringify(payload)
    }

    const response = await fetch(url.toString(), options);

    if(!response.ok){
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Teachworks Error: ${response.status}');
    }

    return response.json();
  }

 private async postRequest(endpoint: string, body: unknown) {
  const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);

  console.log("Inside Post Request", url.toString());
  console.log("Request body:", JSON.stringify(body));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token token=${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text(); // 👈 read the body once
  console.log("Teachworks status:", res.status);
  console.log("Teachworks response body:", text);

  if (!res.ok) {
    throw new Error(`Teachworks error ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

  /**
   * Fetch lessons based on filters
   */
  async getLessons(params: GetLessonsParams): Promise<TeachworksLesson[]> {
    return this.request<TeachworksLesson[]>("/lessons", "GET",params);
  }

  /**
   * Fetch all students
   */
  async getStudents(): Promise<TeachworksStudent[]> {
    return this.request<TeachworksStudent[]>("/students", "GET");
  }

  async postFamily(body: object){
    return this.postRequest("/customers/family",body);
  }
  /**
   * Fetch all employees (coaches/teachers)
   */
  async getEmployees(): Promise<TeachworksEmployee[]> {
    return this.request<TeachworksEmployee[]>("/employees", "GET");
  }

  // Add this to @/lib/teachworks/client.ts
  async updateStudent(id: string | number, data: StudentUpdateInput) : Promise<TeachworksStudent> {
    // Teachworks requires the 'student' wrapper
    return this.request<TeachworksStudent>(`/students/${id}`, "PUT", { student: data });
    /*const response = await fetch(`${this.baseUrl}/students/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Token token=${this.apiKey}`, // Correct Teachworks format
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ student: data }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || "Failed to update student");
    }
    return response.json();*/
  }
}
