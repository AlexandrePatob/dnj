export interface ApiGroup {
  id: string;
  groupName: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  mobilePhone: string;
  document: string;
  role: string;
  group: ApiGroup | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResponse extends ApiUser {
  identityToken: string;
}
