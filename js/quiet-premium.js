/* Quiet premium: decorative motion only. Webflow still owns navigation,
   sliders, and the callback popup; mail.php and form submission are untouched. */
(function () {
    "use strict";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set();
    const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
    const revealSelector = ".section_3 > .container > .h2, .section_4 > .container > .h2, " +
        ".section_6 > .container > .h2, .section_7 .h2, " +
        ".slider, .slider-2, .title-btn_5, .text-form_7, .logo-text_2";

    // Replace the exported decorative IX2 events, not just their CSS output.
    // Retain the original click actions and targets for the callback popup.
    const ix2 = window.Webflow && window.Webflow.require("ix2");
    if (ix2) {
        const original = ix2.store.getState().ixData;
        const events = {};
        const actionLists = {};
        Object.entries(original.events || {}).forEach(function ([id, event]) {
            if (event.eventTypeId !== "MOUSE_CLICK" && event.eventTypeId !== "MOUSE_SECOND_CLICK") return;
            events[id] = event;
            const listId = event.action.config.actionListId;
            // Clone: reduced-motion adjustments must not mutate the export.
            actionLists[listId] = JSON.parse(JSON.stringify(original.actionLists[listId]));
        });
        const normalLists = JSON.parse(JSON.stringify(actionLists));
        function configurePopupMotion() {
            const lists = JSON.parse(JSON.stringify(normalLists));
            Object.values(lists).forEach(function (list) {
                list.actionItemGroups.forEach(function (group) {
                    group.actionItems.forEach(function (item) {
                        if (item.actionTypeId === "TRANSFORM_MOVE") {
                            item.config.yValue = reducedMotion.matches ? 0 : Math.min(item.config.yValue || 0, 20);
                            item.config.duration = reducedMotion.matches ? 0 : 380;
                            item.config.easing = "outQuart";
                        } else if (item.actionTypeId === "STYLE_OPACITY") {
                            item.config.duration = reducedMotion.matches ? 0 : 240;
                            item.config.easing = "easeOut";
                        }
                    });
                });
            });
            ix2.init({events: events, actionLists: lists, site: {mediaQueries: original.mediaQueries}});
        }
        configurePopupMotion();
        reducedMotion.addEventListener("change", configurePopupMotion);
    }

    function clearInitialState(element) {
        ["opacity", "transform", "-webkit-transform", "-moz-transform", "-ms-transform", "visibility", "will-change"]
            .forEach(function (property) { element.style.removeProperty(property); });
    }

    // Stop IX3's character-by-character headline animation and revert SplitText.
    // Its async registration can finish before or after this script executes.
    function stopLegacyHeadline() {
        const ix3 = window.Webflow && window.Webflow.require("ix3");
        if (ix3) ix3.destroy();
        document.querySelectorAll(".h1").forEach(clearInitialState);
    }
    if (document.documentElement.classList.contains("w-mod-ix3")) {
        stopLegacyHeadline();
    } else {
        window.addEventListener("__wf_ix3_ready", stopLegacyHeadline, {once: true});
    }

    document.querySelectorAll(revealSelector + ", .navbar-2, .main_image, .btn-text, .h1, .image_3_wrapped, .icon_5, .line_item")
        .forEach(clearInitialState);

    function animate(element, keyframes, options) {
        if (!element || reducedMotion.matches || !element.animate) return;
        const animation = element.animate(keyframes, Object.assign({duration: 680, easing: ease}, options));
        animations.add(animation);
        // No forwards fill: the final state comes from ordinary CSS, not an
        // animation retained forever in the compositor.
        animation.onfinish = animation.oncancel = function () { animations.delete(animation); };
    }

    function enter(element, delay, distance) {
        element.classList.remove("motion-pending");
        element.dataset.motionRevealed = "true";
        animate(element, [
            {opacity: 0, transform: "translateY(" + (distance || 20) + "px)"},
            {opacity: 1, transform: "translateY(0)"}
        ], {delay: delay || 0, fill: "backwards"});
    }

    enter(document.querySelector(".h1"), 40, 20);
    enter(document.querySelector(".btn-text"), 130, 16);
    animate(document.querySelector(".main_image"), [
        {transform: "scale(1.035)"}, {transform: "scale(1)"}
    ], {duration: 1300});

    let observer;
    const revealElements = Array.from(document.querySelectorAll(revealSelector));
    if (!reducedMotion.matches && "IntersectionObserver" in window) {
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                const element = entry.target;
                observer.unobserve(element);
                let delay = 0;
                if (element.classList.contains("logo-text_2")) {
                    // Cascade only peers in the same row (no artificial delay
                    // between the two rows of categories on a phone).
                    const top = element.offsetTop;
                    const peers = Array.from(element.parentElement.children)
                        .filter(function (peer) { return Math.abs(peer.offsetTop - top) < 4; });
                    delay = Math.max(0, peers.indexOf(element)) * 70;
                } else if (element.matches(".slider, .slider-2, .text-form_7")) {
                    delay = 70;
                }
                enter(element, delay, element.matches(".h2") ? 18 : 22);
            });
        }, {threshold: 0, rootMargin: "0px 0px -32px 0px"});
        revealElements.forEach(function (element) {
            element.classList.add("motion-pending");
            observer.observe(element);
        });
    }

    function revealFocusedContent(event) {
        // Keyboard users should never focus a still-transparent button/slider.
        const element = event.target.closest(".motion-pending");
        if (!element) return;
        if (observer) observer.unobserve(element);
        element.classList.remove("motion-pending");
        element.dataset.motionRevealed = "true";
    }
    document.addEventListener("focusin", revealFocusedContent);

    reducedMotion.addEventListener("change", function () {
        if (!reducedMotion.matches) return;
        if (observer) observer.disconnect();
        animations.forEach(function (animation) { animation.cancel(); });
        revealElements.forEach(function (element) { element.classList.remove("motion-pending"); });
    });

    // Native slider transitions also respect reduced motion, without replacing
    // swipe, keyboard, dots, or Webflow's responsive slide grouping.
    document.querySelectorAll(".w-slider").forEach(function (slider) {
        function configureSlider() {
            const state = window.jQuery && window.jQuery.data(slider, ".w-slider");
            const nextDuration = reducedMotion.matches ? 0 : 550;
            slider.setAttribute("data-duration", String(nextDuration));
            slider.setAttribute("data-easing", "ease-out-quart");
            if (state && state.config) {
                state.config.duration = nextDuration;
                state.config.easing = "ease-out-quart";
            }
        }
        configureSlider();
        reducedMotion.addEventListener("change", configureSlider);
    });
})();
