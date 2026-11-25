(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const mobile = window.matchMedia('(max-width: 800px)');

  if (menuButton && navigation) {
    const setMenu = (expanded, returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', String(expanded));
      navigation.hidden = mobile.matches && !expanded;
      if (returnFocus) menuButton.focus();
    };
    menuButton.hidden = false;
    setMenu(false);
    menuButton.addEventListener('click', () => {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobile.matches && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false, true);
      }
    });
    mobile.addEventListener('change', () => setMenu(false));
  }

  // Native details/summary keeps the FAQ keyboard accessible without JavaScript.
  const questions = [...document.querySelectorAll('.faq')];
  questions.forEach((question) => {
    question.addEventListener('toggle', () => {
      if (question.open) questions.forEach((other) => {
        if (other !== question) other.open = false;
      });
    });
  });

  // Content always starts visible. Animate only elements entering the viewport.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Keep service details readable without JavaScript, then enhance them to
  // native dialogs with focus trapping, Escape handling and focus restoration.
  if ('HTMLDialogElement' in window && typeof HTMLDialogElement.prototype.showModal === 'function') {
    document.querySelectorAll('[data-service-details]').forEach((trigger) => {
      const fallback = document.getElementById(trigger.dataset.serviceDetails);
      const content = fallback?.querySelector('.service-detail-content');
      if (!content) return;

      const dialog = document.createElement('dialog');
      dialog.id = `${fallback.id}-dialog`;
      dialog.className = 'service-dialog';
      dialog.setAttribute('aria-labelledby', content.querySelector('h2').id);
      const inner = document.createElement('div');
      inner.className = 'service-dialog-inner';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'dialog-close';
      closeButton.setAttribute('aria-label', 'Закрыть описание услуги');
      closeButton.textContent = '×';
      closeButton.autofocus = true;
      inner.append(closeButton, content);
      dialog.append(inner);
      document.body.append(dialog);
      fallback.hidden = true;
      trigger.setAttribute('aria-controls', dialog.id);
      trigger.hidden = false;

      let closing = false;
      const closeDialog = () => {
        if (!dialog.open || closing) return;
        closing = true;
        dialog.classList.add('is-closing');
        const finish = () => {
          dialog.close();
          dialog.classList.remove('is-closing');
          document.body.classList.remove('has-service-dialog');
          closing = false;
          trigger.focus({ preventScroll: true });
        };
        if (reducedMotion.matches || !dialog.getAnimations) {
          finish();
        } else {
          Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished)).then(finish);
        }
      };
      trigger.addEventListener('click', () => {
        if (dialog.open) return;
        dialog.showModal();
        document.body.classList.add('has-service-dialog');
      });
      closeButton.addEventListener('click', closeDialog);
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
          .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
        if (!controls.length) return;
        event.preventDefault();
        const index = controls.indexOf(document.activeElement);
        const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
          : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        controls[next].focus();
      });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeDialog();
      });
      dialog.addEventListener('click', (event) => {
        // The native backdrop reports the dialog as its target. Keep clicks
        // on the panel, including its scrollbar, from dismissing the dialog.
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog &&
            (event.clientX < bounds.left || event.clientX > bounds.right ||
             event.clientY < bounds.top || event.clientY > bounds.bottom)) closeDialog();
      });
      dialog.addEventListener('close', () => document.body.classList.remove('has-service-dialog'));
      reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) dialog.getAnimations?.().forEach((animation) => animation.finish());
      });
    });
  }

  if ('IntersectionObserver' in window && !reducedMotion.matches && Element.prototype.animate) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches) {
          const animation = entry.target.animate(
            [{ opacity: 0.45, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' }
          );
          const stopOnPreferenceChange = () => { if (reducedMotion.matches) animation.finish(); };
          reducedMotion.addEventListener('change', stopOnPreferenceChange);
          animation.finished.finally(() => reducedMotion.removeEventListener('change', stopOnPreferenceChange));
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  }
})();
