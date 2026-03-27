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
    pageNum?: number,
  ): Promise<T> {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (method === "GET") {
      if (payload && typeof payload === "object") {
        const params = payload as Record<string, string | number>;
        Object.keys(params).forEach((key) => {
          if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, String(params[key]));
          }
        });
      }

      if (pageNum !== undefined) {
        url.searchParams.append("page", String(pageNum));
      }
    } else if (payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const text = await response.text();
      console.error("Teachworks request failed", {
        endpoint,
        method,
        url: url.toString(),
        status: response.status,
        body: text,
      });
      throw new Error(`Teachworks Error: ${response.status} - ${text}`);
    }

    return response.json();
  }

  private async postRequest<T>(endpoint: string, body: object) {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);

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

  private async putRequest<T>(endpoint: string, body: object) {
    const url = new URL(`${TEACHWORKS_API_URL}${endpoint}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Response: " + JSON.stringify(response));
    const data = (await response.json()) as T;

    console.log("Data: " + data);
    return data;
  }

  /**
   * Fetch lessons based on filters
   */
  async getLessons(params: GetLessonsParams): Promise<TeachworksLesson[]> {
    return this.request<TeachworksLesson[]>("/lessons", "GET", params);
  }

  async getStudents(): Promise<TeachworksStudent[]> {
    let students: TeachworksStudent[] = [];
    let pageNum = 1;

    while (true) {
      const resp = await this.request<TeachworksStudent[]>(
        "/students",
        "GET",
        undefined,
        pageNum
      );

      if (!resp || resp.length === 0) break;

      students = students.concat(resp);
      pageNum++;
    }

    return students;
  }

  /**
   * Fetch a single student by ID
   */
  async getStudent(id: string | number): Promise<TeachworksStudent> {
    return this.request<TeachworksStudent>(`/students/${id}`, "GET");
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

  async createEmployee(body: object): Promise<TeachworksEmployee> {
    return this.postRequest<TeachworksEmployee>("/employees", {
      employee: body
    });
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

  /**
   * Create a payment record for a customer
   */
  async createPayment(data: {
    customer_id: string | number;
    date: string;
    amount: string | number;
    description?: string;
    payment_method:
    | "Cash"
    | "Check"
    | "Credit Card"
    | "Debit Card"
    | "Bank Transfer"
    | "PayPal"
    | "Other";
    stripe_transaction_id?: string;
  }): Promise<unknown> {
    return this.postRequest("/payments", {
      payment: data,
    });
  }
}
