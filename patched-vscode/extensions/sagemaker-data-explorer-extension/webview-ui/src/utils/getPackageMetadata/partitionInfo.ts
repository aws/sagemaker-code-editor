/**
 * URL path for Lotus Metadata API
 */
export const LOTUS_METADATA_PATH = '/metadata';

export enum Partition {
  AWS = 'aws',
}

const PARTITION_INFO: Record<Partition, string> = {
  [Partition.AWS]: 'public.lotus.awt.aws.a2z.com',
};

export function getLotusHost(partition: string): string {
  return PARTITION_INFO[partition as Partition];
}
