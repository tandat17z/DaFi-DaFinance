// <tdz-account> — sign-in / account menu for every tandat17z site, backed by Cloudflare Access.
// Self-contained (no dependencies, no build); each site keeps its own copy of this file.
// Canonical copy: hub/public/account.js — change it there, then copy it to the other sites.
//
// Attributes:
//   lang        "vi" (default) | "en"
//   login-url   where "Sign in" points (an Access-protected path, e.g. "/login/"). Without it,
//               nothing is shown when nobody is signed in (sites fully behind Access).
//   admin-url   optional endpoint returning 200 for admins / 403 otherwise, to show admin rights.
//   me-url      optional fallback returning { email } when Access identity is unavailable (dev).
//   account-url optional central-API account endpoint (/v1/<app>/account) of a shared app: shows
//               where the user's data is stored and lets a user without server storage ask the
//               owner for it (POST <account-url>/request). Also an email fallback, like me-url.
//
// Events on window: listens to "tdz-account:refresh" (re-read the account, e.g. after the page sent
// a request itself) and fires "tdz-account:change" after a request sent from the menu.
//
// Identity comes from /cdn-cgi/access/get-identity on the current host; sign-out uses
// /cdn-cgi/access/logout. No tokens are read or stored here.
(() => {
  if (customElements.get("tdz-account")) return;

  const TEXT = {
    vi: { signIn: "Đăng nhập", signOut: "Đăng xuất", account: "Tài khoản", via: "Đăng nhập qua", admin: "Quyền quản trị", yes: "Có", no: "Không",
      storage: "Lưu dữ liệu", cloud: "Server", local: "Trình duyệt này", readonly: "Trình duyệt (server chỉ xem)",
      request: "Yêu cầu lưu trên server", pending: "Đã gửi yêu cầu, đang chờ duyệt.", rejected: "Yêu cầu trước chưa được chấp nhận.",
      message: "Lời nhắn (không bắt buộc)", send: "Gửi", cancel: "Huỷ", cooldown: "Gửi lại được sau một ngày.", failed: "Không gửi được, thử lại sau." },
    en: { signIn: "Sign in", signOut: "Sign out", account: "Account", via: "Signed in with", admin: "Admin rights", yes: "Yes", no: "No",
      storage: "Data stored", cloud: "Server", local: "This browser", readonly: "Browser (server read-only)",
      request: "Ask for server storage", pending: "Request sent, waiting for approval.", rejected: "Your last request was not approved.",
      message: "Message (optional)", send: "Send", cancel: "Cancel", cooldown: "You can ask again after a day.", failed: "Could not send, try again later." },
  };

  const initials = (name, email) => {
    const words = (name || email).split(/[\s@._-]+/).filter(Boolean);
    return (name ? [words[0], words.at(-1)] : [words[0]]).map((w) => (w ? w[0] : "")).join("").toUpperCase();
  };

  const getJson = async (url) => {
    try {
      const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
      return { status: res.status, body: res.ok ? await res.json() : null };
    } catch {
      return { status: 0, body: null };
    }
  };

  const postJson = async (url, body) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch {
      return { status: 0, body: null };
    }
  };

  // Colors follow each site's CSS variables when present (hub/DaFinance/web names, then DaTraaa's
  // --ink/--border), with the shared dark palette as the last fallback.
  const CSS = `
    :host { position: relative; display: inline-flex; font: 500 13px/1.4 var(--font-sans, var(--sans, ui-sans-serif, system-ui, sans-serif)); color: var(--fg, var(--ink, #e7e9ec)); }
    button, a { font: inherit; color: inherit; }
    .login { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-strong, var(--border, #2d3239)); text-decoration: none; }
    .login:hover, .logout:hover { background: var(--surface-2, #14171b); }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); background: var(--surface-2, #14171b); color: var(--accent, #7ee0c3);
      font: 600 12px/1 var(--font-mono, var(--mono, ui-monospace, monospace)); }
    .avatar.warn { border-color: #f2c46d99; color: #f2c46d; }
    .avatar:focus-visible, .login:focus-visible, .logout:focus-visible { outline: 2px solid var(--accent, #7ee0c3); outline-offset: 2px; }
    .panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: 272px; padding: 16px; border-radius: 12px;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); background: var(--surface, #0f1114); box-shadow: 0 16px 40px #0008; }
    .who { display: flex; gap: 12px; align-items: center; }
    .who .avatar { width: 40px; height: 40px; cursor: default; font-size: 14px; }
    .name { font-weight: 600; }
    .email { color: var(--muted, #9ba2ac); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who > div { min-width: 0; }
    dl { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid var(--border, #1f2328); font-size: 12px; display: grid; gap: 6px; }
    dl div { display: flex; justify-content: space-between; gap: 12px; }
    dt { color: var(--subtle, var(--muted, #8a919c)); } dd { margin: 0; color: var(--muted, #9ba2ac); }
    dd.yes { color: var(--accent, #7ee0c3); } dd.no { color: #f2c46d; }
    .logout { display: flex; align-items: center; justify-content: center; height: 36px; margin-top: 14px; border-radius: 8px;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); text-decoration: none; }
    .storage { display: grid; gap: 8px; margin-top: 12px; font-size: 12px; }
    .storage:empty { display: none; }
    .storage p { margin: 0; color: var(--muted, #9ba2ac); }
    .storage p.err { color: #f2c46d; }
    .storage textarea { box-sizing: border-box; width: 100%; min-height: 56px; padding: 6px 8px; border-radius: 8px; resize: vertical;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); background: var(--bg, #0b0c0e); color: inherit; font: inherit; }
    .actions { display: flex; gap: 8px; }
    .btn { flex: 1; height: 32px; padding: 0 10px; border-radius: 8px; cursor: pointer; background: transparent;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); }
    .btn:hover { background: var(--surface-2, #14171b); }
    .btn.primary { border-color: transparent; background: var(--accent, #7ee0c3); color: var(--accent-fg, #04110d); }
    .btn.primary:hover { opacity: .9; background: var(--accent, #7ee0c3); }
    .btn:disabled { opacity: .5; cursor: default; }
    .btn:focus-visible, .storage textarea:focus-visible { outline: 2px solid var(--accent, #7ee0c3); outline-offset: 1px; }
    [hidden] { display: none !important; }
  `;

  class TdzAccount extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: "open" }).innerHTML = `<style>${CSS}</style>`;
      this.t = TEXT[this.getAttribute("lang") === "en" ? "en" : "vi"];
      this.load();
    }

    async load() {
      const identity = await getJson("/cdn-cgi/access/get-identity");
      let email = identity.body?.email;
      let name = identity.body?.name;
      const accountUrl = this.getAttribute("account-url");
      if (accountUrl) {
        this.account = (await getJson(accountUrl)).body;
        email = email || this.account?.email;
      }
      const meUrl = this.getAttribute("me-url");
      if (!email && meUrl) {
        const me = await getJson(meUrl);
        email = me.body?.email;
      }
      if (!email) return this.renderSignedOut();
      if (accountUrl) {
        this.onRefresh = async () => {
          this.account = (await getJson(accountUrl)).body ?? this.account;
          this.renderStorage();
        };
        window.addEventListener("tdz-account:refresh", this.onRefresh);
      }

      const adminUrl = this.getAttribute("admin-url");
      const admin = adminUrl ? (await getJson(adminUrl)).status : null;
      this.renderSignedIn({ email, name, admin: admin === 200 ? true : admin === 403 ? false : null });
    }

    renderSignedOut() {
      const url = this.getAttribute("login-url");
      if (!url) return;
      const a = document.createElement("a");
      a.className = "login";
      a.textContent = this.t.signIn;
      // Come back to the current page after signing in.
      a.href = `${url}${url.includes("?") ? "&" : "?"}return=${encodeURIComponent(location.pathname + location.search)}`;
      this.shadowRoot.append(a);
    }

    renderSignedIn({ email, name, admin }) {
      const t = this.t;
      const root = this.shadowRoot;
      const letters = initials(name, email);

      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar${admin === false ? " warn" : ""}`;
      button.textContent = letters;
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", `${t.account}: ${email}`);

      const panel = document.createElement("div");
      panel.className = "panel";
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", t.account);

      const who = document.createElement("div");
      who.className = "who";
      const big = document.createElement("span");
      big.className = "avatar";
      big.setAttribute("aria-hidden", "true");
      big.textContent = letters;
      const info = document.createElement("div");
      if (name) info.append(Object.assign(document.createElement("div"), { className: "name", textContent: name }));
      info.append(Object.assign(document.createElement("div"), { className: "email", textContent: email, title: email }));
      who.append(big, info);

      const dl = document.createElement("dl");
      const row = (k, v, cls = "") => {
        const d = document.createElement("div");
        d.append(Object.assign(document.createElement("dt"), { textContent: k }), Object.assign(document.createElement("dd"), { textContent: v, className: cls }));
        dl.append(d);
      };
      row(t.via, "Cloudflare Access");
      if (admin !== null) row(t.admin, admin ? t.yes : t.no, admin ? "yes" : "no");

      this.dl = dl;
      this.storageBox = Object.assign(document.createElement("div"), { className: "storage" });

      const logout = Object.assign(document.createElement("a"), { className: "logout", href: "/cdn-cgi/access/logout", textContent: t.signOut });
      panel.append(who, dl, this.storageBox, logout);
      root.append(button, panel);
      this.renderStorage();

      const setOpen = (open) => {
        panel.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
      };
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(panel.hidden);
      });
      document.addEventListener("click", (e) => {
        if (!e.composedPath().includes(this)) setOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !panel.hidden) {
          setOpen(false);
          button.focus();
        }
      });
    }

    disconnectedCallback() {
      if (this.onRefresh) window.removeEventListener("tdz-account:refresh", this.onRefresh);
    }

    // "Data stored" line and the request form, from the account endpoint (shared apps only).
    renderStorage() {
      const t = this.t;
      const acc = this.account;
      this.storageRow?.remove();
      this.storageRow = null;
      this.storageBox?.replaceChildren();
      if (!this.storageBox || !acc?.storage || acc.access === "public") return;

      const mode = acc.storage === "cloud" ? "cloud" : acc.storage === "readonly" ? "readonly" : "local";
      const d = document.createElement("div");
      d.append(
        Object.assign(document.createElement("dt"), { textContent: t.storage }),
        Object.assign(document.createElement("dd"), { textContent: t[mode], className: mode === "cloud" ? "yes" : "no" }),
      );
      this.dl.append(d);
      this.storageRow = d;
      if (mode === "cloud" || acc.access !== "shared") return;

      const note = (text, className = "") => this.storageBox.appendChild(Object.assign(document.createElement("p"), { textContent: text, className }));
      const status = acc.request?.status;
      if (status === "pending") return void note(t.pending);
      if (status === "rejected") note(t.rejected);

      const ask = Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: t.request });
      ask.addEventListener("click", () => this.renderRequestForm());
      this.storageBox.append(ask);
    }

    renderRequestForm() {
      const t = this.t;
      const box = Object.assign(document.createElement("textarea"), { maxLength: 500, placeholder: t.message });
      box.setAttribute("aria-label", t.message);
      const cancel = Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: t.cancel });
      const send = Object.assign(document.createElement("button"), { type: "button", className: "btn primary", textContent: t.send });
      const actions = Object.assign(document.createElement("div"), { className: "actions" });
      actions.append(cancel, send);
      const error = Object.assign(document.createElement("p"), { className: "err", hidden: true });
      this.storageBox.replaceChildren(box, actions, error);
      box.focus();

      cancel.addEventListener("click", () => this.renderStorage());
      send.addEventListener("click", async () => {
        send.disabled = cancel.disabled = true;
        const message = box.value.trim();
        const res = await postJson(`${this.getAttribute("account-url")}/request`, message ? { message } : {});
        if (res.status === 200 || res.status === 201) {
          const request = { status: "pending", message: message || null, requestedAt: new Date().toISOString(), decidedAt: null };
          this.account = { ...this.account, request };
          this.renderStorage();
          window.dispatchEvent(new CustomEvent("tdz-account:change", { detail: this.account }));
          return;
        }
        send.disabled = cancel.disabled = false;
        error.hidden = false;
        error.textContent = res.body?.error?.code === "request_cooldown" ? t.cooldown : t.failed;
      });
    }
  }

  customElements.define("tdz-account", TdzAccount);
})();
