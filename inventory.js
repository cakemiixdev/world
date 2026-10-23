const ITEMS = ['flashlight', 'spyglass'];

export class Inventory {
  constructor(container, onUse) {
    this.container = container;
    this.onUse = onUse;
    this.selected = 'flashlight';

    for (const button of container.querySelectorAll('[data-item]')) {
      const item = button.dataset.item;
      if (!ITEMS.includes(item)) throw new Error(`Unknown inventory item: ${item}`);
      button.addEventListener('click', () => {
        this.select(item);
        this.use(item);
      });
    }
    this.select(this.selected);
  }

  select(item) {
    if (!ITEMS.includes(item)) throw new RangeError(`Unknown inventory item: ${item}`);
    this.selected = item;
    for (const button of this.container.querySelectorAll('[data-item]')) {
      const selected = button.dataset.item === item;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  use(item = this.selected, active = undefined) {
    if (!ITEMS.includes(item)) throw new RangeError(`Unknown inventory item: ${item}`);
    this.select(item);
    this.onUse(item, active);
  }
}
