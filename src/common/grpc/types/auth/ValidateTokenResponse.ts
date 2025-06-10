// Original file: src/common/grpc/proto/auth.proto

import type { Long } from '@grpc/proto-loader';

export interface ValidateTokenResponse {
  'userId'?: (string);
  'email'?: (string);
  'role'?: (string);
  'issuedAt'?: (number | string | Long);
  'expiresAt'?: (number | string | Long);
}

export interface ValidateTokenResponse__Output {
  'userId': (string);
  'email': (string);
  'role': (string);
  'issuedAt': (string);
  'expiresAt': (string);
}
