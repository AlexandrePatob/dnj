import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GalleryScreen } from "./gallery-screen";

const emptyPage = { items: [], nextCursor: null };

describe("GalleryScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a retryable error instead of an empty gallery and retries loading", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByRole("heading", { name: "Não foi possível carregar a galeria" })).toBeInTheDocument();
    expect(screen.queryByText("A galeria ainda não tem momentos")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "A galeria ainda não tem momentos" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows contextual empty-state guidance and a relevant next action", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByText("Veja seus registros enquanto novos momentos são publicados.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver meus momentos" }));
    expect(await screen.findByText("Você ainda não registrou momentos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver galeria DNJ" })).toBeInTheDocument();
  });

  it("communicates publication and moderation status as text for displayed moments", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: "moment-1", placeName: "Espaço Juventude", publicationStatus: "public", moderationStatus: "pending" }], nextCursor: null }) } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByText(/Em moderação/)).toBeInTheDocument();
  });
});
