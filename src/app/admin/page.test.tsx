import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authStorage } from "@/lib/auth-storage";
import AdminPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/admin/admin-dashboard", () => ({ AdminDashboard: ({ session }: { session: { name: string } }) => <main>Central de {session.name}</main> }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("AdminPage session restore", () => {
  beforeEach(() => { replace.mockReset(); authStorage.clearCredentials(); vi.stubGlobal("fetch", vi.fn()); });

  it("restores an ADMIN session straight from the external API", async () => {
    authStorage.setCredentials({ accessToken: "admin-access", refreshToken: "admin-refresh" });
    vi.mocked(fetch).mockResolvedValueOnce(json({ user: { id: "1", email: "admin@dnj.test", name: "Admin DNJ", role: "ADMIN" }, onboardingRequired: false }));
    render(<AdminPage />);
    expect(await screen.findByText("Central de Admin DNJ")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("https://api.dnj.test/v2/auth/session", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-access" }) }));
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the login and drops credentials when the role is not ADMIN", async () => {
    authStorage.setCredentials({ accessToken: "user-access", refreshToken: "user-refresh" });
    vi.mocked(fetch).mockResolvedValueOnce(json({ user: { id: "1", email: "ana@dnj.test", name: "Ana", role: "DEFAULT" }, onboardingRequired: false }));
    render(<AdminPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(authStorage.getAccessToken()).toBeNull();
  });

  it("redirects to the login when the token is rejected and the refresh fails", async () => {
    authStorage.setCredentials({ accessToken: "expired", refreshToken: "revoked" });
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ code: "UNAUTHENTICATED", message: "Autenticação necessária." }, 401))
      .mockResolvedValueOnce(json({ code: "REFRESH_TOKEN_REUSE", message: "Reuso." }, 401));
    render(<AdminPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(authStorage.getRefreshToken()).toBeNull();
  });
});
