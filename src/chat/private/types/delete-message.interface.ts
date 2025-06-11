export interface DeletedMessagePayload {
  _id: string;
  receiver: string;
  deletedAt: Date;
}

export function isDeletedMessagePayload(
  obj: any,
): obj is DeletedMessagePayload {
  return (
    obj &&
    typeof obj === 'object' &&
    '_id' in obj &&
    'receiver' in obj &&
    'deletedAt' in obj
  );
}
