import type { DramaItem, GuideStep, LandingPageConfig } from "@lp-admin/shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDramas(dramas: DramaItem[]): string {
  return dramas
    .map(
      (drama) => `
          <article class="drama" onclick="showPlayModal(${JSON.stringify(drama.name)})">
            <div class="cover" style="--from: ${escapeHtml(drama.gradientFrom)}; --to: ${escapeHtml(drama.gradientTo)}; --image: url('${escapeHtml(drama.coverUrl)}')">
              <span class="reward">${escapeHtml(drama.tag)}</span>
            </div>
            <b>${escapeHtml(drama.name)}</b>
          </article>`,
    )
    .join("\n");
}

function renderInstallSteps(steps: GuideStep[]): string {
  return steps
    .map(
      (step) => `
          <div class="guide-step">
            <div class="guide-icon">${escapeHtml(step.icon)}</div>
            <div class="guide-content">
              <b>${escapeHtml(step.title)}</b>
              <p>${step.description}</p>
              ${step.tip ? `<div class="guide-tip">${step.tip}</div>` : ""}
            </div>
          </div>`,
    )
    .join("\n");
}

export function renderLandingPage(config: LandingPageConfig, visitorId?: string): string {
  const downloadUrl = escapeHtml(config.downloadUrl);
  const pixelId = escapeHtml(config.pixelId);
  const leadStorageKey = escapeHtml(config.leadStorageKey);
  const dramas = renderDramas(config.dramas);
  const installSteps = renderInstallSteps(config.installSteps);

  return `<!doctype html>
<html lang="${escapeHtml(config.locale)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(config.metaDescription)}" />
    <title>${escapeHtml(config.pageTitle)}</title>
    <style>${LANDING_STYLES.replace("__BANNER_URL__", escapeHtml(config.bannerUrl))}</style>
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');

      const DOWNLOAD_URL = ${JSON.stringify(config.downloadUrl)};
      const LEAD_STORAGE_KEY = ${JSON.stringify(config.leadStorageKey)};
      const VISITOR_ID = ${JSON.stringify(visitorId ?? "")};

      function trackEvent(type, extra) {
        try {
          navigator.sendBeacon('/api/event', JSON.stringify(Object.assign({
            type: type,
            visitor_id: VISITOR_ID,
            button_position: extra && extra.button_position
          }, extra || {})));
        } catch (e) {}
      }

      trackEvent('page_view');

      function trackDownload(event, buttonPosition) {
        event.preventDefault();
        const downloadUrl = event.currentTarget.href;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const lastTrackedAt = Number(localStorage.getItem(LEAD_STORAGE_KEY) || 0);
        const shouldTrackLead = !lastTrackedAt || now - lastTrackedAt > sevenDaysMs;

        trackEvent('download_click', { button_position: buttonPosition });

        if (shouldTrackLead && window.fbq) {
          fbq('track', 'Lead', {
            content_name: ${JSON.stringify(config.brandName + " Download")},
            button_position: buttonPosition
          });
          localStorage.setItem(LEAD_STORAGE_KEY, String(now));
        }

        setTimeout(function() {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = downloadUrl;
          document.body.appendChild(iframe);
          setTimeout(function() { iframe.remove(); }, 5000);
        }, shouldTrackLead ? 300 : 0);

        return false;
      }

      function showPlayModal(dramaName) {
        document.getElementById('modalDramaTitle').innerText = ${JSON.stringify(config.modalTitlePrefix)} + dramaName;
        document.getElementById('playModal').classList.add('active');
        if (window.fbq) {
          fbq('track', 'CustomEvent', {
            event_name: 'View Drama PopUp',
            drama_name: dramaName
          });
        }
      }

      function closePlayModal() {
        document.getElementById('playModal').classList.remove('active');
      }

      function triggerModalDownload() {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const lastTrackedAt = Number(localStorage.getItem(LEAD_STORAGE_KEY) || 0);
        const shouldTrackLead = !lastTrackedAt || now - lastTrackedAt > sevenDaysMs;

        trackEvent('download_click', { button_position: 'drama_modal' });

        if (shouldTrackLead && window.fbq) {
          fbq('track', 'Lead', {
            content_name: ${JSON.stringify(config.brandName + " Download")},
            button_position: 'drama_modal'
          });
          localStorage.setItem(LEAD_STORAGE_KEY, String(now));
        }

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = DOWNLOAD_URL;
        document.body.appendChild(iframe);
        setTimeout(function() { iframe.remove(); }, 5000);
        setTimeout(closePlayModal, 1500);
      }
    </script>
    <noscript>
      <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
    </noscript>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="topbar" aria-label="${escapeHtml(config.brandName)} header">
          <div class="brand">
            <div class="mark"><img src="${escapeHtml(config.logoUrl)}" alt="${escapeHtml(config.brandName)} logo" /></div>
            <div class="brand-text">
              <p class="brand-name">${escapeHtml(config.brandName)}</p>
              <p class="brand-subtitle">${escapeHtml(config.brandSubtitle)}</p>
            </div>
          </div>
          <div class="bonus">${escapeHtml(config.rewardText)}</div>
        </div>
        <div class="showcase">
          <div class="poster-stage">
            <div class="drama-copy">
              <span class="tag">${escapeHtml(config.heroTag)}</span>
              <h1>${escapeHtml(config.heroTitle)}</h1>
              <p>${escapeHtml(config.heroDescription)}</p>
              <a class="hero-cta" href="${downloadUrl}" onclick="return trackDownload(event, 'hero')">${escapeHtml(config.heroCtaText)}</a>
              <div class="security-badge">
                <span class="badge-icon">🛡️</span> ${escapeHtml(config.securityBadgeText)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <h2>${escapeHtml(config.dramasSectionTitle)}</h2>
          <span>${escapeHtml(config.dramasSectionSubtitle)}</span>
        </div>
        <div class="dramas">${dramas}
        </div>
      </section>
      <section class="section install-guide">
        <div class="section-head">
          <h2>${escapeHtml(config.installGuideTitle)}</h2>
          <span style="color: var(--mint);">${escapeHtml(config.installGuideSubtitle)}</span>
        </div>
        <div class="guide-steps">${installSteps}
        </div>
      </section>
      <section class="final">
        <h2>${escapeHtml(config.finalTitle)}</h2>
        <p>${escapeHtml(config.finalDescription)}</p>
        <a class="cta" href="${downloadUrl}" onclick="return trackDownload(event, 'footer')">${escapeHtml(config.finalCtaText)}</a>
      </section>
      <footer><p>${escapeHtml(config.footerText)}</p></footer>
    </main>
    <div id="playModal" class="modal-overlay" onclick="if(event.target === this) closePlayModal()">
      <div class="modal-box">
        <div class="modal-icon">▶️</div>
        <h3 id="modalDramaTitle" class="modal-title">${escapeHtml(config.modalTitlePrefix)}</h3>
        <p class="modal-desc">${config.modalDescription}</p>
        <button class="modal-cta" onclick="triggerModalDownload()">${escapeHtml(config.modalCtaText)}</button>
        <div class="modal-close-btn" onclick="closePlayModal()">${escapeHtml(config.modalCancelText)}</div>
      </div>
    </div>
  </body>
</html>`;
}

const LANDING_STYLES = `
      :root {
        --ink: #fff7f8; --muted: #b9aeb6; --paper: #100c11; --surface: #1b141b;
        --rose: #ff2f65; --coral: #ff637d; --gold: #ffd33d; --mint: #19c8a2;
        --line: rgba(255, 255, 255, 0.1); --shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0; min-height: 100vh;
        background: radial-gradient(circle at 18% 0%, rgba(255, 47, 101, 0.22), transparent 28%),
          radial-gradient(circle at 82% 18%, rgba(255, 211, 61, 0.12), transparent 24%),
          linear-gradient(160deg, #08060a 0%, #151017 52%, #08060a 100%);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      a { color: inherit; }
      .page { width: min(100%, 460px); margin: 0 auto; min-height: 100vh; background: #0f0b10; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06); overflow: hidden; }
      .hero {
        position: relative; min-height: 520px; padding: 18px;
        background: linear-gradient(180deg, rgba(8, 6, 10, 0.4) 0%, rgba(8, 6, 10, 0.26) 42%, #0f0b10 100%), url("__BANNER_URL__") center top / cover;
      }
      .topbar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; margin-bottom: 96px; border: 1px solid rgba(255, 255, 255, 0.12); padding: 10px 12px; background: rgba(16, 12, 17, 0.72); backdrop-filter: blur(12px); }
      .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 10px; overflow: hidden; }
      .mark img { width: 100%; height: 100%; object-fit: contain; }
      .brand-name { margin: 0; font-size: 18px; font-weight: 900; color: white; }
      .brand-subtitle { margin: 2px 0 0; color: rgba(255, 255, 255, 0.68); font-size: 12px; font-weight: 700; }
      .bonus { flex: 0 0 auto; border: 1px solid rgba(255, 211, 61, 0.34); border-radius: 999px; padding: 8px 11px; background: rgba(255, 211, 61, 0.14); color: var(--gold); font-size: 12px; font-weight: 900; }
      .hero-cta { display: flex; width: min(100%, 360px); min-height: 58px; align-items: center; justify-content: center; margin: 24px auto 0; border-radius: 18px; background: linear-gradient(135deg, #e81752, #ff6a88); color: white; font-size: 17px; font-weight: 950; text-decoration: none; box-shadow: 0 18px 34px rgba(232, 23, 82, 0.38); }
      .showcase { position: relative; z-index: 2; }
      .poster-stage { position: relative; display: flex; min-height: 300px; align-items: end; }
      .poster-stage::before { position: absolute; inset: 0; content: ""; background: linear-gradient(180deg, rgba(8, 6, 10, 0) 0%, rgba(8, 6, 10, 0.72) 72%, #0f0b10 100%); }
      .drama-copy { position: relative; z-index: 1; width: 100%; color: white; text-align: center; }
      .tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 7px 10px; color: var(--gold); font-size: 11px; font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase; }
      .drama-copy h1 { margin: 14px auto 10px; max-width: 360px; font-size: 36px; line-height: 1.05; text-shadow: 0 3px 20px rgba(0, 0, 0, 0.55); }
      .drama-copy p { margin: 0 auto; max-width: 340px; color: rgba(255, 255, 255, 0.88); font-size: 13px; font-weight: 700; line-height: 1.45; }
      .section { padding: 22px 18px; border-top: 1px solid var(--line); background: #0f0b10; }
      .section-head { display: flex; align-items: end; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
      .section h2 { margin: 0; font-size: 21px; }
      .section-head span { color: var(--gold); font-size: 12px; font-weight: 950; }
      .dramas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .drama { min-width: 0; cursor: pointer; }
      .cover { position: relative; aspect-ratio: 3 / 4; border-radius: 17px; background: linear-gradient(180deg, transparent 32%, rgba(0, 0, 0, 0.68)), var(--image) center / cover, linear-gradient(150deg, var(--from), var(--to)); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34); overflow: hidden; }
      .reward { position: absolute; right: 7px; top: 7px; z-index: 1; border-radius: 999px; padding: 5px 7px; background: rgba(255, 255, 255, 0.9); color: #130c11; font-size: 10px; font-weight: 950; }
      .drama b { display: block; margin-top: 8px; font-size: 12px; line-height: 1.2; }
      .install-guide { border-top: 1px solid var(--line); background: #110d14; }
      .guide-steps { display: grid; gap: 14px; }
      .guide-step { display: flex; gap: 16px; align-items: flex-start; border: 1px solid rgba(25, 200, 162, 0.15); border-radius: 18px; padding: 16px; background: rgba(25, 200, 162, 0.03); }
      .guide-icon { font-size: 24px; flex: 0 0 auto; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
      .guide-content b { display: block; font-size: 15px; color: white; margin-bottom: 4px; }
      .guide-content p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
      .guide-tip { margin-top: 8px; padding: 8px 12px; background: rgba(255, 211, 61, 0.1); border-left: 3px solid var(--gold); border-radius: 0 8px 8px 0; font-size: 11px; color: var(--ink); }
      .security-badge { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; color: var(--mint); font-size: 12px; font-weight: 700; }
      .final { padding: 24px 18px 30px; background: linear-gradient(135deg, #171017, #2a1524 58%, #561b33); color: white; text-align: center; }
      .final h2 { margin: 0 0 10px; font-size: 28px; line-height: 1.05; }
      .final p { margin: 0 auto 18px; max-width: 330px; color: rgba(255, 255, 255, 0.78); font-size: 14px; font-weight: 700; line-height: 1.5; }
      .cta { display: flex; min-height: 56px; align-items: center; justify-content: center; border: 0; border-radius: 16px; background: linear-gradient(135deg, #e81752, #ff6a88); color: white; font-size: 16px; font-weight: 950; text-decoration: none; box-shadow: 0 14px 28px rgba(251, 55, 99, 0.3); }
      .final .cta { background: white; color: var(--rose); box-shadow: none; }
      footer { padding: 16px 18px 24px; background: #08060a; color: rgba(255, 255, 255, 0.68); font-size: 11px; line-height: 1.55; text-align: center; }
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
      .hero-cta, .cta { animation: pulse 2s infinite ease-in-out; }
      .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(8, 6, 10, 0.85); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; padding: 24px; }
      .modal-overlay.active { display: flex; }
      .modal-box { position: relative; width: 100%; max-width: 380px; background: #1b141b; border: 1px solid rgba(255, 47, 101, 0.3); border-radius: 24px; padding: 28px 20px; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); }
      .modal-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #e81752, #ff6a88); border-radius: 50%; display: grid; place-items: center; font-size: 28px; color: white; }
      .modal-title { font-size: 20px; font-weight: 900; color: white; margin: 0 0 10px; }
      .modal-desc { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0 0 24px; }
      .modal-cta { display: flex; width: 100%; min-height: 52px; align-items: center; justify-content: center; border-radius: 14px; background: linear-gradient(135deg, #e81752, #ff6a88); color: white; font-size: 16px; font-weight: 950; border: 0; cursor: pointer; }
      .modal-close-btn { display: inline-block; margin-top: 14px; font-size: 13px; color: var(--muted); font-weight: 700; cursor: pointer; }
      @media (min-width: 760px) { body { padding: 24px; } .page { border-radius: 32px; } }
      @media (max-width: 360px) { .drama-copy h1 { font-size: 28px; } }
`;

export { DEFAULT_EN_LANDING, DEFAULT_MX_LANDING } from "./defaults.js";
