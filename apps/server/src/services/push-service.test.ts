import { beforeEach, describe, expect, test } from "bun:test";
import {
  mockDeleteSubscriptionByEndpoint,
  mockDeleteUserSubscriptions,
  mockFindPushSubscription,
  mockInsertPushSubscription,
  mockUpdatePushSubscriptionKeys,
  resetAllMocks,
} from "../../tests/helpers/module-mocks";

import * as pushService from "./push-service";

beforeEach(() => {
  resetAllMocks();
});

const sub = {
  endpoint: "https://push.example.com/sub/1",
  keys: { p256dh: "key1", auth: "key2" },
};

describe("subscribe", () => {
  test("inserts new subscription", async () => {
    const result = await pushService.subscribe({} as any, 1, sub);

    expect(result).toEqual({ success: true, subscriptionId: 1 });
    expect(mockInsertPushSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 1, endpoint: sub.endpoint, p256dh: "key1", auth: "key2" }),
    );
  });

  test("updates keys when subscription already exists", async () => {
    mockFindPushSubscription.mockResolvedValueOnce({ id: 5 });

    const result = await pushService.subscribe({} as any, 1, sub);

    expect(result).toEqual({ success: true, subscriptionId: 5 });
    expect(mockUpdatePushSubscriptionKeys).toHaveBeenCalledWith(expect.anything(), 5, sub.keys);
    expect(mockInsertPushSubscription).not.toHaveBeenCalled();
  });
});

describe("unsubscribe", () => {
  test("deletes all user subscriptions", async () => {
    const result = await pushService.unsubscribe({} as any, 1);
    expect(result).toEqual({ success: true });
    expect(mockDeleteUserSubscriptions).toHaveBeenCalledWith(expect.anything(), 1);
  });
});

describe("unsubscribeEndpoint", () => {
  test("deletes subscription by endpoint", async () => {
    const result = await pushService.unsubscribeEndpoint(
      {} as any,
      1,
      "https://push.example.com/sub/1",
    );
    expect(result).toEqual({ success: true });
    expect(mockDeleteSubscriptionByEndpoint).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "https://push.example.com/sub/1",
    );
  });
});
