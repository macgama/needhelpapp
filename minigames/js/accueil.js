/* Le hall lit les records posés par les machines et les affiche sur les cartes. */

(() => {
  'use strict';

  for (const node of document.querySelectorAll('[data-record]')) {
    const value = Arcade.record(node.dataset.record);
    if (!value) {
      node.textContent = 'jamais joué';
      node.classList.add('vierge');
      continue;
    }
    const unit = node.dataset.unit;
    node.textContent = unit ? `${value} ${unit}${value > 1 ? 's' : ''}` : value;
  }

  Arcade.bindMute(document.getElementById('mute'));
})();
