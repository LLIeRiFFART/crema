(function () {
    "use strict";

    const currentYear = new Date().getFullYear();
    document.querySelectorAll("[data-copyright-year]").forEach(function (element) {
        const startYear = Number(element.dataset.startYear);
        element.textContent = currentYear > startYear ? startYear + "-" + currentYear : String(startYear);
    });
})();
