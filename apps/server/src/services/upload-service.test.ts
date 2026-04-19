import { describe, test, expect, beforeEach } from "bun:test";
import {
  resetAllMocks,
  mockGetPresignedUploadUrl,
} from "../../tests/helpers/module-mocks";
import { BadRequestError } from "../errors";

import * as uploadService from "./upload-service";

beforeEach(() => {
  resetAllMocks();
});

describe("getPresignedUrl", () => {
  test("returns presigned URL for valid content type", async () => {
    const result = await uploadService.getPresignedUrl(1, {
      filename: "photo.jpg",
      contentType: "image/jpeg",
      size: 1024,
    });

    expect(result.uploadUrl).toBe("https://r2.dev/presigned");
    expect(result.publicUrl).toContain("https://test.r2.dev/");
    expect(result.key).toContain("uploads/1/");
    expect(result.contentDisposition).toBe("inline");
  });

  test("throws BadRequestError for disallowed content type", async () => {
    await expect(
      uploadService.getPresignedUrl(1, {
        filename: "script.exe",
        contentType: "application/x-msdownload",
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("throws BadRequestError when file exceeds max size", async () => {
    await expect(
      uploadService.getPresignedUrl(1, {
        filename: "huge.jpg",
        contentType: "image/jpeg",
        size: 11 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("sanitizes filename", async () => {
    await uploadService.getPresignedUrl(1, {
      filename: "my file (1).jpg",
      contentType: "image/jpeg",
      size: 1024,
    });

    const key = mockGetPresignedUploadUrl.mock.calls[0][0] as string;
    expect(key).not.toContain(" ");
    expect(key).not.toContain("(");
    expect(key).toContain("my_file__1_.jpg");
  });
});
