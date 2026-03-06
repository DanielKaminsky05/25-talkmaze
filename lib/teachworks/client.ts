import { GetLessonsParams, TeachworksLesson, TeachworksStudent, TeachworksEmployee, TeachworksFamily } from "./types";

const TEACHWORKS_API_URL = "https://api.teachworks.com/v1";

export class TeachworksClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Helper to perform fetch requests with correct headers
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);
    
    // Append query parameters
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, String(params[key]));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Token token=${this.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Teachworks API Error: ${response.status} ${response.statusText}`);
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
    return this.request<TeachworksLesson[]>("/lessons", params);
  }

  /**
   * Fetch all students
   */
  async getStudents(): Promise<TeachworksStudent[]> {
    return this.request<TeachworksStudent[]>("/students");
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
    return this.request<TeachworksEmployee[]>("/employees");
  }
}
