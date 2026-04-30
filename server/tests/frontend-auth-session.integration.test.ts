import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

class InMemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const localStorageMock = new InMemoryStorage();
const sessionStorageMock = new InMemoryStorage();

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  (globalThis as unknown as { localStorage: StorageLike }).localStorage = localStorageMock;
  (globalThis as unknown as { sessionStorage: StorageLike }).sessionStorage = sessionStorageMock;
});

describe("Frontend auth session storage hardening", () => {
  it("does not persist bearer token in browser storage when bearer mode is disabled", async () => {
    const module = await import("../../src/app/utils/authSession.ts");

    module.saveAuthSession({
      token: "example-bearer-token",
      user: {
        id: "citizen-1",
        fullName: "Citizen One",
        phoneNumber: "09171234567",
        role: "CITIZEN",
        isPhoneVerified: true,
        isVerified: false,
        verificationStatus: null,
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
      },
    });

    const reloaded = module.getAuthSession();

    assert.ok(reloaded?.user);
    assert.equal(reloaded?.token, undefined);
    assert.equal(sessionStorageMock.getItem("tugon.auth.session.token"), null);
  });
});
