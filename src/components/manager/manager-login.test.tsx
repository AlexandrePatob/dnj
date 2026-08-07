import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManagerLogin } from "./manager-login";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("ManagerLogin", () => {
  beforeEach(() => { replace.mockReset(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 }))); });
  it("submits e-mail and password to the manager session API", async () => {
    const user = userEvent.setup(); const fetchMock = vi.mocked(fetch);
    render(<ManagerLogin />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/manager/session", expect.objectContaining({ cache: "no-store" })));
    await user.type(screen.getByLabelText("E-mail"), "gestor@dnj.test");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    await user.click(screen.getByRole("button", { name: "Entrar na operação" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/manager/session", expect.objectContaining({ method: "POST" })));
    expect(replace).toHaveBeenCalledWith("/manager");
  });
});
