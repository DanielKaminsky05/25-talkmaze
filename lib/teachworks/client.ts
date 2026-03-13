import {
  GetLessonsParams,
  TeachworksLesson,
  TeachworksStudent,
  TeachworksEmployee,
  TeachworksFamily,
  TeachworksCourse,
} from "./types";

const TEACHWORKS_API_URL = "https://api.teachworks.com/v1";

export class TeachworksClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Helper to perform fetch requests with correct headers
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    payload?: unknown,
  ): Promise<T> {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Token token=${this.apiKey}`, // Teachworks format
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (method === "GET" && payload && typeof payload === "object") {
      // Append query parameters for GET requests
      const params = payload as Record<string, string | number>;
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    } else if (payload) {
      //Send JSON body POST/PUT requests
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.error || `Teachworks Error: ${response.status}`,
      );
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
        
        console.log("Response: " + JSON.stringify(response));
        const data = await response.json() as T;

        
        return data;

        
    
  }

  private async putRequest<T>(endpoint: string, body: object){
    const url =  new URL(`${TEACHWORKS_API_URL}${endpoint}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as T;

    return data;
  }

 

  /**
   * Fetch lessons based on filters
   */
  async getLessons(params: GetLessonsParams): Promise<TeachworksLesson[]> {
    return this.request<TeachworksLesson[]>("/lessons", "GET", params);
  }

  /**
   * Fetch all students
   */
  async getStudents(): Promise<TeachworksStudent[]> {
    return this.request<TeachworksStudent[]>("/students", "GET");
  }

  async createStudent(body: object): Promise<TeachworksStudent> {
    return this.postRequest<TeachworksStudent>("/students", body);
  }

  async postFamily(body: object): Promise<TeachworksFamily> {
    return this.postRequest<TeachworksFamily>("/customers/family", body);
  }

  async postStudent(body: object) {
    return this.postRequest("/students", body);
  }

  async updateStudent(
    id: string | number,
    data: object,
  ): Promise<TeachworksStudent> {
    return this.request<TeachworksStudent>(`/students/${id}`, "PUT", {
      student: data,
    });
  }

  /**
   * Fetch all employees (coaches/teachers)
   */
  async getEmployees(): Promise<TeachworksEmployee[]> {
    return this.request<TeachworksEmployee[]>("/employees", "GET");
  }

  async updateEmployee(
    id: string | number,
    data: object,
  ): Promise<TeachworksEmployee> {
    return this.request<TeachworksEmployee>(`/employees/${id}`, "PUT", {
      employee: data,
    });
  }

  async getCourses(): Promise<TeachworksCourse[]> {
    return this.request<TeachworksCourse[]>("/subjects", "GET");
  }

  async createCourse(data: object): Promise<TeachworksCourse> {
    return this.request<TeachworksCourse>("/subjects", "POST", {
      service: data,
    });
  }

  async updateCourse(
    id: string | number,
    data: object,
  ): Promise<TeachworksCourse> {
    return this.request<TeachworksCourse>(`/subjects/${id}`, "PUT", {
      service: data,
    });
  }

  async deleteCourse(id: string | number): Promise<void> {
    return this.request<void>(`/subjects/${id}`, "DELETE");
  }
}
