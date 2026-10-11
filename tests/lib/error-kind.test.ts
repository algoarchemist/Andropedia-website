import { describe, expect, it } from "vitest";
import { classifyError, retriesOnReconnect } from "@/lib/error-kind";

describe("classifyError", () => {
  it("calls everything offline when the browser has no connection", () => {
    expect(classifyError(new Error("anything"), false)).toBe("offline");
    expect(classifyError(null, false)).toBe("offline");
  });

  it("recognises a connection that dropped mid-load while the browser still says online", () => {
    expect(classifyError({ name: "ChunkLoadError", message: "x" }, true)).toBe("network");
    expect(classifyError(new Error("Loading chunk 123 failed."), true)).toBe("network");
    expect(classifyError(new TypeError("Failed to fetch"), true)).toBe("network");
    expect(classifyError(new TypeError("Load failed"), true)).toBe("network");
    expect(classifyError(new Error("Failed to fetch dynamically imported module: /_next/x.js"), true)).toBe("network");
  });

  it("treats other errors as a problem on our side", () => {
    expect(classifyError(new Error("Cannot read properties of undefined"), true)).toBe("server");
    expect(classifyError({ message: "An error occurred in the Server Components render.", name: "Error" }, true)).toBe("server");
    expect(classifyError(undefined, true)).toBe("server");
  });
});

describe("retriesOnReconnect", () => {
  it("only retries by itself for connection problems", () => {
    expect(retriesOnReconnect("offline")).toBe(true);
    expect(retriesOnReconnect("network")).toBe(true);
    expect(retriesOnReconnect("server")).toBe(false);
  });
});
