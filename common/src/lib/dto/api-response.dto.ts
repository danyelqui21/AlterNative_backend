export class ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: { total: number; page: number; limit: number };

  constructor(
    data: T,
    message?: string,
    meta?: { total: number; page: number; limit: number }
  ) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }
}
