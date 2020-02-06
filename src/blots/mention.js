import Quill from "quill";

const Embed = Quill.import("blots/embed");

class MentionBlot extends Embed {
  static create(data) {
    const node = super.create();
    const denotationChar = document.createElement("span");
    denotationChar.className = "ql-mention-denotation-char";
    denotationChar.innerHTML = data.denotationChar;
    node.appendChild(denotationChar);
    node.innerHTML += data.value;
    return MentionBlot.setDataValues(node, data);
  }

  static setDataValues(element, data) {
    const domNode = element;
    Object.keys(data).forEach(key => {
      domNode.dataset[key] = data[key];
    });
    return domNode;
  }

  static value(domNode) {
    return domNode.dataset;
  }
  /**
   * Redefine the `update` method to handle the `childList` case.
   * This is necessary to correctly handle "backspace" on Android using Gboard.
   * It behaves differently than other cases and we need to handle the node
   * removal instead of the `characterData`.
   *
   * TODO: create a ticket reporting this problem!
   */
  update(mutations, context) {
    // `childList` mutations are not handled on Quill
    // see `update` implementation on:
    // https://github.com/quilljs/quill/blob/master/blots/embed.js

    for (const mutation of mutations) {
      if (mutation.type != 'childList') continue;
      if (mutation.removedNodes.length == 0) continue;

      const nodeType = mutation.removedNodes[0].nodeType;
      setTimeout(() => this._remove(nodeType), 0);
      return;
    }

    const unhandledMutations = mutations.filter(m => m.type != 'childList')
    super.update(unhandledMutations, context);
  }

  /**
   * Custom self removal, this is a wrapper around the default `remove`
   * to correct the cursor position right after removing the mention.
   *
   * @param {number} nodeType: the type of node that was removed.
   * This is important since depending the type of node we are removing,
   * the resulting position of the cursor will change.
   * E.g.:
   * - on desktop a mention removal triggers a mutation with an ELEMENT_NODE
   * - on android a TEXT_NODE node removal is triggered
   *
   * NOTE: call this function as:
   *   setTimeout(() => this._remove(nodeType), 0);
   * otherwise you'll get the error: "The given range isn't in document."
   */
  _remove(nodeType) {
    let adjust = 0;
    if (nodeType === Node.TEXT_NODE) adjust = -1;
    const cursorPosition = quill.getSelection().index + adjust;

    // see `remove` implementation on:
    // https://github.com/quilljs/parchment/blob/master/src/blot/abstract/shadow.ts
    this.remove();

    // schedule cursor positioning after quill is done with whatever has scheduled
    setTimeout(() => quill.setSelection(cursorPosition, Quill.sources.API), 0);
  }
}

MentionBlot.blotName = "mention";
MentionBlot.tagName = "span";
MentionBlot.className = "mention";

Quill.register(MentionBlot);
