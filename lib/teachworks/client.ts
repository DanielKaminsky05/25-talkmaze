import { GetLessonsParams, TeachworksLesson, TeachworksStudent, TeachworksEmployee } from "./types";

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

  /**
   * Fetch all employees (coaches/teachers)
   */
  async getEmployees(): Promise<TeachworksEmployee[]> {
    return this.request<TeachworksEmployee[]>("/employees");
  }
}
