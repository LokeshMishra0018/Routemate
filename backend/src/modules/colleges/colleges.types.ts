import { ObjectId } from 'mongodb';

export interface CollegeDocument {
  _id: ObjectId;
  name: string;
  domain: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollegeResponseDto {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
}
