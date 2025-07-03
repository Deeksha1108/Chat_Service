import { Observable } from 'rxjs';

export interface FindOneRequest {
  id: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  fullName: string;
}

export interface GetUserNameRequest {
  userId: string;
}

export interface GetUserNameResponse {
  fullName: string;
  username: string;
}

export interface UserServiceClient {
  FindOne(request: FindOneRequest): Observable<UserResponse>;
  GetUserName(request: GetUserNameRequest): Observable<GetUserNameResponse>;
}
