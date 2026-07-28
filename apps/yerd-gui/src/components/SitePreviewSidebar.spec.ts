import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openInBrowser = vi.fn();
const openPath = vi.fn();
const openInTerminal = vi.fn();
const pickDirectory = vi.fn();
const showDumpsWindow = vi.fn();
vi.mock("@/ipc/client", () => ({
  openInBrowser: (...args: unknown[]) => openInBrowser(...args),
  openPath: (...args: unknown[]) => openPath(...args),
  openInTerminal: (...args: unknown[]) => openInTerminal(...args),
  pickDirectory: (...args: unknown[]) => pickDirectory(...args),
  showDumpsWindow: (...args: unknown[]) => showDumpsWindow(...args),
}));

import type { SiteEntry, StatusReport } from "@/ipc/types";
import SitePreviewSidebar from "./SitePreviewSidebar.vue";

function site(overrides: Partial<SiteEntry> = {}): SiteEntry {
  return {
    name: "blog",
    document_root: "/srv/blog",
    php: "8.3",
    secure: true,
    kind: "linked",
    is_laravel: true,
    uses_front_controller: true,
    ...overrides,
  };
}

function report(): StatusReport {
  return {
    tld: "test",
    resolver_installed: true,
    http: { requested: 80, bound: 80, fell_back: false },
    https: { requested: 443, bound: 443, fell_back: false },
  } as StatusReport;
}

function mountSidebar(s: SiteEntry = site()) {
  return mount(SitePreviewSidebar, {
    props: { site: s, open: true, report: report(), tld: "test", phpVersions: ["8.3", "8.4"] },
    global: { stubs: { teleport: true } },
  });
}

describe("SitePreviewSidebar", () => {
  beforeEach(() => {
    openInBrowser.mockReset();
    openPath.mockReset();
    openInTerminal.mockReset();
    pickDirectory.mockReset();
    showDumpsWindow.mockReset();
  });

  it("renders site information and opens the site", async () => {
    const wrapper = mountSidebar();

    expect(wrapper.text()).toContain("blog.test");
    expect(wrapper.text()).toContain("/srv/blog");
    expect(wrapper.text()).toContain("Laravel");
    expect(wrapper.text()).toContain("8.3");
    expect(wrapper.text()).not.toContain("Tinker");
    expect(wrapper.text()).toContain("Terminal");
    expect(wrapper.text()).toContain("Logs");
    expect(wrapper.text()).not.toContain("Edit site");

    const openButton = wrapper.findAll("button").find((button) => button.text() === "Open site");
    if (!openButton) throw new Error("Open site button not rendered");
    await openButton.trigger("click");

    expect(openInBrowser).toHaveBeenCalledWith("https://blog.test");

  });

  it("closes when the backdrop is clicked", async () => {
    const wrapper = mountSidebar();

    await wrapper.get(".site-sidebar-backdrop").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("closes on Escape", async () => {
    const wrapper = mountSidebar();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("provides General controls and keeps application details under Information", async () => {
    const wrapper = mountSidebar();

    const php = wrapper.get('[aria-label="Site PHP version"]');
    await php.setValue("8.4");
    expect(wrapper.emitted("changePhp")).toEqual([[site(), "8.4"]]);

    const webRoot = wrapper.get('[aria-label="Site web root"]');
    await webRoot.setValue("public");
    const saveWebRoot = wrapper.findAll("button").find((button) => button.text() === "Save");
    if (!saveWebRoot) throw new Error("Save web root button not rendered");
    await saveWebRoot.trigger("click");
    expect(wrapper.emitted("changeWebRoot")).toEqual([[site(), "public"]]);

    const frontController = wrapper.get('[aria-label="Route through front controller"]');
    await frontController.trigger("click");
    expect(wrapper.emitted("toggleFrontController")).toEqual([[site(), false]]);

    const https = wrapper.get('[aria-label="HTTPS"]');
    await https.trigger("click");
    expect(wrapper.emitted("toggleSecure")).toEqual([[site()]]);

    const information = wrapper.findAll('[role="tab"]').find((tab) => tab.text() === "Information");
    if (!information) throw new Error("Information tab not rendered");
    await information.trigger("click");

    expect(wrapper.text()).toContain("Application");
    expect(wrapper.text()).not.toContain("PHP version");
  });
});
