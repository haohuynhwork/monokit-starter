import { createIORedisClient, RedisConnection } from "bullmq";
import { Valkey } from "iovalkey";

// BullMQ builds every connection (queue, worker, its blocking one) through
// this factory, with iovalkey (Valkey's maintained ioredis fork) instead of
// ioredis. BullMQ still owns and closes them; iovalkey takes the same
// options, so the queue's enableOfflineQueue and BullMQ's own defaults
// (e.g. maxRetriesPerRequest: null for workers) apply unchanged.
export function useValkeyClient(): void {
  RedisConnection.clientFactory = (options) =>
    createIORedisClient(new Valkey(options));
}
