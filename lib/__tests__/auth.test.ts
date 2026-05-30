import { describe, expect, it } from "vitest";
import { isAuthorized } from "../auth";

function basic(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("isAuthorized", () => {
  it("accepte les identifiants Basic Auth corrects", () => {
    expect(isAuthorized(basic("admin", "secret"), "admin", "secret")).toBe(true);
  });

  it("refuse les identifiants absents ou incorrects", () => {
    expect(isAuthorized(null, "admin", "secret")).toBe(false);
    expect(isAuthorized(basic("admin", "wrong"), "admin", "secret")).toBe(false);
  });

  it("refuse une configuration incomplète", () => {
    expect(isAuthorized(basic("admin", "secret"), "", "secret")).toBe(false);
    expect(isAuthorized(basic("admin", "secret"), "admin", "")).toBe(false);
  });
});
