/* ORG HUB — bootstrap modułów frontu ładowanych przez service worker */
(function bootstrapOrgHubFrontModules_() {
  "use strict";

  if (window.__orgHubFrontModulesBootstrapV1) return;
  window.__orgHubFrontModulesBootstrapV1 = true;

  const modules = [
    {
      key: "medical-core",
      src: "https://cdn.jsdelivr.net/gh/Orghub-systems/multiclub@2fd8e11ec3c86684f88592307f53f9fd21c2cce7/medical-no-polling.js"
    },
    {
      key: "recurring-events-front",
      src: "/recurring-events-front.js?v=20260724-3"
    }
  ];

  modules.forEach(function(moduleInfo) {
    if (
      document.querySelector(
        'script[data-org-hub-front-module="' + moduleInfo.key + '"]'
      )
    ) {
      return;
    }

    const script = document.createElement("script");
    script.src = moduleInfo.src;
    script.async = false;
    script.dataset.orgHubFrontModule = moduleInfo.key;
    script.onerror = function() {
      console.error(
        "Nie udało się załadować modułu frontu:",
        moduleInfo.key
      );
    };

    document.head.appendChild(script);
  });
})();
