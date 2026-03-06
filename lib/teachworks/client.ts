<<<<<<< HEAD
import { GetLessonsParams, TeachworksLesson, TeachworksStudent, TeachworksEmployee, TeachworksFamily } from "./types";
=======
import { GetLessonsParams, TeachworksLesson, TeachworksStudent, TeachworksEmployee, StudentUpdateInput} from "./types";
>>>>>>> 49574b3885bb5073fa4edad60186198eb9459dc8

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

  private async postRequest<T>(endpoint: string, body: object){
       const url =  new URL(`${TEACHWORKS_API_URL}${endpoint}`);
        
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Token token=${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                body
            )
        })

        const data = (await response.json()) as T;

        return data;

        
    
  }

  private async putRequest(endpoint: string, body: object){
    const url =  new URL(`${TEACHWORKS_API_URL}${endpoint}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        
      },
      body: JSON.stringify(body)
    })
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

  async postFamily(body: object): Promise<TeachworksFamily>{
    return this.postRequest<TeachworksFamily>("/customers/family",body);
  }

  async postStudent(body: object){
    return this.postRequest("students", body);
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
