import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GalleryScreen } from "./gallery-screen";

vi.mock("@/features/moments/moment-composer", () => ({
  MomentComposer: () => <section aria-label="Compartilhar momento">Câmera aberta</section>,
}));

const emptyPage = { items: [], nextCursor: null };

describe("GalleryScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a retryable error when Moments cannot be loaded", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByRole("heading", { name: "Não foi possível carregar Momentos" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Ainda não há momentos" })).toBeInTheDocument();
  });

  it("uses compact passport-like grids for personal and group moments", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: "mine-1", placeName: "Capela", imageUrl: "/mock/moments/dnj-feed-01.png" }], nextCursor: null }) } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response);

    render(<GalleryScreen animDir="up" group="Grupo Esperança" />);

    expect(await screen.findByRole("button", { name: "Grupo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Meus" }));
    expect(await screen.findByAltText("Momento em Capela")).toHaveClass("aspect-[3/4]");
    expect(document.querySelector(".passport-grid")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Grupo" }));
    expect(await screen.findByRole("heading", { name: "Seu grupo ainda não publicou momentos" })).toBeInTheDocument();
  });

  it("keeps the public feed focused on likes and sharing", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: "moment-share", placeName: "Palco", imageUrl: "/mock/moments/dnj-feed-01.png", publicationStatus: "public", moderationStatus: "approved", likesCount: 2, likedByCurrentUser: false }], nextCursor: null }) } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["photo"], { type: "image/png" }) } as Response);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = createElement(tagName, options);
      if (tagName === "img") {
        Object.defineProperties(element, { naturalWidth: { value: 100 }, naturalHeight: { value: 140 } });
        window.setTimeout(() => element.dispatchEvent(new Event("load")), 0);
      }
      return element;
    }) as typeof document.createElement);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["watermarked"], { type: "image/png" })));

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByRole("button", { name: "Compartilhar momento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /coment/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Compartilhar momento" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "DNJ 2K26", files: expect.any(Array) })));
  });

  it("opens the camera from the add button for an active Moment challenge", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => emptyPage } as Response)
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ momentChallenge: { id: "challenge-1" } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ participation: { id: "participation-1", canShareMoment: true } }) } as Response);

    render(<GalleryScreen animDir="up" />);
    await screen.findByRole("heading", { name: "Ainda não há momentos" });
    await user.click(screen.getByRole("button", { name: "Adicionar momento" }));

    expect(await screen.findByLabelText("Compartilhar momento")).toHaveTextContent("Câmera aberta");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/moment-challenges/challenge-1/participations",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
