export interface Credentials {
  access_key: string;
  secret_key: string;
  session_token: string;
}

export interface EnvResponse {
  domain_id: string;
  project_id: string;
  aws_region: string;
  environment_id: string;
  repository_name?: string;
  repository_user_email?: string;
  user_id: string;
  dz_endpoint: string;
  dz_region: string;
  dz_stage: string;
  enabled_features: string[];
}
