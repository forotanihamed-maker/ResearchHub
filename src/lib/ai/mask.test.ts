import { describe, expect, it } from "vitest";
import { maskForAI, maskPagePath } from "./mask";

describe("AI masking", () => {
  it("removes email, phone, token, file path, query URL and IP", () => {
    const input = "email hamed@example.com phone 09121234567 token=abc12345678901234567890 C:\\Users\\hamed\\secret.txt https://example.com/a?token=secret 192.168.1.20";
    const output = maskForAI(input);
    expect(output).not.toContain("hamed@example.com");
    expect(output).not.toContain("09121234567");
    expect(output).not.toContain("abc12345678901234567890");
    expect(output).not.toContain("C:\\Users\\hamed\\secret.txt");
    expect(output).not.toContain("token=secret");
    expect(output).not.toContain("192.168.1.20");
  });

  it("removes query and masks sensitive content from page paths", () => {
    expect(maskPagePath("/invite/abc?token=secret")).not.toContain("token=secret");
  });
});
