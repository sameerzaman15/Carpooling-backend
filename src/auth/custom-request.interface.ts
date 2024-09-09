import { Request } from 'express';

export interface CustomRequest extends Request {
  user: {
    username: string;
    fullName: string;
    phoneNo: string;
  }
}